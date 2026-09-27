import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PublicAuthRateLimitGuard } from '../../../common/auth/public-auth-rate-limit.guard';
import { RegistrationsService } from '../application/registrations.service';
import { SelfRegisterDto } from '../dto/self-register.dto';

@UseGuards(PublicAuthRateLimitGuard)
@Controller()
export class PublicRegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post('registrations/self-register')
  selfRegister(@Body() dto: SelfRegisterDto) {
    return this.registrationsService.selfRegister(dto);
  }

  @Get('public/registrations/status/:lookupToken')
  status(@Param('lookupToken') lookupToken: string) {
    return this.registrationsService.publicStatus(lookupToken);
  }
}
