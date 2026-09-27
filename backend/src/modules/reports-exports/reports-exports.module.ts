import { Module } from '@nestjs/common';
import { ScoringRankingModule } from '../scoring-ranking/scoring-ranking.module';
import { ReportsExportsService } from './application/reports-exports.service';
import { ReportsExportsController } from './presentation/reports-exports.controller';

@Module({
  imports: [ScoringRankingModule],
  controllers: [ReportsExportsController],
  providers: [ReportsExportsService],
  exports: [ReportsExportsService],
})
export class ReportsExportsModule {}
