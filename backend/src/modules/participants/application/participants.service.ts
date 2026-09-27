import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { AuditService } from '../../../common/audit/audit.service';
import { CurrentUserData } from '../../../common/auth/current-user.decorator';
import { safeUserSelect } from '../../../common/prisma/safe-selects';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { generateOpaqueToken } from '../../../common/utils/token.util';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersAccessService } from '../../users-access/application/users-access.service';
import { CreateParticipantDto } from '../dto/create-participant.dto';
import { UpdateParticipantDto } from '../dto/update-participant.dto';

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly usersAccessService: UsersAccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list() {
    const participants = await this.prisma.participant.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: safeUserSelect },
        teamLinks: { where: { deletedAt: null } },
        boatLinks: { where: { deletedAt: null } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: participants };
  }

  async create(dto: CreateParticipantDto, user: CurrentUserData) {
    let userId: string | undefined;
    let activationEmail: Record<string, unknown> | undefined;

    if (dto.email) {
      const createdUser = await this.usersAccessService.createAdministrativeUser({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.PARTICIPANT,
        actorUserId: user.sub,
      });
      userId = createdUser.id;

      const activationToken = generateOpaqueToken();
      await this.usersAccessService.createEmailVerificationToken(
        createdUser.id,
        activationToken,
        new Date(Date.now() + 1000 * 60 * 60 * 24),
      );

      activationEmail = await this.notificationsService.sendParticipantRegistrationEmail({
        to: createdUser.email,
        fullName: `${createdUser.firstName} ${createdUser.lastName}`,
        activationUrl: `${this.configService.get<string>('APP_BASE_URL')}/activar-cuenta?token=${activationToken}`,
        idempotencyKey: `participant-activation/${createdUser.id}`,
      });
    }

    const participant = await this.prisma.participant.create({
      data: {
        userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        documentId: dto.documentId,
        enabledToCompete: dto.enabledToCompete ?? false,
      },
      include: { user: { select: safeUserSelect } },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'participant.created',
      entityName: 'Participant',
      entityId: participant.id,
    });

    return { data: participant, meta: { activationEmail } };
  }

  async update(id: string, dto: UpdateParticipantDto, user: CurrentUserData) {
    await this.ensureExists(id);

    const participant = await this.prisma.participant.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        documentId: dto.documentId,
        enabledToCompete: dto.enabledToCompete,
      },
      include: { user: { select: safeUserSelect } },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'participant.updated',
      entityName: 'Participant',
      entityId: participant.id,
    });

    return { data: participant };
  }

  async linkTeam(id: string, teamId: string, user: CurrentUserData) {
    await this.ensureExists(id);
    await this.ensureTeamExists(teamId);

    const link = await this.prisma.participantTeamLink.upsert({
      where: {
        participantId_teamId: {
          participantId: id,
          teamId,
        },
      },
      update: {
        deletedAt: null,
        deletedBy: null,
      },
      create: {
        participantId: id,
        teamId,
      },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'participant.team_linked',
      entityName: 'ParticipantTeamLink',
      entityId: link.id,
    });

    return { data: link };
  }

  async linkBoat(id: string, boatId: string, user: CurrentUserData) {
    await this.ensureExists(id);
    await this.ensureBoatExists(boatId);

    const link = await this.prisma.participantBoatLink.upsert({
      where: {
        participantId_boatId: {
          participantId: id,
          boatId,
        },
      },
      update: {
        deletedAt: null,
        deletedBy: null,
      },
      create: {
        participantId: id,
        boatId,
      },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'participant.boat_linked',
      entityName: 'ParticipantBoatLink',
      entityId: link.id,
    });

    return { data: link };
  }

  async unlinkTeam(id: string, linkId: string, user: CurrentUserData) {
    await this.ensureExists(id);

    const link = await this.prisma.participantTeamLink.findFirst({
      where: { id: linkId, participantId: id, deletedAt: null },
    });

    if (!link) {
      throw new NotFoundException('Vinculo con equipo no encontrado');
    }

    await this.prisma.participantTeamLink.update({
      where: { id: linkId },
      data: {
        deletedAt: new Date(),
        deletedBy: user.sub,
      },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'participant.team_unlinked',
      entityName: 'ParticipantTeamLink',
      entityId: linkId,
    });

    return { data: { success: true } };
  }

  async unlinkBoat(id: string, linkId: string, user: CurrentUserData) {
    await this.ensureExists(id);

    const link = await this.prisma.participantBoatLink.findFirst({
      where: { id: linkId, participantId: id, deletedAt: null },
    });

    if (!link) {
      throw new NotFoundException('Vinculo con embarcacion no encontrado');
    }

    await this.prisma.participantBoatLink.update({
      where: { id: linkId },
      data: {
        deletedAt: new Date(),
        deletedBy: user.sub,
      },
    });

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'participant.boat_unlinked',
      entityName: 'ParticipantBoatLink',
      entityId: linkId,
    });

    return { data: { success: true } };
  }

  async softDelete(id: string, user: CurrentUserData) {
    const existingParticipant = await this.prisma.participant.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingParticipant) {
      throw new NotFoundException('Participante no encontrado');
    }

    const participant = await this.prisma.participant.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.sub,
      },
    });

    if (existingParticipant.userId) {
      await this.usersAccessService.disableUserAccess(
        existingParticipant.userId,
        user.sub,
      );
    }

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'participant.deleted',
      entityName: 'Participant',
      entityId: id,
    });

    return { data: participant };
  }

  private async ensureExists(id: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { id, deletedAt: null },
    });

    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }
  }

  private async ensureTeamExists(id: string) {
    const team = await this.prisma.team.findFirst({ where: { id, deletedAt: null } });
    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }
  }

  private async ensureBoatExists(id: string) {
    const boat = await this.prisma.boat.findFirst({ where: { id, deletedAt: null } });
    if (!boat) {
      throw new NotFoundException('Embarcacion no encontrada');
    }
  }
}
