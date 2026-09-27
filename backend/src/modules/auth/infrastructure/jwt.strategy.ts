import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AccountStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersAccessService } from '../../users-access/application/users-access.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersAccessService: UsersAccessService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    roles: string[];
    accountStatus: string;
  }) {
    const user = await this.usersAccessService.getUserForActiveSession(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Sesion invalida o expirada');
    }

    return {
      sub: user.id,
      email: user.email,
      roles: user.roleAssignments.map((roleAssignment) => roleAssignment.role),
      accountStatus: AccountStatus.ACTIVE,
    };
  }
}
