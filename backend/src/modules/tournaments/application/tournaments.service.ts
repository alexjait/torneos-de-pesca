import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TournamentStatus } from '@prisma/client';
import { AuditService } from '../../../common/audit/audit.service';
import { CurrentUserData } from '../../../common/auth/current-user.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ScoringRankingService } from '../../scoring-ranking/application/scoring-ranking.service';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentScheduleDto } from '../dto/update-tournament-schedule.dto';
import { UpdateTournamentScoringDto } from '../dto/update-tournament-scoring.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';

const publicRegistrationStatuses = [TournamentStatus.PUBLISHED, TournamentStatus.ACTIVE];

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly scoringRankingService: ScoringRankingService,
  ) {}

  async list() {
    const tournaments = await this.prisma.tournament.findMany({
      where: { deletedAt: null },
      include: { schedules: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: tournaments };
  }

  async listPublicRegistrationOptions() {
    const tournaments = await this.prisma.tournament.findMany({
      where: {
        deletedAt: null,
        status: { in: publicRegistrationStatuses },
      },
      select: {
        id: true,
        name: true,
        eventDate: true,
        location: true,
        status: true,
        rulesSummary: true,
      },
      orderBy: [{ eventDate: 'asc' }, { createdAt: 'asc' }],
    });

    return { data: tournaments };
  }

  async create(dto: CreateTournamentDto, user: CurrentUserData) {
    const tournament = await this.prisma.tournament.create({
      data: {
        name: dto.name,
        eventDate: new Date(dto.eventDate),
        location: dto.location,
        status: dto.status ?? TournamentStatus.DRAFT,
        rulesSummary: dto.rulesSummary,
      },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'tournament.created',
      entityName: 'Tournament',
      entityId: tournament.id,
    });

    return { data: tournament };
  }

  async get(id: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id, deletedAt: null },
      include: { schedules: true },
    });

    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }

    return { data: tournament };
  }

  async update(id: string, dto: UpdateTournamentDto, user: CurrentUserData) {
    await this.ensureExists(id);

    const tournament = await this.prisma.tournament.update({
      where: { id },
      data: {
        name: dto.name,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        location: dto.location,
        status: dto.status,
        rulesSummary: dto.rulesSummary,
      },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'tournament.updated',
      entityName: 'Tournament',
      entityId: tournament.id,
    });

    return { data: tournament };
  }

  async close(id: string, user: CurrentUserData) {
    const existingTournament = await this.ensureExists(id);
    if (existingTournament.status === TournamentStatus.CLOSED) {
      throw new ConflictException('El torneo ya fue cerrado');
    }

    const pendingCaptures = await this.prisma.capture.count({
      where: {
        tournamentId: id,
        status: 'PENDING_VALIDATION',
      },
    });
    if (pendingCaptures > 0) {
      throw new ConflictException(
        'No podes cerrar el torneo mientras existan capturas pendientes de validacion',
      );
    }

    const closedTournament = await this.prisma.$transaction(async (tx) => {
      await this.scoringRankingService.finalizeTournamentRankingInTransaction(tx, id, user);

      const closed = await tx.tournament.update({
        where: { id },
        data: { status: TournamentStatus.CLOSED },
      });

      await this.auditService.logWithTransaction(tx, {
        actorUserId: user.sub,
        actorRole: user.roles[0],
        action: 'tournament.closed',
        entityName: 'Tournament',
        entityId: closed.id,
      });

      return closed;
    });

    return { data: closedTournament };
  }

  async getScoring(id: string) {
    return this.scoringRankingService.getScoringConfig(id);
  }

  async updateSchedule(id: string, dto: UpdateTournamentScheduleDto, user: CurrentUserData) {
    await this.ensureExists(id);

    const schedule = await this.prisma.tournamentSchedule.upsert({
      where: { tournamentId: id },
      update: {
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        fishingStartAt: dto.fishingStartAt ? new Date(dto.fishingStartAt) : undefined,
        fishingEndAt: dto.fishingEndAt ? new Date(dto.fishingEndAt) : undefined,
        validationDeadlineAt: dto.validationDeadlineAt
          ? new Date(dto.validationDeadlineAt)
          : undefined,
      },
      create: {
        tournamentId: id,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        fishingStartAt: dto.fishingStartAt ? new Date(dto.fishingStartAt) : undefined,
        fishingEndAt: dto.fishingEndAt ? new Date(dto.fishingEndAt) : undefined,
        validationDeadlineAt: dto.validationDeadlineAt
          ? new Date(dto.validationDeadlineAt)
          : undefined,
      },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'tournament.schedule_updated',
      entityName: 'TournamentSchedule',
      entityId: schedule.id,
    });

    return { data: schedule };
  }

  async updateScoring(id: string, dto: UpdateTournamentScoringDto, user: CurrentUserData) {
    const normalized = this.normalizeScoringUpdate(dto);
    return this.scoringRankingService.updateScoringConfig(id, normalized, user);
  }

  async softDelete(id: string, user: CurrentUserData) {
    await this.ensureExists(id);
    const tournament = await this.prisma.tournament.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.sub,
      },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'tournament.deleted',
      entityName: 'Tournament',
      entityId: tournament.id,
    });

    return { data: tournament };
  }

  private async ensureExists(id: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id, deletedAt: null },
    });

    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }

    return tournament;
  }

  private normalizeScoringUpdate(dto: UpdateTournamentScoringDto) {
    const scoringConfig =
      dto.scoringConfig &&
      typeof dto.scoringConfig === 'object' &&
      !Array.isArray(dto.scoringConfig)
        ? dto.scoringConfig
        : null;

    return {
      pointsPerValidPiece:
        dto.pointsPerValidPiece ?? this.readLegacyNonNegativeInt(scoringConfig, 'pointsPerValidPiece'),
      largestCaptureBonusPoints:
        dto.largestCaptureBonusPoints ??
        this.readLegacyNonNegativeInt(scoringConfig, 'largestCaptureBonusPoints'),
      distinctSpeciesPoints:
        dto.distinctSpeciesPoints ??
        this.readLegacyNonNegativeInt(scoringConfig, 'distinctSpeciesPoints'),
    };
  }

  private readLegacyNonNegativeInt(
    source: Record<string, unknown> | null,
    key: string,
  ) {
    const value = source?.[key];
    return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
  }
}
