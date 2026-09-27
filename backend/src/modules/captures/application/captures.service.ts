import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CaptureStatus,
  CaptureSyncStatus,
  CaptureValidationAction,
  Prisma,
  RegistrationReviewStatus,
  TournamentStatus,
  UserRole,
} from '@prisma/client';
import { createHash } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { AuditService } from '../../../common/audit/audit.service';
import { CurrentUserData } from '../../../common/auth/current-user.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateCaptureDto } from '../dto/create-capture.dto';
import { ListCapturesQueryDto } from '../dto/list-captures-query.dto';
import { RankingIntegrationPort } from './ranking-integration.port';
import { ResolveCaptureDto } from '../dto/resolve-capture.dto';
import { SyncCaptureItemDto, SyncCapturesDto } from '../dto/sync-captures.dto';
import { UpdateCaptureDto } from '../dto/update-capture.dto';

const captureUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const participantOptionInclude = {
  teamLinks: {
    where: { deletedAt: null },
    include: { team: true },
  },
} satisfies Prisma.ParticipantInclude;

const captureDetailInclude = {
  tournament: {
    include: { schedules: true },
  },
  participant: {
    include: participantOptionInclude,
  },
  team: true,
  official: {
    include: {
      user: { select: captureUserSelect },
    },
  },
  media: true,
  validations: {
    include: {
      validatedBy: { select: captureUserSelect },
    },
    orderBy: { validatedAt: 'desc' },
  },
} satisfies Prisma.CaptureInclude;

type CaptureDetail = Prisma.CaptureGetPayload<{
  include: typeof captureDetailInclude;
}>;

type TournamentWithSchedule = Prisma.TournamentGetPayload<{
  include: { schedules: true };
}>;

type ParsedMedia = {
  buffer: Buffer;
  extension: string;
  mimeType: string;
  originalName: string;
  checksum: string;
};

