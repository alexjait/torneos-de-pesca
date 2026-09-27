import { Controller, Get, UseGuards } from '@nestjs/common';
import { PublicAuthRateLimitGuard } from '../../../common/auth/public-auth-rate-limit.guard';
import { TournamentsService } from '../application/tournaments.service';

@UseGuards(PublicAuthRateLimitGuard)
@Controller()
export class PublicTournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get('public/tournaments/registration-options')
  listRegistrationOptions() {
    return this.tournamentsService.listPublicRegistrationOptions();
  }
}
