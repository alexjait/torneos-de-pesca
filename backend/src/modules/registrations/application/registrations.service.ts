import {
  AccountStatus,
  Prisma,
  RegistrationChannel,
  RegistrationReviewStatus,
  TournamentStatus,
  UserRole,
} from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../../common/audit/audit.service';
import { CurrentUserData } from '../../../common/auth/current-user.decorator';
import { isPrismaUniqueConstraintError } from '../../../common/prisma/prisma-error.util';
import { safeUserSelect } from '../../../common/prisma/safe-selects';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from '../../../common/utils/token.util';
import { NotificationsService } from '../../notifications/notifications.service';
import { ApproveRegistrationDto } from '../dto/approve-registration.dto';
import { CreateRegistrationDto } from '../dto/create-registration.dto';
import { ListRegistrationsQueryDto } from '../dto/list-registrations-query.dto';
import { RejectRegistrationDto } from '../dto/reject-registration.dto';
import { SelfRegisterDto } from '../dto/self-register.dto';

type ActivationEmailMeta = {
  accepted: boolean;
  providerMessageId: string | null;
  errorCode: string | null;
} | undefined;

const registrationDetailInclude = {
  tournament: true,
  participant: {
    include: {
      user: { select: safeUserSelect },
    },
  },
  reviewedBy: { select: safeUserSelect },
} satisfies Prisma.RegistrationInclude;

type RegistrationDetail = Prisma.RegistrationGetPayload<{
  include: typeof registrationDetailInclude;
}>;

type RegistrationStatusView = {
  reviewStatus: RegistrationReviewStatus;
  participant: {
    user: {
      accountStatus: AccountStatus;
    } | null;
  } | null;
};