@Injectable()
export class CapturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly rankingIntegration: RankingIntegrationPort,
  ) {}

  async getOfficialContext(user: CurrentUserData) {
    const official = await this.prisma.official.findFirst({
      where: {
        userId: user.sub,
        deletedAt: null,
      },
      include: {
        tournamentAssignments: {
          include: {
            tournament: {
              include: { schedules: true },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!official) {
      throw new NotFoundException('Fiscal no encontrado');
    }

    const tournamentIds = official.tournamentAssignments.map((assignment) => assignment.tournamentId);
    if (tournamentIds.length === 0) {
      return { data: { tournaments: [] } };
    }

    const registrations = await this.prisma.registration.findMany({
      where: {
        tournamentId: { in: tournamentIds },
        reviewStatus: RegistrationReviewStatus.APPROVED,
        participant: {
          enabledToCompete: true,
          deletedAt: null,
        },
      },
      include: {
        participant: {
          include: participantOptionInclude,
        },
      },
      orderBy: [
        { tournamentId: 'asc' },
        { applicantLastName: 'asc' },
        { applicantFirstName: 'asc' },
      ],
    });

    const participantsByTournament = new Map<string, ReturnType<typeof this.serializeParticipant>[]>();
    for (const registration of registrations) {
      if (!registration.participant) {
        continue;
      }

      const current = participantsByTournament.get(registration.tournamentId) ?? [];
      current.push(this.serializeParticipant(registration.participant));
      participantsByTournament.set(registration.tournamentId, current);
    }

    return {
      data: {
        tournaments: official.tournamentAssignments.map((assignment) => ({
          id: assignment.tournament.id,
          name: assignment.tournament.name,
          eventDate: assignment.tournament.eventDate,
          location: assignment.tournament.location,
          status: assignment.tournament.status,
          schedules: assignment.tournament.schedules,
          participants: participantsByTournament.get(assignment.tournamentId) ?? [],
        })),
      },
    };
  }

  async list(query: ListCapturesQueryDto, user: CurrentUserData) {
    const tournamentFilter = await this.buildTournamentAccessFilter(user, query.tournamentId);
    const captures = await this.prisma.capture.findMany({
      where: {
        ...tournamentFilter,
        status: query.status,
      },
      include: captureDetailInclude,
      orderBy: [{ capturedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return { data: captures.map((capture) => this.serializeCapture(capture)) };
  }

  async get(id: string, user: CurrentUserData) {
    const capture = await this.requireCapture(id);
    await this.assertCanAccessCapture(capture, user);
    return { data: this.serializeCapture(capture) };
  }

  async getMediaFile(mediaId: string, user: CurrentUserData) {
    const media = await this.prisma.captureMedia.findUnique({
      where: { id: mediaId },
      include: {
        capture: {
          include: captureDetailInclude,
        },
      },
    });

    if (!media?.capture) {
      throw new NotFoundException('Evidencia no encontrada');
    }

    await this.assertCanAccessCapture(media.capture, user);

    const absolutePath = this.resolveStoragePath(media.storageKey);

    try {
      await readFile(absolutePath);
    } catch {
      throw new NotFoundException('Archivo de evidencia no disponible');
    }

    return {
      absolutePath,
      mimeType: media.mimeType,
    };
  }

  async create(dto: CreateCaptureDto, user: CurrentUserData) {
    const official = await this.requireOfficialForUser(user.sub);
    const tournament = await this.requireTournament(dto.tournamentId);
    await this.assertOfficialAssigned(official.id, tournament.id);
    try {
      this.assertOnlineCaptureWindow(tournament);
    } catch (error) {
      await this.auditBlockedBySchedule(user, tournament.id, 'create');
      throw error;
    }

    const existing = await this.prisma.capture.findFirst({
      where: {
        tournamentId: tournament.id,
        officialId: official.id,
        clientCaptureId: dto.clientCaptureId,
      },
      include: captureDetailInclude,
    });

    if (existing) {
      await this.assertCanAccessCapture(existing, user);
      throw new ConflictException('Ya existe una captura para ese intento de carga');
    }

    const participant = await this.requireEligibleParticipant(
      tournament.id,
      dto.participantId,
      dto.teamId,
    );
    const parsedMedia = this.parseMediaInput(dto.media);
    const capturedAt = new Date();

    const capture = await this.prisma.capture.create({
      data: {
        tournamentId: tournament.id,
        participantId: participant.id,
        teamId: dto.teamId ?? null,
        officialId: official.id,
        species: dto.species.trim(),
        length: dto.length,
        capturedAt,
        gps: dto.gps as unknown as Prisma.InputJsonValue | undefined,
        observation: this.normalizeOptional(dto.observation),
        status: CaptureStatus.PENDING_VALIDATION,
        syncStatus: CaptureSyncStatus.ONLINE,
        clientCaptureId: dto.clientCaptureId,
      },
      include: captureDetailInclude,
    });

    try {
      const storedMedia = await this.storeMediaFile(capture.id, parsedMedia);
      await this.prisma.captureMedia.create({
        data: {
          captureId: capture.id,
          storageKey: storedMedia.storageKey,
          originalName: parsedMedia.originalName,
          mimeType: parsedMedia.mimeType,
          size: parsedMedia.buffer.length,
          checksum: parsedMedia.checksum,
        },
      });
    } catch (error) {
      await this.prisma.capture.delete({ where: { id: capture.id } }).catch(() => undefined);
      throw error;
    }

    const saved = await this.requireCapture(capture.id);
    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'capture.created',
      entityName: 'Capture',
      entityId: saved.id,
      context: {
        tournamentId: saved.tournamentId,
        participantId: saved.participantId,
        officialId: saved.officialId,
        origin: 'online',
      },
    });

    return { data: this.serializeCapture(saved) };
  }

  async update(id: string, dto: UpdateCaptureDto, user: CurrentUserData) {
    const official = await this.requireOfficialForUser(user.sub);
    const capture = await this.requireCapture(id);
    if (capture.officialId !== official.id) {
      throw new ForbiddenException('No podes editar una captura cargada por otro fiscal');
    }
    if (capture.status !== CaptureStatus.PENDING_VALIDATION) {
      throw new ConflictException('Solo podes editar capturas pendientes de validacion');
    }

    await this.assertOfficialAssigned(official.id, capture.tournamentId);
    try {
      this.assertPendingEditWindow(capture.tournament);
    } catch (error) {
      await this.auditBlockedBySchedule(user, capture.tournamentId, 'update');
      throw error;
    }

    const nextParticipantId = dto.participantId ?? capture.participantId;
    const nextTeamId =
      dto.teamId === undefined ? (capture.teamId ?? undefined) : dto.teamId || undefined;
    await this.requireEligibleParticipant(capture.tournamentId, nextParticipantId, nextTeamId);

    let storedMedia:
      | {
          storageKey: string;
          absolutePath: string;
        }
      | undefined;
    let parsedMedia: ParsedMedia | undefined;

    if (dto.media) {
      parsedMedia = this.parseMediaInput(dto.media);
      storedMedia = await this.storeMediaFile(capture.id, parsedMedia);
    }

    const previousMedia = capture.media;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.capture.update({
          where: { id: capture.id },
          data: {
            participantId: nextParticipantId,
            teamId: nextTeamId ?? null,
            species: dto.species?.trim(),
            length: dto.length,
            gps:
              dto.gps === undefined
                ? undefined
                : (dto.gps as unknown as Prisma.InputJsonValue),
            observation:
              dto.observation === undefined
                ? undefined
                : this.normalizeOptional(dto.observation),
          },
        });

        if (storedMedia && parsedMedia) {
          await tx.captureMedia.deleteMany({
            where: { captureId: capture.id },
          });
          await tx.captureMedia.create({
            data: {
              captureId: capture.id,
              storageKey: storedMedia.storageKey,
              originalName: parsedMedia.originalName,
              mimeType: parsedMedia.mimeType,
              size: parsedMedia.buffer.length,
              checksum: parsedMedia.checksum,
            },
          });
        }
      });
    } catch (error) {
      if (storedMedia) {
        await this.safeDeleteFile(storedMedia.absolutePath);
      }
      throw error;
    }

    if (storedMedia) {
      await Promise.all(
        previousMedia.map((media) => this.safeDeleteFile(this.resolveStoragePath(media.storageKey))),
      );
    }

    const updated = await this.requireCapture(capture.id);
    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'capture.updated',
      entityName: 'Capture',
      entityId: updated.id,
      context: {
        tournamentId: updated.tournamentId,
        participantId: updated.participantId,
      },
    });

    return { data: this.serializeCapture(updated) };
  }

  async sync(dto: SyncCapturesDto, user: CurrentUserData) {
    const official = await this.requireOfficialForUser(user.sub);
    const results: Array<Record<string, unknown>> = [];

    for (const item of dto.items) {
      const existing = await this.prisma.capture.findFirst({
        where: {
          tournamentId: item.tournamentId,
          officialId: official.id,
          clientCaptureId: item.clientCaptureId,
        },
        include: captureDetailInclude,
      });

      if (existing) {
        await this.assertCanAccessCapture(existing, user);
        results.push({
          client_capture_id: item.clientCaptureId,
          status: 'duplicate',
          capture_id: existing.id,
        });
        continue;
      }

      try {
        const tournament = await this.requireTournament(item.tournamentId);
        await this.assertOfficialAssigned(official.id, tournament.id);
        try {
          this.assertOfflineSyncWindow(tournament, new Date(item.capturedAt));
        } catch (error) {
          await this.auditBlockedBySchedule(user, tournament.id, 'sync', {
            clientCaptureId: item.clientCaptureId,
          });
          throw error;
        }

        const participant = await this.requireEligibleParticipant(
          tournament.id,
          item.participantId,
          item.teamId,
        );
        const parsedMedia = this.parseMediaInput(item.media);

        const capture = await this.prisma.capture.create({
          data: {
            tournamentId: tournament.id,
            participantId: participant.id,
            teamId: item.teamId ?? null,
            officialId: official.id,
            species: item.species.trim(),
            length: item.length,
            capturedAt: new Date(item.capturedAt),
            deviceRecordedAt: new Date(item.deviceRecordedAt),
            syncedAt: new Date(),
            gps: item.gps as unknown as Prisma.InputJsonValue | undefined,
            observation: this.normalizeOptional(item.observation),
            status: CaptureStatus.PENDING_VALIDATION,
            syncStatus: CaptureSyncStatus.SYNCED,
            clientCaptureId: item.clientCaptureId,
          },
          include: captureDetailInclude,
        });

        try {
          const storedMedia = await this.storeMediaFile(capture.id, parsedMedia);
          await this.prisma.captureMedia.create({
            data: {
              captureId: capture.id,
              storageKey: storedMedia.storageKey,
              originalName: parsedMedia.originalName,
              mimeType: parsedMedia.mimeType,
              size: parsedMedia.buffer.length,
              checksum: parsedMedia.checksum,
            },
          });
        } catch (error) {
          await this.prisma.capture.delete({ where: { id: capture.id } }).catch(() => undefined);
          throw error;
        }

        await this.auditService.log({
          actorUserId: user.sub,
          actorRole: user.roles[0],
          action: 'capture.synced',
          entityName: 'Capture',
          entityId: capture.id,
          context: {
            tournamentId: capture.tournamentId,
            participantId: capture.participantId,
            officialId: capture.officialId,
            clientCaptureId: item.clientCaptureId,
          },
        });

        results.push({
          client_capture_id: item.clientCaptureId,
          status: 'accepted',
          capture_id: capture.id,
        });
      } catch (error) {
        results.push({
          client_capture_id: item.clientCaptureId,
          status: 'rejected',
          error:
            error instanceof Error ? error.message : 'No pudimos sincronizar esta captura',
        });
      }
    }

    return { data: { items: results } };
  }

  approve(id: string, dto: ResolveCaptureDto, user: CurrentUserData) {
    return this.resolveValidation(id, CaptureValidationAction.APPROVE, dto, user);
  }

  observe(id: string, dto: ResolveCaptureDto, user: CurrentUserData) {
    return this.resolveValidation(id, CaptureValidationAction.OBSERVE, dto, user);
  }

  reject(id: string, dto: ResolveCaptureDto, user: CurrentUserData) {
    return this.resolveValidation(id, CaptureValidationAction.REJECT, dto, user);
  }

  private async resolveValidation(
    id: string,
    action: CaptureValidationAction,
    dto: ResolveCaptureDto,
    user: CurrentUserData,
  ) {
    const capture = await this.requireCapture(id);
    await this.assertCanAccessCapture(capture, user);

    if (capture.status !== CaptureStatus.PENDING_VALIDATION) {
      throw new ConflictException('La captura ya fue validada');
    }

    if (capture.tournament.status === TournamentStatus.CLOSED) {
      throw new ConflictException(
        'El torneo ya fue cerrado y no admite nuevas validaciones de capturas',
      );
    }

    try {
      this.assertValidationWindow(capture.tournament);
    } catch (error) {
      await this.auditBlockedBySchedule(user, capture.tournamentId, 'validation');
      throw error;
    }

    const reason = this.normalizeOptional(dto.reason);
    if (action !== CaptureValidationAction.APPROVE && !reason) {
      throw new BadRequestException('Debes indicar un motivo para esta accion');
    }

    const nextStatus =
      action === CaptureValidationAction.APPROVE
        ? CaptureStatus.APPROVED
        : action === CaptureValidationAction.OBSERVE
          ? CaptureStatus.OBSERVED
          : CaptureStatus.REJECTED;

    await this.prisma.$transaction(async (tx) => {
      await tx.captureValidation.create({
        data: {
          captureId: capture.id,
          action,
          reason,
          validatedByUserId: user.sub,
        },
      });

      await tx.capture.update({
        where: { id: capture.id },
        data: { status: nextStatus },
      });
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: `capture.${nextStatus.toLowerCase()}`,
      entityName: 'Capture',
      entityId: capture.id,
      context: {
        tournamentId: capture.tournamentId,
        reason,
      },
    });

    await this.rankingIntegration.markTournamentPendingRecalculation(
      capture.tournamentId,
      capture.id,
    );

    const updated = await this.requireCapture(capture.id);
    return { data: this.serializeCapture(updated) };
  }

  private async requireCapture(id: string) {
    const capture = await this.prisma.capture.findUnique({
      where: { id },
      include: captureDetailInclude,
    });

    if (!capture) {
      throw new NotFoundException('Captura no encontrada');
    }

    return capture;
  }

  private async requireOfficialForUser(userId: string) {
    const official = await this.prisma.official.findFirst({
      where: {
        userId,
        deletedAt: null,
      },
    });

    if (!official) {
      throw new ForbiddenException('Tu cuenta no tiene un fiscal operativo asociado');
    }

    return official;
  }

  private async requireTournament(tournamentId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        deletedAt: null,
      },
      include: { schedules: true },
    });

    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }

    return tournament;
  }

  private async requireEligibleParticipant(
    tournamentId: string,
    participantId: string,
    teamId?: string,
  ) {
    const registration = await this.prisma.registration.findFirst({
      where: {
        tournamentId,
        participantId,
        reviewStatus: RegistrationReviewStatus.APPROVED,
        participant: {
          enabledToCompete: true,
          deletedAt: null,
        },
      },
      include: {
        participant: {
          include: participantOptionInclude,
        },
      },
    });

    if (!registration?.participant) {
      throw new BadRequestException(
        'El participante debe tener una inscripcion aprobada y habilitada para competir',
      );
    }

    if (teamId) {
      const hasTeam = registration.participant.teamLinks.some((link) => link.teamId === teamId);
      if (!hasTeam) {
        throw new BadRequestException(
          'El equipo indicado no esta asociado al participante seleccionado',
        );
      }
    }

    return registration.participant;
  }

  private async assertOfficialAssigned(officialId: string, tournamentId: string) {
    const assignment = await this.prisma.officialTournamentAssignment.findFirst({
      where: {
        officialId,
        tournamentId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Ese fiscal no esta asignado al torneo indicado');
    }
  }

  private async buildTournamentAccessFilter(user: CurrentUserData, tournamentId?: string) {
    if (user.roles.includes(UserRole.ADMIN)) {
      return tournamentId ? { tournamentId } : {};
    }

    const official = await this.requireOfficialForUser(user.sub);
    const assignments = await this.prisma.officialTournamentAssignment.findMany({
      where: { officialId: official.id },
      select: { tournamentId: true },
    });
    const allowedTournamentIds = assignments.map((assignment) => assignment.tournamentId);

    if (tournamentId && !allowedTournamentIds.includes(tournamentId)) {
      throw new ForbiddenException('No tenes acceso a ese torneo');
    }

    return {
      tournamentId: tournamentId
        ? tournamentId
        : {
            in: allowedTournamentIds.length > 0 ? allowedTournamentIds : ['__none__'],
          },
    };
  }

  private async assertCanAccessCapture(capture: CaptureDetail, user: CurrentUserData) {
    if (user.roles.includes(UserRole.ADMIN)) {
      return;
    }

    const official = await this.requireOfficialForUser(user.sub);
    if (capture.officialId === official.id) {
      return;
    }

    await this.assertOfficialAssigned(official.id, capture.tournamentId);
  }

  private assertOnlineCaptureWindow(tournament: TournamentWithSchedule) {
    const schedule = tournament.schedules[0];
    if (tournament.status !== TournamentStatus.ACTIVE) {
      throw new BadRequestException('El torneo no esta operativo para cargar capturas');
    }

    if (
      !schedule?.fishingStartAt ||
      !schedule.fishingEndAt ||
      !schedule.validationDeadlineAt
    ) {
      throw new BadRequestException(
        'El torneo no tiene configuradas todas las ventanas horarias requeridas',
      );
    }

    const now = new Date();
    if (now < schedule.fishingStartAt) {
      throw new BadRequestException('La carga todavia no esta habilitada para este torneo');
    }

    if (now > schedule.fishingEndAt) {
      throw new BadRequestException('La carga de capturas ya cerro para este torneo');
    }
  }

  private assertOfflineSyncWindow(tournament: TournamentWithSchedule, capturedAt: Date) {
    const schedule = tournament.schedules[0];
    if (!schedule?.fishingStartAt || !schedule.fishingEndAt || !schedule.validationDeadlineAt) {
      throw new BadRequestException(
        'El torneo no tiene configuradas las ventanas horarias para sincronizar',
      );
    }

    if (capturedAt < schedule.fishingStartAt || capturedAt > schedule.fishingEndAt) {
      throw new BadRequestException('La captura fue tomada fuera de la ventana permitida');
    }

    if (new Date() > schedule.validationDeadlineAt) {
      throw new BadRequestException('La ventana de sincronizacion ya cerro para este torneo');
    }
  }

  private assertPendingEditWindow(tournament: TournamentWithSchedule) {
    const schedule = tournament.schedules[0];
    if (!schedule?.validationDeadlineAt) {
      throw new BadRequestException('El torneo no tiene configurado el cierre de validacion');
    }

    if (new Date() > schedule.validationDeadlineAt) {
      throw new BadRequestException('La captura ya no puede editarse fuera de la ventana');
    }
  }

  private assertValidationWindow(tournament: TournamentWithSchedule) {
    const schedule = tournament.schedules[0];
    const now = new Date();

    if (!schedule?.validationDeadlineAt) {
      throw new BadRequestException('El torneo no tiene configurado el cierre de validacion');
    }

    if (schedule?.validationDeadlineAt && now > schedule.validationDeadlineAt) {
      throw new BadRequestException('La ventana de validacion ya cerro para este torneo');
    }
  }

  private parseMediaInput(media: { originalName: string; mimeType: string; dataUrl: string }) {
    if (!media.dataUrl.startsWith('data:')) {
      throw new BadRequestException('La imagen debe enviarse como data URL');
    }

    const match = media.dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      throw new BadRequestException('No pudimos interpretar la imagen enviada');
    }

    const mimeType = media.mimeType?.trim() || match[1];
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType)) {
      throw new BadRequestException('La evidencia debe ser una imagen valida');
    }

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException('La imagen enviada esta vacia');
    }

    if (buffer.length > 8 * 1024 * 1024) {
      throw new BadRequestException('La imagen supera el limite permitido');
    }

    this.assertImageSignature(buffer, mimeType);

    const extension = this.extensionFromMimeType(mimeType);
    return {
      buffer,
      extension,
      mimeType,
      originalName: media.originalName?.trim() || `captura.${extension}`,
      checksum: createHash('sha256').update(buffer).digest('hex'),
    };
  }

  private extensionFromMimeType(mimeType: string) {
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'bin';
    }
  }

  private assertImageSignature(buffer: Buffer, mimeType: string) {
    const isPng =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
    const isWebp =
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    const valid =
      (mimeType === 'image/png' && isPng) ||
      ((mimeType === 'image/jpeg' || mimeType === 'image/jpg') && isJpeg) ||
      (mimeType === 'image/webp' && isWebp);

    if (!valid) {
      throw new BadRequestException('La evidencia no coincide con el tipo de imagen declarado');
    }
  }

  private async storeMediaFile(captureId: string, media: ParsedMedia) {
    const storageKey = join(
      'captures',
      captureId,
      `evidence-${Date.now()}-${media.checksum.slice(0, 12)}.${media.extension}`,
    );
    const absolutePath = this.resolveStoragePath(storageKey);
    await mkdir(join(this.storageRoot(), 'captures', captureId), { recursive: true });
    await writeFile(absolutePath, media.buffer);
    return {
      storageKey,
      absolutePath,
    };
  }

  private storageRoot() {
    const configured = this.configService.get<string>('MEDIA_STORAGE_DIR');
    return resolve(configured || join(process.cwd(), 'uploads'));
  }

  private resolveStoragePath(storageKey: string) {
    return resolve(this.storageRoot(), storageKey);
  }

  private async safeDeleteFile(absolutePath: string) {
    await unlink(absolutePath).catch(() => undefined);
  }

  private async auditBlockedBySchedule(
    user: CurrentUserData,
    tournamentId: string,
    operation: 'create' | 'update' | 'sync' | 'validation',
    context?: Record<string, unknown>,
  ) {
    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'capture.blocked_by_schedule',
      entityName: 'Tournament',
      entityId: tournamentId,
      context: {
        operation,
        ...context,
      },
    });
  }

  private serializeParticipant(
    participant: Prisma.ParticipantGetPayload<{ include: typeof participantOptionInclude }>,
  ) {
    return {
      id: participant.id,
      firstName: participant.firstName,
      lastName: participant.lastName,
      phone: participant.phone,
      documentId: participant.documentId,
      enabledToCompete: participant.enabledToCompete,
      teamLinks: participant.teamLinks.map((link) => ({
        id: link.id,
        teamId: link.teamId,
        team: link.team,
      })),
      boatLinks: [],
    };
  }

  private serializeCapture(capture: CaptureDetail) {
    return {
      id: capture.id,
      tournament: {
        id: capture.tournament.id,
        name: capture.tournament.name,
        status: capture.tournament.status,
        schedules: capture.tournament.schedules,
      },
      participant: this.serializeParticipant(capture.participant),
      team: capture.team,
      official: {
        id: capture.official.id,
        user: capture.official.user,
      },
      species: capture.species,
      length: capture.length,
      captured_at: capture.capturedAt,
      recorded_at: capture.recordedAt,
      device_recorded_at: capture.deviceRecordedAt,
      synced_at: capture.syncedAt,
      gps: capture.gps,
      observation: capture.observation,
      status: capture.status,
      sync_status: capture.syncStatus,
      media: capture.media.map((media) => ({
        id: media.id,
        original_name: media.originalName,
        mime_type: media.mimeType,
        size: media.size,
        uploaded_at: media.uploadedAt,
        download_path: `/captures/media/${media.id}`,
      })),
      validations: capture.validations.map((validation) => ({
        id: validation.id,
        action: validation.action,
        reason: validation.reason,
        validated_at: validation.validatedAt,
        validated_by: validation.validatedBy,
      })),
      created_at: capture.createdAt,
      updated_at: capture.updatedAt,
    };
  }

  private normalizeOptional(value?: string | null) {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : null;
  }
}
