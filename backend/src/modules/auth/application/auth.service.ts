import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { AuditService } from '../../../common/audit/audit.service';
import { generateOpaqueToken } from '../../../common/utils/token.util';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersAccessService } from '../../users-access/application/users-access.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ActivateAccountDto } from '../dto/activate-account.dto';
import { BootstrapAdminDto } from '../dto/bootstrap-admin.dto';
import { CompletePasswordSetupDto } from '../dto/complete-password-setup.dto';
import { LoginDto } from '../dto/login.dto';
import { RequestPasswordSetupDto } from '../dto/request-password-setup.dto';
import { AuthSessionService } from './auth-session.service';
import { clearRefreshCookie, refreshTokenFromRequest, setRefreshCookie } from '../infrastructure/auth-cookie';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersAccessService: UsersAccessService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async bootstrapAdmin(dto: BootstrapAdminDto) {
    this.assertBootstrapAdminEnabled();

    const adminCount = await this.prisma.userRoleAssignment.count({
      where: { role: UserRole.ADMIN },
    });

    if (adminCount > 0) {
      throw new BadRequestException('La cuenta administradora inicial ya fue creada');
    }

    const user = await this.usersAccessService.createAdministrativeUser({
      ...dto,
      role: UserRole.ADMIN,
    });

    const activationToken = generateOpaqueToken();
    await this.usersAccessService.createEmailVerificationToken(
      user.id,
      activationToken,
      new Date(Date.now() + 1000 * 60 * 60 * 24),
    );

    const activationUrl = `${this.configService.get<string>('APP_BASE_URL')}/activar-cuenta?token=${activationToken}`;

    const emailResult = await this.notificationsService.sendAccountActivationEmail({
      to: user.email,
      fullName: `${user.firstName} ${user.lastName}`,
      activationUrl,
      idempotencyKey: `bootstrap-admin/${user.id}`,
    });

    return {
      data: {
        userId: user.id,
        accountStatus: user.accountStatus,
        activationEmail: emailResult,
      },
    };
  }

  async login(dto: LoginDto, response: Response) {
    const user = await this.usersAccessService.getUserByEmail(dto.email);

    if (!user || user.deletedAt || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('La cuenta todavía no está activa');
    }

    const roles = user.roleAssignments.map((roleAssignment) => roleAssignment.role);
    const accessToken = await this.issueAccessToken(user, roles);
    const refreshSession = await this.authSessionService.create(user.id);
    setRefreshCookie(response, this.configService, refreshSession.rawToken);

    await this.auditService.log({
      actorUserId: user.id,
      actorRole: roles[0],
      action: 'auth.login',
      entityName: 'User',
      entityId: user.id,
    });

    return {
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles,
          accountStatus: user.accountStatus,
        },
      },
    };
  }

  async refresh(request: Request, response: Response) {
    const rawToken = refreshTokenFromRequest(request);
    try {
      const rotated = await this.authSessionService.rotate(rawToken ?? '');
      const user = await this.usersAccessService.getUserForActiveSession(rotated.session.userId);
      if (!user) throw new UnauthorizedException('Sesion invalida o expirada');
      const roles = user.roleAssignments.map((assignment) => assignment.role);
      const accessToken = await this.issueAccessToken(user, roles);
      setRefreshCookie(response, this.configService, rotated.rawToken);
      await this.auditService.log({ actorUserId: user.id, actorRole: roles[0], action: 'auth.refresh', entityName: 'User', entityId: user.id });
      return { data: { accessToken, user: this.serializeUser(user, roles) } };
    } catch (error) {
      clearRefreshCookie(response, this.configService);
      throw error;
    }
  }

  async logout(request: Request, response: Response) {
    const revokedSession = await this.authSessionService.revoke(refreshTokenFromRequest(request));
    clearRefreshCookie(response, this.configService);
    if (revokedSession) {
      await this.auditService.log({
        actorUserId: revokedSession.userId,
        action: 'auth.logout',
        entityName: 'User',
        entityId: revokedSession.userId,
      });
    }
    return { data: { success: true } };
  }

  async activateAccount(dto: ActivateAccountDto) {
    const user = await this.usersAccessService.activateAccount(dto);
    return {
      data: {
        userId: user.id,
        accountStatus: user.accountStatus,
      },
    };
  }

  async requestPasswordSetup(dto: RequestPasswordSetupDto) {
    const user = await this.usersAccessService.findUserForPasswordSetup(dto.email);

    if (user) {
      const rawToken = generateOpaqueToken();
      await this.usersAccessService.createPasswordSetupToken(
        user.id,
        rawToken,
        new Date(Date.now() + 1000 * 60 * 60 * 2),
      );

      const activationUrl = `${this.configService.get<string>('APP_BASE_URL')}/activar-cuenta?token=${rawToken}`;
      await this.notificationsService.sendAccountActivationEmail({
        to: user.email,
        fullName: `${user.firstName} ${user.lastName}`,
        activationUrl,
        idempotencyKey: `password-setup/${user.id}`,
      });
    }

    return {
      data: {
        requested: true,
      },
    };
  }

  async completePasswordSetup(dto: CompletePasswordSetupDto) {
    const user = await this.usersAccessService.completePasswordSetup(dto);
    return {
      data: {
        userId: user.id,
      },
    };
  }

  async me(userId: string) {
    const user = await this.usersAccessService.getUserById(userId);
    return {
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roleAssignments.map((roleAssignment) => roleAssignment.role),
        accountStatus: user.accountStatus,
      },
    };
  }

  private async issueAccessToken(user: { id: string; email: string; accountStatus: string }, roles: UserRole[]) {
    return this.jwtService.signAsync({ sub: user.id, email: user.email, roles, accountStatus: user.accountStatus });
  }

  private serializeUser(user: { id: string; email: string; firstName: string; lastName: string; accountStatus: string }, roles: UserRole[]) {
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, roles, accountStatus: user.accountStatus };
  }

  private assertBootstrapAdminEnabled() {
    const bootstrapAdminEnabled =
      this.configService.get<string>('ALLOW_BOOTSTRAP_ADMIN') === 'true';

    if (!bootstrapAdminEnabled) {
      throw new ForbiddenException(
        'La creación inicial de administrador está deshabilitada para este entorno',
      );
    }
  }
}