type RegistrationApprovalResult = {
  approved: RegistrationDetail;
  activationToken: string | null;
  createdUserId: string | null;
};

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAdmin(dto: CreateRegistrationDto, user: CurrentUserData) {
    const tournament = await this.getTournament(dto.tournamentId);
    const participant = await this.getParticipant(dto.participantId);

    const existingApproved = await this.prisma.registration.findFirst({
      where: {
        tournamentId: dto.tournamentId,
        participantId: dto.participantId,
        reviewStatus: RegistrationReviewStatus.APPROVED,
      },
    });

    if (existingApproved) {
      throw new ConflictException(
        'Ese participante ya tiene una inscripcion aprobada para este torneo',
      );
    }

    const registration = await this.prisma.$transaction(async (tx) => {
      const created = await tx.registration.create({
        data: {
          tournamentId: tournament.id,
          participantId: participant.id,
          channel: RegistrationChannel.ADMIN,
          reviewStatus: RegistrationReviewStatus.APPROVED,
          applicantFirstName: participant.firstName,
          applicantLastName: participant.lastName,
          applicantDocumentId: participant.documentId,
          applicantEmail: participant.user?.email ?? null,
          applicantPhone: participant.phone,
          acceptedRulesAt: new Date(),
          acceptedRulesSnapshot: this.buildRulesSnapshot(tournament),
          reviewedByUserId: user.sub,
          reviewedAt: new Date(),
        },
        include: registrationDetailInclude,
      });

      await tx.participant.update({
        where: { id: participant.id },
        data: { enabledToCompete: true },
      });

      await this.auditService.logWithTransaction(tx, {
        actorUserId: user.sub,
        actorRole: user.roles[0],
        action: 'registration.created',
        entityName: 'Registration',
        entityId: created.id,
        context: {
          tournamentId: tournament.id,
          participantId: participant.id,
          channel: RegistrationChannel.ADMIN,
        },
      });

      return created;
    });

    return { data: this.serializeRegistration(registration) };
  }

  async selfRegister(dto: SelfRegisterDto) {
    const tournament = await this.getTournament(dto.tournamentId);
    if (
      tournament.status !== TournamentStatus.PUBLISHED &&
      tournament.status !== TournamentStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'El torneo no esta habilitado para auto-registro en este momento',
      );
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedDocumentId = this.normalizeOptional(dto.documentId);

    await this.ensureNoOpenDuplicate(dto.tournamentId, normalizedEmail, normalizedDocumentId);
    await this.ensureNoApprovedDuplicate(dto.tournamentId, normalizedEmail, normalizedDocumentId);

    const lookupToken = generateOpaqueToken();
    const registration = await this.prisma.$transaction(async (tx) => {
      const created = await tx.registration.create({
        data: {
          tournamentId: tournament.id,
          channel: RegistrationChannel.SELF_SERVICE,
          reviewStatus: RegistrationReviewStatus.PENDING_REVIEW,
          applicantFirstName: dto.firstName.trim(),
          applicantLastName: dto.lastName.trim(),
          applicantDocumentId: normalizedDocumentId,
          applicantEmail: normalizedEmail,
          applicantPhone: this.normalizeOptional(dto.phone),
          acceptedRulesAt: new Date(),
          acceptedRulesSnapshot: this.buildRulesSnapshot(tournament),
          statusLookupTokenHash: hashOpaqueToken(lookupToken),
        },
        include: registrationDetailInclude,
      });

      await this.auditService.logWithTransaction(tx, {
        action: 'registration.self_registered',
        entityName: 'Registration',
        entityId: created.id,
        context: {
          tournamentId: tournament.id,
          channel: RegistrationChannel.SELF_SERVICE,
        },
      });

      return created;
    });

    return {
      data: {
        id: registration.id,
        review_status: registration.reviewStatus,
        operational_status: this.getOperationalStatus(registration),
        lookup_token: lookupToken,
        next_action: 'WAIT_REVIEW',
      },
    };
  }

  async list(query: ListRegistrationsQueryDto) {
    const registrations = await this.prisma.registration.findMany({
      where: {
        tournamentId: query.tournamentId,
        reviewStatus: query.reviewStatus,
        channel: query.channel,
      },
      include: registrationDetailInclude,
      orderBy: { createdAt: 'desc' },
    });

    return { data: registrations.map((registration) => this.serializeRegistration(registration)) };
  }

  async get(id: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
      include: registrationDetailInclude,
    });

    if (!registration) {
      throw new NotFoundException('Inscripcion no encontrada');
    }

    return { data: this.serializeRegistration(registration) };
  }

  async approve(id: string, dto: ApproveRegistrationDto, user: CurrentUserData) {
    let approvalResult: RegistrationApprovalResult;
    try {
      approvalResult = await this.prisma.$transaction(
        async (tx) => {
          const registration = await tx.registration.findUnique({
            where: { id },
            include: registrationDetailInclude,
          });

          if (!registration) {
            throw new NotFoundException('Inscripcion no encontrada');
          }

          if (registration.reviewStatus !== RegistrationReviewStatus.PENDING_REVIEW) {
            throw new ConflictException('La inscripcion ya fue resuelta');
          }

          const resolution = await this.resolveParticipantAndUser(tx, registration);

          await tx.participant.update({
            where: { id: resolution.participantId },
            data: {
              enabledToCompete: true,
              userId: resolution.userId,
            },
          });

          const approved = await tx.registration.update({
            where: { id: registration.id },
            data: {
              participantId: resolution.participantId,
              reviewStatus: RegistrationReviewStatus.APPROVED,
              reviewNotes: dto.notes?.trim() || null,
              reviewedByUserId: user.sub,
              reviewedAt: new Date(),
              rejectionReason: null,
            },
            include: registrationDetailInclude,
          });

          if (resolution.createdUserId) {
            await this.auditService.logWithTransaction(tx, {
              actorUserId: user.sub,
              actorRole: user.roles[0],
              action: 'user.created',
              entityName: 'User',
              entityId: resolution.createdUserId,
              context: { role: UserRole.PARTICIPANT },
            });
          }

          await this.auditService.logWithTransaction(tx, {
            actorUserId: user.sub,
            actorRole: user.roles[0],
            action: 'registration.approved',
            entityName: 'Registration',
            entityId: approved.id,
            context: {
              participantId: approved.participantId,
              accountStatus: approved.participant?.user?.accountStatus ?? null,
            },
          });

          return {
            approved,
            activationToken: resolution.activationToken,
            createdUserId: resolution.createdUserId,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          'No se pudo aprobar la inscripcion porque ya existe una inscripcion aprobada o una identidad compatible con los datos informados',
        );
      }

      throw error;
    }

    let activationEmail: ActivationEmailMeta;
    if (
      approvalResult.activationToken &&
      approvalResult.approved.participant?.user?.email
    ) {
      activationEmail = await this.notificationsService.sendParticipantRegistrationEmail({
        to: approvalResult.approved.participant.user.email,
        fullName: `${approvalResult.approved.participant.firstName} ${approvalResult.approved.participant.lastName}`,
        activationUrl: `${this.configService.get<string>('APP_BASE_URL')}/activar-cuenta?token=${approvalResult.activationToken}`,
        idempotencyKey: `registration-approval/${approvalResult.approved.id}`,
      });
    }

    return {
      data: this.serializeRegistration(approvalResult.approved),
      meta: activationEmail ? { activationEmail } : undefined,
    };
  }

  async reject(id: string, dto: RejectRegistrationDto, user: CurrentUserData) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
      include: registrationDetailInclude,
    });

    if (!registration) {
      throw new NotFoundException('Inscripcion no encontrada');
    }

    if (registration.reviewStatus !== RegistrationReviewStatus.PENDING_REVIEW) {
      throw new ConflictException('La inscripcion ya fue resuelta');
    }

    const rejected = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.registration.update({
        where: { id },
        data: {
          reviewStatus: RegistrationReviewStatus.REJECTED,
          rejectionReason: dto.reason?.trim() || null,
          reviewedByUserId: user.sub,
          reviewedAt: new Date(),
        },
        include: registrationDetailInclude,
      });

      await this.auditService.logWithTransaction(tx, {
        actorUserId: user.sub,
        actorRole: user.roles[0],
        action: 'registration.rejected',
        entityName: 'Registration',
        entityId: updated.id,
        context: { rejectionReason: updated.rejectionReason },
      });

      return updated;
    });

    return { data: this.serializeRegistration(rejected) };
  }

  async publicStatus(lookupToken: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { statusLookupTokenHash: hashOpaqueToken(lookupToken) },
      include: {
        tournament: true,
        participant: {
          include: {
            user: { select: safeUserSelect },
          },
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('No se encontro una inscripcion para el codigo indicado');
    }

    return {
      data: {
        tournamentName: registration.tournament.name,
        review_status: registration.reviewStatus,
        operational_status: this.getOperationalStatus(registration),
        account_status: registration.participant?.user?.accountStatus ?? null,
        next_action: this.getNextAction(registration),
      },
    };
  }

  private async getTournament(tournamentId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, deletedAt: null },
    });

    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }

    return tournament;
  }

  private async getParticipant(participantId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { id: participantId, deletedAt: null },
      include: {
        user: { select: safeUserSelect },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }

    return participant;
  }

  private buildRulesSnapshot(tournament: { id: string; rulesSummary: string | null }) {
    return {
      tournamentId: tournament.id,
      rulesSummary: tournament.rulesSummary,
    } as Prisma.InputJsonValue;
  }

  private normalizeOptional(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private async ensureNoOpenDuplicate(
    tournamentId: string,
    email: string,
    documentId: string | null,
  ) {
    const duplicate = await this.prisma.registration.findFirst({
      where: {
        tournamentId,
        reviewStatus: RegistrationReviewStatus.PENDING_REVIEW,
        OR: [
          { applicantEmail: email },
          ...(documentId ? [{ applicantDocumentId: documentId }] : []),
        ],
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Ya existe una solicitud pendiente para ese torneo con los datos informados',
      );
    }
  }

  private async ensureNoApprovedDuplicate(
    tournamentId: string,
    email: string,
    documentId: string | null,
  ) {
    const approvedByParticipant = await this.prisma.registration.findFirst({
      where: {
        tournamentId,
        reviewStatus: RegistrationReviewStatus.APPROVED,
        OR: [
          { applicantEmail: email },
          ...(documentId ? [{ applicantDocumentId: documentId }] : []),
          { participant: { user: { email } } },
          ...(documentId ? [{ participant: { documentId } }] : []),
        ],
      },
    });

    if (approvedByParticipant) {
      throw new ConflictException(
        'Ya existe una inscripcion aprobada para ese torneo con los datos informados',
      );
    }
  }

  private async resolveParticipantAndUser(
    tx: Prisma.TransactionClient,
    registration: RegistrationDetail,
  ) {
    const normalizedEmail = registration.applicantEmail?.toLowerCase() ?? null;
    const documentId = registration.applicantDocumentId ?? null;

    const participantByDocument = documentId
      ? await tx.participant.findFirst({
          where: { documentId, deletedAt: null },
          include: { user: { include: { roleAssignments: true } } },
        })
      : null;

    const participantByEmail = normalizedEmail
      ? await tx.participant.findFirst({
          where: { deletedAt: null, user: { email: normalizedEmail, deletedAt: null } },
          include: { user: { include: { roleAssignments: true } } },
        })
      : null;

    if (
      participantByDocument &&
      participantByEmail &&
      participantByDocument.id !== participantByEmail.id
    ) {
      throw new ConflictException(
        'No se pudo aprobar la inscripcion porque los datos coinciden con participantes distintos',
      );
    }

    const standaloneUser = normalizedEmail
      ? await tx.user.findUnique({
          where: { email: normalizedEmail },
          include: { roleAssignments: true },
        })
      : null;

    let participant = participantByDocument ?? participantByEmail;
    let activationToken: string | null = null;
    let createdUserId: string | null = null;

    if (!participant) {
      participant = await tx.participant.create({
        data: {
          firstName: registration.applicantFirstName,
          lastName: registration.applicantLastName,
          phone: registration.applicantPhone,
          documentId,
          enabledToCompete: true,
          userId: standaloneUser?.deletedAt ? undefined : standaloneUser?.id,
        },
        include: { user: { include: { roleAssignments: true } } },
      });
    } else if (!participant.userId && standaloneUser && !standaloneUser.deletedAt) {
      participant = await tx.participant.update({
        where: { id: participant.id },
        data: { userId: standaloneUser.id },
        include: { user: { include: { roleAssignments: true } } },
      });
    }

    let user = participant.user ?? null;
    if (!user && standaloneUser && !standaloneUser.deletedAt) {
      user = standaloneUser;
    }

    if (user && !user.roleAssignments.some((assignment) => assignment.role === UserRole.PARTICIPANT)) {
      await tx.userRoleAssignment.createMany({
        data: [{ userId: user.id, role: UserRole.PARTICIPANT }],
        skipDuplicates: true,
      });
      user = await tx.user.findUnique({
        where: { id: user.id },
        include: { roleAssignments: true },
      });
    }

    if (!user && normalizedEmail) {
      const bootstrapPassword = generateOpaqueToken().slice(0, 24);
      const passwordHash = await bcrypt.hash(bootstrapPassword, 10);
      activationToken = generateOpaqueToken();
      const hashedActivationToken = hashOpaqueToken(activationToken);

      user = await tx.user.create({
        data: {
          email: normalizedEmail,
          firstName: participant.firstName,
          lastName: participant.lastName,
          phone: participant.phone,
          passwordHash,
          accountStatus: AccountStatus.PENDING_EMAIL_VERIFICATION,
          roleAssignments: {
            create: [{ role: UserRole.PARTICIPANT }],
          },
          verificationTokens: {
            create: {
              token: hashedActivationToken,
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            },
          },
        },
        include: { roleAssignments: true },
      });
      createdUserId = user.id;
    }

    if (user && participant.userId !== user.id) {
      participant = await tx.participant.update({
        where: { id: participant.id },
        data: { userId: user.id },
        include: { user: { include: { roleAssignments: true } } },
      });
    }

    return {
      participantId: participant.id,
      userId: user?.id ?? null,
      activationToken,
      createdUserId,
    };
  }

  private serializeRegistration(
    registration: RegistrationDetail,
  ) {
    return {
      id: registration.id,
      tournament: {
        id: registration.tournament.id,
        name: registration.tournament.name,
        status: registration.tournament.status,
      },
      participant: registration.participant
        ? {
            id: registration.participant.id,
            firstName: registration.participant.firstName,
            lastName: registration.participant.lastName,
            documentId: registration.participant.documentId,
            phone: registration.participant.phone,
            enabledToCompete: registration.participant.enabledToCompete,
            user: registration.participant.user,
          }
        : null,
      channel: registration.channel,
      review_status: registration.reviewStatus,
      operational_status: this.getOperationalStatus(registration),
      applicant: {
        firstName: registration.applicantFirstName,
        lastName: registration.applicantLastName,
        documentId: registration.applicantDocumentId,
        email: registration.applicantEmail,
        phone: registration.applicantPhone,
      },
      accepted_rules_at: registration.acceptedRulesAt,
      accepted_rules_snapshot: registration.acceptedRulesSnapshot,
      review_notes: registration.reviewNotes,
      reviewed_by: registration.reviewedBy,
      reviewed_at: registration.reviewedAt,
      rejection_reason: registration.rejectionReason,
      account_status: registration.participant?.user?.accountStatus ?? null,
      next_action: this.getNextAction(registration),
      created_at: registration.createdAt,
      updated_at: registration.updatedAt,
    };
  }

  private getOperationalStatus(registration: RegistrationStatusView) {
    if (registration.reviewStatus === RegistrationReviewStatus.REJECTED) {
      return 'REJECTED';
    }

    if (registration.reviewStatus === RegistrationReviewStatus.PENDING_REVIEW) {
      return 'PENDING_REVIEW';
    }

    const accountStatus = registration.participant?.user?.accountStatus;
    if (accountStatus === AccountStatus.PENDING_EMAIL_VERIFICATION) {
      return 'PENDING_ACCOUNT_ACTIVATION';
    }

    return 'READY_TO_COMPETE';
  }

  private getNextAction(registration: RegistrationStatusView) {
    const operationalStatus = this.getOperationalStatus(registration);

    if (operationalStatus === 'PENDING_REVIEW') {
      return 'WAIT_REVIEW';
    }

    if (operationalStatus === 'PENDING_ACCOUNT_ACTIVATION') {
      return 'ACTIVATE_ACCOUNT';
    }

    if (operationalStatus === 'REJECTED') {
      return 'CONTACT_ORGANIZATION';
    }

    return 'READY_TO_COMPETE';
  }
}
