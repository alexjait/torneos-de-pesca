import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { AuditService } from '../../../common/audit/audit.service';
import { CurrentUserData } from '../../../common/auth/current-user.decorator';
import { isPrismaUniqueConstraintError } from '../../../common/prisma/prisma-error.util';
import { safeUserSelect } from '../../../common/prisma/safe-selects';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { generateOpaqueToken } from '../../../common/utils/token.util';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersAccessService } from '../../users-access/application/users-access.service';
import { AssignOfficialDto } from '../dto/assign-official.dto';
import { CreateOfficialDto } from '../dto/create-official.dto';
import { UpdateOfficialDto } from '../dto/update-official.dto';

@Injectable()
export class OfficialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly usersAccessService: UsersAccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list() {
    const officials = await this.prisma.official.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: safeUserSelect },
        tournamentAssignments: { include: { tournament: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: officials };
  }

  async create(dto: CreateOfficialDto, user: CurrentUserData) {
    const createdUser = await this.usersAccessService.createAdministrativeUser({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: UserRole.OFFICIAL,
      temporaryPassword: dto.temporaryPassword,
      actorUserId: user.sub,
    });

    const activationToken = generateOpaqueToken();
    await this.usersAccessService.createEmailVerificationToken(
      createdUser.id,
      activationToken,
      new Date(Date.now() + 1000 * 60 * 60 * 24),
    );

    const official = await this.prisma.official.create({
      data: {
        userId: createdUser.id,
        documentId: dto.documentId,
      },
      include: { user: { select: safeUserSelect } },
    });

    const activationEmail = await this.notificationsService.sendOfficialRegistrationEmail({
      to: createdUser.email,
      fullName: `${createdUser.firstName} ${createdUser.lastName}`,
      activationUrl: `${this.configService.get<string>('APP_BASE_URL')}/activar-cuenta?token=${activationToken}`,
      idempotencyKey: `official-activation/${createdUser.id}`,
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'official.created',
      entityName: 'Official',
      entityId: official.id,
      context: { activationEmail },
    });

    return { data: official, meta: { activationEmail } };
  }

  async update(id: string, dto: UpdateOfficialDto, user: CurrentUserData) {
    const official = await this.prisma.official.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: safeUserSelect } },
    });

    if (!official) {
      throw new NotFoundException('Fiscal no encontrado');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: official.userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          email: dto.email?.toLowerCase(),
        },
      });

      return tx.official.update({
        where: { id },
        data: {
          documentId: dto.documentId,
        },
        include: { user: { select: safeUserSelect } },
      });
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'official.updated',
      entityName: 'Official',
      entityId: updated.id,
    });

    return { data: updated };
  }

  async assignToTournament(id: string, dto: AssignOfficialDto, user: CurrentUserData) {
    await this.ensureOfficialExists(id);
    await this.ensureTournamentExists(dto.tournamentId);

    let assignment;
    try {
      assignment = await this.prisma.officialTournamentAssignment.create({
        data: {
          officialId: id,
          tournamentId: dto.tournamentId,
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error, 'officialId')) {
        throw new ConflictException(
          'Ese fiscal ya estaba asignado a este torneo',
        );
      }
      throw error;
    }

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'official.assigned_to_tournament',
      entityName: 'OfficialTournamentAssignment',
      entityId: assignment.id,
    });

    return { data: assignment };
  }

  async removeAssignment(id: string, assignmentId: string, user: CurrentUserData) {
    await this.ensureOfficialExists(id);
    const assignment = await this.prisma.officialTournamentAssignment.findFirst({
      where: { id: assignmentId, officialId: id },
    });

    if (!assignment) {
      throw new NotFoundException('Asignacion no encontrada');
    }

    await this.prisma.officialTournamentAssignment.delete({
      where: { id: assignmentId },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'official.assignment_removed',
      entityName: 'OfficialTournamentAssignment',
      entityId: assignmentId,
    });

    return { data: { success: true } };
  }

  async softDelete(id: string, user: CurrentUserData) {
    const official = await this.prisma.official.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: safeUserSelect } },
    });

    if (!official) {
      throw new NotFoundException('Fiscal no encontrado');
    }

    const deleted = await this.prisma.official.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.sub,
      },
      include: { user: { select: safeUserSelect } },
    });

    await this.usersAccessService.disableUserAccess(official.userId, user.sub);

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'official.deleted',
      entityName: 'Official',
      entityId: deleted.id,
    });

    return { data: deleted };
  }

  private async ensureOfficialExists(id: string) {
    const official = await this.prisma.official.findFirst({
      where: { id, deletedAt: null },
    });

    if (!official) {
      throw new NotFoundException('Fiscal no encontrado');
    }
  }

  private async ensureTournamentExists(id: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id, deletedAt: null },
    });

    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }
  }
}
