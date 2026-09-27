import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../../../common/audit/audit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from '../../../common/utils/token.util';

@Injectable()
export class UsersAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createAdministrativeUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: UserRole;
    temporaryPassword?: string;
    actorUserId?: string;
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: params.email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con ese email');
    }

    const bootstrapPassword =
      params.temporaryPassword ?? generateOpaqueToken().slice(0, 24);
    const passwordHash = await bcrypt.hash(bootstrapPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        email: params.email.toLowerCase(),
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        passwordHash,
        accountStatus: AccountStatus.PENDING_EMAIL_VERIFICATION,
        roleAssignments: {
          create: [{ role: params.role }],
        },
      },
      include: {
        roleAssignments: true,
      },
    });

    await this.auditService.log({
      actorUserId: params.actorUserId,
      actorRole: 'ADMIN',
      action: 'user.created',
      entityName: 'User',
      entityId: user.id,
      context: { role: params.role },
    });

    return user;
  }

  async createEmailVerificationToken(userId: string, rawToken: string, expiresAt: Date) {
    return this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token: hashOpaqueToken(rawToken),
        expiresAt,
      },
    });
  }

  async createPasswordSetupToken(userId: string, rawToken: string, expiresAt: Date) {
    return this.prisma.passwordSetupToken.create({
      data: {
        userId,
        token: hashOpaqueToken(rawToken),
        expiresAt,
      },
    });
  }

  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        roleAssignments: true,
      },
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async getUserForActiveSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });

    if (!user || user.deletedAt || user.accountStatus !== AccountStatus.ACTIVE) {
      return null;
    }

    return user;
  }

  async activateAccount(params: { token: string; newPassword: string }) {
    const hashed = hashOpaqueToken(params.token);
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { token: hashed },
      include: { user: { include: { roleAssignments: true } } },
    });

    if (!verificationToken || verificationToken.consumedAt || verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Token de activación inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(params.newPassword, 10);

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { consumedAt: new Date() },
      });

      return tx.user.update({
        where: { id: verificationToken.userId },
        data: {
          passwordHash,
          accountStatus: AccountStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
        include: { roleAssignments: true },
      });
    });

    await this.auditService.log({
      actorUserId: updatedUser.id,
      actorRole: updatedUser.roleAssignments[0]?.role ?? 'UNKNOWN',
      action: 'user.activated',
      entityName: 'User',
      entityId: updatedUser.id,
    });

    return updatedUser;
  }

  async findUserForPasswordSetup(email: string) {
    const user = await this.getUserByEmail(email);
    if (!user || user.deletedAt) {
      return null;
    }
    return user;
  }

  async completePasswordSetup(params: { token: string; password: string }) {
    const hashed = hashOpaqueToken(params.token);
    const passwordToken = await this.prisma.passwordSetupToken.findUnique({
      where: { token: hashed },
    });

    if (!passwordToken || passwordToken.consumedAt || passwordToken.expiresAt < new Date()) {
      throw new BadRequestException('Token para definir la contraseña inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(params.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.passwordSetupToken.update({
        where: { id: passwordToken.id },
        data: { consumedAt: new Date() },
      });

      return tx.user.update({
        where: { id: passwordToken.userId },
        data: { passwordHash },
        include: { roleAssignments: true },
      });
    });

    await this.auditService.log({
      actorUserId: user.id,
      actorRole: user.roleAssignments[0]?.role ?? 'UNKNOWN',
      action: 'user.password_setup_completed',
      entityName: 'User',
      entityId: user.id,
    });

    return user;
  }

  async disableUserAccess(userId: string, actorUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    const disabledUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: AccountStatus.DISABLED,
        deletedAt: new Date(),
        deletedBy: actorUserId,
      },
      include: { roleAssignments: true },
    });

    await this.auditService.log({
      actorUserId,
      actorRole: 'ADMIN',
      action: 'user.disabled',
      entityName: 'User',
      entityId: disabledUser.id,
    });

    return disabledUser;
  }
}
