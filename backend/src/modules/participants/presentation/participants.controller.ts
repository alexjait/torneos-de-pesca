import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserData } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { ParticipantsService } from '../application/participants.service';
import { CreateParticipantDto } from '../dto/create-participant.dto';
import { LinkParticipantBoatDto } from '../dto/link-participant-boat.dto';
import { LinkParticipantTeamDto } from '../dto/link-participant-team.dto';
import { UpdateParticipantDto } from '../dto/update-participant.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get()
  list() {
    return this.participantsService.list();
  }

  @Post()
  create(@Body() dto: CreateParticipantDto, @CurrentUser() user: CurrentUserData) {
    return this.participantsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateParticipantDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.participantsService.update(id, dto, user);
  }

  @Post(':id/teams')
  linkTeam(
    @Param('id') id: string,
    @Body() dto: LinkParticipantTeamDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.participantsService.linkTeam(id, dto.teamId, user);
  }

  @Post(':id/boats')
  linkBoat(
    @Param('id') id: string,
    @Body() dto: LinkParticipantBoatDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.participantsService.linkBoat(id, dto.boatId, user);
  }

  @Delete(':id/teams/:linkId')
  unlinkTeam(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.participantsService.unlinkTeam(id, linkId, user);
  }

  @Delete(':id/boats/:linkId')
  unlinkBoat(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.participantsService.unlinkBoat(id, linkId, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.participantsService.softDelete(id, user);
  }
}
