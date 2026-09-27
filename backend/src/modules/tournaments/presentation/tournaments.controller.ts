import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserData } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { TournamentsService } from '../application/tournaments.service';
import { UpdateTournamentScheduleDto } from '../dto/update-tournament-schedule.dto';
import { UpdateTournamentScoringDto } from '../dto/update-tournament-scoring.dto';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  list() {
    return this.tournamentsService.list();
  }

  @Post()
  create(@Body() dto: CreateTournamentDto, @CurrentUser() user: CurrentUserData) {
    return this.tournamentsService.create(dto, user);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tournamentsService.get(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tournamentsService.update(id, dto, user);
  }

  @Patch(':id/schedule')
  updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentScheduleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tournamentsService.updateSchedule(id, dto, user);
  }

  @Patch(':id/scoring')
  updateScoring(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentScoringDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tournamentsService.updateScoring(id, dto, user);
  }

  @Get(':id/scoring')
  getScoring(@Param('id') id: string) {
    return this.tournamentsService.getScoring(id);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.tournamentsService.close(id, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.tournamentsService.softDelete(id, user);
  }
}
