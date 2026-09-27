import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserData } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { RegistrationsService } from '../application/registrations.service';
import { ApproveRegistrationDto } from '../dto/approve-registration.dto';
import { CreateRegistrationDto } from '../dto/create-registration.dto';
import { ListRegistrationsQueryDto } from '../dto/list-registrations-query.dto';
import { RejectRegistrationDto } from '../dto/reject-registration.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  create(@Body() dto: CreateRegistrationDto, @CurrentUser() user: CurrentUserData) {
    return this.registrationsService.createAdmin(dto, user);
  }

  @Get()
  list(@Query() query: ListRegistrationsQueryDto) {
    return this.registrationsService.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.registrationsService.get(id);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveRegistrationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.registrationsService.approve(id, dto, user);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectRegistrationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.registrationsService.reject(id, dto, user);
  }
}
