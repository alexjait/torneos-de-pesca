export abstract class RankingIntegrationPort {
  abstract markTournamentPendingRecalculation(
    tournamentId: string,
    captureId: string,
  ): Promise<void>;
}
