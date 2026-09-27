import { Module } from '@nestjs/common';
import { ScoringRankingModule } from '../scoring-ranking/scoring-ranking.module';
import { TournamentsService } from './application/tournaments.service';
import { PublicTournamentsController } from './presentation/public-tournaments.controller';
import { TournamentsController } from './presentation/tournaments.controller';

@Module({
  imports: [ScoringRankingModule],
  controllers: [TournamentsController, PublicTournamentsController],
  providers: [TournamentsService],
})
export class TournamentsModule {}
