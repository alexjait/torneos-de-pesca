import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { RankingScope, UserRole } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser, CurrentUserData } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { RankingQueryDto } from '../../scoring-ranking/dto/ranking-query.dto';
import { ReportsExportsService } from '../application/reports-exports.service';
import { CreateExportDto } from '../dto/create-export.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller()
export class ReportsExportsController {
  constructor(private readonly reportsExportsService: ReportsExportsService) {}

  @Get('tournaments/:tournamentId/reports/registrations')
  getRegistrations(@Param('tournamentId') tournamentId: string) {
    return this.reportsExportsService.getRegistrationsReport(tournamentId);
  }

  @Get('tournaments/:tournamentId/reports/live-ranking')
  getLiveRanking(
    @Param('tournamentId') tournamentId: string,
    @Query() query: RankingQueryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reportsExportsService.getLiveRankingReport(
      tournamentId,
      query.scope ?? RankingScope.INDIVIDUAL,
      user,
    );
  }

  @Get('tournaments/:tournamentId/reports/final-ranking')
  getFinalRanking(
    @Param('tournamentId') tournamentId: string,
    @Query() query: RankingQueryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reportsExportsService.getFinalRankingReport(
      tournamentId,
      query.scope ?? RankingScope.INDIVIDUAL,
      user,
    );
  }

  @Get('tournaments/:tournamentId/reports/captures-by-participant')
  getCapturesByParticipant(@Param('tournamentId') tournamentId: string) {
    return this.reportsExportsService.getCapturesByParticipantReport(tournamentId);
  }

  @Get('tournaments/:tournamentId/reports/captures-by-team')
  getCapturesByTeam(@Param('tournamentId') tournamentId: string) {
    return this.reportsExportsService.getCapturesByTeamReport(tournamentId);
  }

  @Get('tournaments/:tournamentId/reports/rejected-observed')
  getRejectedObserved(@Param('tournamentId') tournamentId: string) {
    return this.reportsExportsService.getRejectedObservedReport(tournamentId);
  }

  @Post('tournaments/:tournamentId/exports')
  createExport(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: CreateExportDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reportsExportsService.createExport(tournamentId, dto, user);
  }

  @Get('exports/:id')
  getExport(@Param('id') id: string) {
    return this.reportsExportsService.getExport(id);
  }

  @Get('exports/:id/download')
  async downloadExport(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Res() response: Response,
  ) {
    const file = await this.reportsExportsService.getDownloadableExport(id, user);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    response.sendFile(file.absolutePath);
  }
}
