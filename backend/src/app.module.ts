import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AuditModule } from './common/audit/audit.module';
import { RolesGuard } from './common/auth/roles.guard';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BoatsModule } from './modules/boats/boats.module';
import { CapturesModule } from './modules/captures/captures.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OfficialsModule } from './modules/officials/officials.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { ReportsExportsModule } from './modules/reports-exports/reports-exports.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { ScoringRankingModule } from './modules/scoring-ranking/scoring-ranking.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { UsersAccessModule } from './modules/users-access/users-access.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuditModule,
    HealthModule,
    NotificationsModule,
    UsersAccessModule,
    AuthModule,
    TournamentsModule,
    ParticipantsModule,
    ScoringRankingModule,
    ReportsExportsModule,
    CapturesModule,
    RegistrationsModule,
    TeamsModule,
    BoatsModule,
    OfficialsModule,
  ],
  providers: [RolesGuard],
})
export class AppModule {}
