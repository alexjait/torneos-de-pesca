import { Module } from '@nestjs/common';
import { CapturesService } from './application/captures.service';
import { RankingIntegrationPort } from './application/ranking-integration.port';
import { ScoringRankingModule } from '../scoring-ranking/scoring-ranking.module';
import { ScoringRankingService } from '../scoring-ranking/application/scoring-ranking.service';
import { CapturesController } from './presentation/captures.controller';

@Module({
  imports: [ScoringRankingModule],
  controllers: [CapturesController],
  providers: [
    CapturesService,
    {
      provide: RankingIntegrationPort,
      useExisting: ScoringRankingService,
    },
  ],
})
export class CapturesModule {}
