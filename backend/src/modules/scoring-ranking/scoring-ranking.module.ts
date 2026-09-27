import { Module } from '@nestjs/common';
import { ScoringRankingService } from './application/scoring-ranking.service';
import { ScoringRankingController } from './presentation/scoring-ranking.controller';

@Module({
  controllers: [ScoringRankingController],
  providers: [ScoringRankingService],
  exports: [ScoringRankingService],
})
export class ScoringRankingModule {}
