import { Module } from '@nestjs/common';
import { PublicAuthRateLimitGuard } from '../../common/auth/public-auth-rate-limit.guard';
import { RegistrationsService } from './application/registrations.service';
import { PublicRegistrationsController } from './presentation/public-registrations.controller';
import { RegistrationsController } from './presentation/registrations.controller';

@Module({
  controllers: [RegistrationsController, PublicRegistrationsController],
  providers: [RegistrationsService, PublicAuthRateLimitGuard],
})
export class RegistrationsModule {}
