import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RankingScope, UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserData } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CreateScoreAdjustmentDto } from '../dto/create-score-adjustment.dto';
import { ListScoreAdjustmentsQueryDto } from '../dto/list-score-adjustments-query.dto';
import { RankingQueryDto } from '../dto/ranking-query.dto';
import { RevokeScoreAdjustmentDto } from '../dto/revoke-score-adjustment.dto';
import { ScoringRankingService } from '../application/scoring-ranking.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tournaments/:tournamentId')
export class ScoringRankingController {
  constructor(private readonly scoringRankingService: ScoringRankingService) {}

  @Get('score-adjustments')
  @Roles(UserRole.ADMIN)
  listAdjustments(
    @Param('tournamentId') tournamentId: string,
    @Query() query: ListScoreAdjustmentsQueryDto,
  ) {
    return this.scoringRankingService.listScoreAdjustments(tournamentId, query);
  }

  @Post('score-adjustments')
  @Roles(UserRole.ADMIN)
  createAdjustment(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: CreateScoreAdjustmentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.scoringRankingService.createScoreAdjustment(tournamentId, dto, user);
  }

  @Post('score-adjustments/:adjustmentId/revoke')
  @Roles(UserRole.ADMIN)
  revokeAdjustment(
    @Param('tournamentId') tournamentId: string,
    @Param('adjustmentId') adjustmentId: string,
    @Body() dto: RevokeScoreAdjustmentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.scoringRankingService.revokeScoreAdjustment(
      tournamentId,
      adjustmentId,
      dto.reason,
      user,
    );
  }

  @Get('ranking')
  @Roles(UserRole.ADMIN, UserRole.OFFICIAL, UserRole.PARTICIPANT)
  getRanking(
    @Param('tournamentId') tournamentId: string,
    @Query() query: RankingQueryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.scoringRankingService.getLiveRanking(
      tournamentId,
      query.scope ?? RankingScope.INDIVIDUAL,
      user,
    );
  }

  @Get('ranking/final')
  @Roles(UserRole.ADMIN, UserRole.OFFICIAL, UserRole.PARTICIPANT)
  getFinalRanking(
    @Param('tournamentId') tournamentId: string,
    @Query() query: RankingQueryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.scoringRankingService.getFinalRanking(
      tournamentId,
      query.scope ?? RankingScope.INDIVIDUAL,
      user,
    );
  }
}
