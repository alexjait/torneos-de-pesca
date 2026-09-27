import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { CurrentUserData } from '../../../common/auth/current-user.decorator';
import { isPrismaUniqueConstraintError } from '../../../common/prisma/prisma-error.util';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    const teams = await this.prisma.team.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return { data: teams };
  }

  async create(dto: CreateTeamDto, user: CurrentUserData) {
    let team;
    try {
      team = await this.prisma.team.create({ data: { name: dto.name } });
    } catch (error) {
      this.handleUniqueNameError(error);
    }

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'team.created',
      entityName: 'Team',
      entityId: team.id,
    });
    return { data: team };
  }

  async update(id: string, dto: UpdateTeamDto, user: CurrentUserData) {
    await this.ensureExists(id);
    let team;
    try {
      team = await this.prisma.team.update({
        where: { id },
        data: { name: dto.name },
      });
    } catch (error) {
      this.handleUniqueNameError(error);
    }

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'team.updated',
      entityName: 'Team',
      entityId: team.id,
    });
    return { data: team };
  }

  async softDelete(id: string, user: CurrentUserData) {
    await this.ensureExists(id);
    const team = await this.prisma.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.sub,
      },
    });
    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'team.deleted',
      entityName: 'Team',
      entityId: team.id,
    });
    return { data: team };
  }

  private async ensureExists(id: string) {
    const team = await this.prisma.team.findFirst({ where: { id, deletedAt: null } });
    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }
  }

  private handleUniqueNameError(error: unknown): never {
    if (isPrismaUniqueConstraintError(error, 'name')) {
      throw new BadRequestException('Ya existe un equipo con ese nombre');
    }

    throw error;
  }
}
