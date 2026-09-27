import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './presentation/auth.controller';
import { AuthService } from './application/auth.service';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { UsersAccessModule } from '../users-access/users-access.module';
import { PublicAuthRateLimitGuard } from '../../common/auth/public-auth-rate-limit.guard';
import { AuthSessionService } from './application/auth-session.service';

@Module({
  imports: [
    UsersAccessModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ?? '8h') as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthSessionService, JwtStrategy, PublicAuthRateLimitGuard],
  exports: [JwtModule],
})
export class AuthModule {}
