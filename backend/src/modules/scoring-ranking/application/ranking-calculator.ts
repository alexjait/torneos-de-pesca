import {
  RankingCompetitorType,
  RankingScope,
  TieBreakerStrategy,
} from '@prisma/client';

export type ScoringConfigInput = {
  pointsPerValidPiece: number;
  largestCaptureBonusPoints: number;
  distinctSpeciesPoints: number;
  tieBreakerStrategy: TieBreakerStrategy;
};

export type ApprovedCaptureInput = {
  id: string;
  participantId: string;
  participantName: string;
  teamId: string | null;
  teamName: string | null;
  species: string;
  length: number;
  capturedAt: Date;
};

export type ScoreAdjustmentInput = {
  id: string;
  participantId: string;
  participantName: string;
  teamId: string | null;
  teamName: string | null;
  pointsDelta: number;
};

export type CalculatedRankingEntry = {
  scope: RankingScope;
  competitorType: RankingCompetitorType;
  competitorId: string;
  competitorName: string;
  totalPoints: number;
  validPieces: number;
  totalLength: number;
  bestCaptureLength: number;
  distinctSpeciesCount: number;
  penaltyPoints: number;
  lastScoringCaptureAt: Date | null;
};

type Aggregate = {
  scope: RankingScope;
  competitorType: RankingCompetitorType;
  competitorId: string;
  competitorName: string;
  validPieces: number;
  totalLength: number;
  bestCaptureLength: number;
  distinctSpecies: Set<string>;
  penaltyPoints: number;
  lastScoringCaptureAt: Date | null;
};

export function calculateRankings(input: {
  config: ScoringConfigInput;
  captures: ApprovedCaptureInput[];
  adjustments: ScoreAdjustmentInput[];
}) {
  return {
    individual: buildScopeRanking(RankingScope.INDIVIDUAL, input.captures, input.adjustments, input.config),
    team: buildScopeRanking(RankingScope.TEAM, input.captures, input.adjustments, input.config),
  };
}

function buildScopeRanking(
  scope: RankingScope,
  captures: ApprovedCaptureInput[],
  adjustments: ScoreAdjustmentInput[],
  config: ScoringConfigInput,
): CalculatedRankingEntry[] {
  const aggregates = new Map<string, Aggregate>();

  for (const capture of captures) {
    if (scope === RankingScope.TEAM && !capture.teamId) {
      continue;
    }

    const competitorId = scope === RankingScope.INDIVIDUAL ? capture.participantId : capture.teamId!;
    const competitorName =
      scope === RankingScope.INDIVIDUAL ? capture.participantName : capture.teamName ?? 'Equipo';
    const competitorType =
      scope === RankingScope.INDIVIDUAL
        ? RankingCompetitorType.PARTICIPANT
        : RankingCompetitorType.TEAM;

    const aggregate =
      aggregates.get(competitorId) ??
      createAggregate(scope, competitorType, competitorId, competitorName);

    aggregate.validPieces += 1;
    aggregate.totalLength += capture.length;
    aggregate.bestCaptureLength = Math.max(aggregate.bestCaptureLength, capture.length);
    aggregate.distinctSpecies.add(normalizeSpecies(capture.species));
    if (!aggregate.lastScoringCaptureAt || capture.capturedAt > aggregate.lastScoringCaptureAt) {
      aggregate.lastScoringCaptureAt = capture.capturedAt;
    }

    aggregates.set(competitorId, aggregate);
  }

  for (const adjustment of adjustments) {
    if (scope === RankingScope.TEAM && !adjustment.teamId) {
      continue;
    }

    const competitorId = scope === RankingScope.INDIVIDUAL ? adjustment.participantId : adjustment.teamId!;
    const competitorName =
      scope === RankingScope.INDIVIDUAL
        ? adjustment.participantName
        : adjustment.teamName ?? 'Equipo';
    const competitorType =
      scope === RankingScope.INDIVIDUAL
        ? RankingCompetitorType.PARTICIPANT
        : RankingCompetitorType.TEAM;

    const aggregate =
      aggregates.get(competitorId) ??
      createAggregate(scope, competitorType, competitorId, competitorName);

    aggregate.penaltyPoints += adjustment.pointsDelta;
    aggregates.set(competitorId, aggregate);
  }

  const entries = Array.from(aggregates.values()).map((aggregate) => ({
    scope,
    competitorType: aggregate.competitorType,
    competitorId: aggregate.competitorId,
    competitorName: aggregate.competitorName,
    validPieces: aggregate.validPieces,
    totalLength: roundLength(aggregate.totalLength),
    bestCaptureLength: roundLength(aggregate.bestCaptureLength),
    distinctSpeciesCount: aggregate.distinctSpecies.size,
    penaltyPoints: aggregate.penaltyPoints,
    lastScoringCaptureAt: aggregate.lastScoringCaptureAt,
    totalPoints:
      aggregate.validPieces * config.pointsPerValidPiece +
      aggregate.distinctSpecies.size * config.distinctSpeciesPoints +
      aggregate.penaltyPoints,
  }));

  const bestCaptureAcrossScope = Math.max(...entries.map((entry) => entry.bestCaptureLength), 0);
  if (bestCaptureAcrossScope > 0 && config.largestCaptureBonusPoints > 0) {
    for (const entry of entries) {
      if (entry.bestCaptureLength === bestCaptureAcrossScope) {
        entry.totalPoints += config.largestCaptureBonusPoints;
      }
    }
  }

  return applyTieBreakerSort(entries, config.tieBreakerStrategy);
}

function createAggregate(
  scope: RankingScope,
  competitorType: RankingCompetitorType,
  competitorId: string,
  competitorName: string,
): Aggregate {
  return {
    scope,
    competitorType,
    competitorId,
    competitorName,
    validPieces: 0,
    totalLength: 0,
    bestCaptureLength: 0,
    distinctSpecies: new Set<string>(),
    penaltyPoints: 0,
    lastScoringCaptureAt: null,
  };
}

function applyTieBreakerSort(
  entries: CalculatedRankingEntry[],
  strategy: TieBreakerStrategy,
) {
  if (strategy !== TieBreakerStrategy.MVP_V1) {
    return entries;
  }

  return entries.sort((left, right) => {
    if (right.totalPoints !== left.totalPoints) {
      return right.totalPoints - left.totalPoints;
    }

    if (right.bestCaptureLength !== left.bestCaptureLength) {
      return right.bestCaptureLength - left.bestCaptureLength;
    }

    if (right.validPieces !== left.validPieces) {
      return right.validPieces - left.validPieces;
    }

    const leftTime = left.lastScoringCaptureAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = right.lastScoringCaptureAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.competitorName.localeCompare(right.competitorName, 'es');
  });
}

function normalizeSpecies(species: string) {
  return species.trim().toLowerCase();
}

function roundLength(value: number) {
  return Number(value.toFixed(2));
}
