import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { CurrentUserData } from '../../../common/auth/current-user.decorator';
import { isPrismaUniqueConstraintError } from '../../../common/prisma/prisma-error.util';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateBoatDto } from '../dto/create-boat.dto';
import { UpdateBoatDto } from '../dto/update-boat.dto';

@Injectable()
export class BoatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    const boats = await this.prisma.boat.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return { data: boats };
  }

  async create(dto: CreateBoatDto, user: CurrentUserData) {
    let boat;
    try {
      boat = await this.prisma.boat.create({
        data: {
          name: dto.name,
          registrationNumber: dto.registrationNumber,
        },
      });
    } catch (error) {
      this.handleUniqueRegistrationError(error);
    }

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'boat.created',
      entityName: 'Boat',
      entityId: boat.id,
    });
    return { data: boat };
  }

  async update(id: string, dto: UpdateBoatDto, user: CurrentUserData) {
    await this.ensureExists(id);
    let boat;
    try {
      boat = await this.prisma.boat.update({
        where: { id },
        data: {
          name: dto.name,
          registrationNumber: dto.registrationNumber,
        },
      });
    } catch (error) {
      this.handleUniqueRegistrationError(error);
    }

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'boat.updated',
      entityName: 'Boat',
      entityId: boat.id,
    });
    return { data: boat };
  }

  async softDelete(id: string, user: CurrentUserData) {
    await this.ensureExists(id);
    const boat = await this.prisma.boat.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.sub,
      },
    });
    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'boat.deleted',
      entityName: 'Boat',
      entityId: boat.id,
    });
    return { data: boat };
  }

  private async ensureExists(id: string) {
    const boat = await this.prisma.boat.findFirst({ where: { id, deletedAt: null } });
    if (!boat) {
      throw new NotFoundException('Embarcacion no encontrada');
    }
  }

  private handleUniqueRegistrationError(error: unknown): never {
    if (isPrismaUniqueConstraintError(error, 'registrationNumber')) {
      throw new BadRequestException(
        'Ya existe una embarcacion con ese numero de matricula',
      );
    }

    throw error;
  }
}
