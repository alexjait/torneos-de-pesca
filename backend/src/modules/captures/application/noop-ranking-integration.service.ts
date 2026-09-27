import { Injectable } from '@nestjs/common';
import { RankingIntegrationPort } from './ranking-integration.port';

@Injectable()
export class NoopRankingIntegrationService implements RankingIntegrationPort {
  async markTournamentPendingRecalculation(
    _tournamentId: string,
    _captureId: string,
  ): Promise<void> {}
}
