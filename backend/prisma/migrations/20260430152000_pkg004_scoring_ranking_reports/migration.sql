-- PKG-004 is generated against the current database state because
-- earlier migrations already have shadow-db drift outside this slice.

CREATE TYPE "TieBreakerStrategy" AS ENUM ('MVP_V1');

CREATE TYPE "ScoreAdjustmentStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TYPE "RankingSnapshotType" AS ENUM ('LIVE', 'FINAL');

CREATE TYPE "RankingScope" AS ENUM ('INDIVIDUAL', 'TEAM');

CREATE TYPE "RankingCompetitorType" AS ENUM ('PARTICIPANT', 'TEAM');

CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'XLSX');

CREATE TYPE "ExportStatus" AS ENUM ('READY', 'FAILED');

CREATE TYPE "ExportType" AS ENUM (
    'REGISTRATIONS',
    'LIVE_RANKING',
    'FINAL_RANKING',
    'CAPTURES_BY_PARTICIPANT',
    'CAPTURES_BY_TEAM',
    'REJECTED_OBSERVED_CAPTURES'
);

CREATE TABLE "TournamentScoringConfig" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "pointsPerValidPiece" INTEGER NOT NULL,
    "largestCaptureBonusPoints" INTEGER NOT NULL,
    "distinctSpeciesPoints" INTEGER NOT NULL,
    "tieBreakerStrategy" "TieBreakerStrategy" NOT NULL DEFAULT 'MVP_V1',
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TournamentScoringConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScoreAdjustment" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "teamId" TEXT,
    "pointsDelta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ScoreAdjustmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    CONSTRAINT "ScoreAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentRankingState" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "liveVersion" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3),
    "dirty" BOOLEAN NOT NULL DEFAULT false,
    "dirtyReason" TEXT,
    "finalVersion" INTEGER,
    "finalizedAt" TIMESTAMP(3),
    "finalizedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TournamentRankingState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RankingEntry" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "snapshotType" "RankingSnapshotType" NOT NULL,
    "scope" "RankingScope" NOT NULL,
    "version" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "competitorType" "RankingCompetitorType" NOT NULL,
    "competitorId" TEXT NOT NULL,
    "competitorName" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "validPieces" INTEGER NOT NULL,
    "totalLength" DOUBLE PRECISION NOT NULL,
    "bestCaptureLength" DOUBLE PRECISION NOT NULL,
    "distinctSpeciesCount" INTEGER NOT NULL,
    "penaltyPoints" INTEGER NOT NULL,
    "lastScoringCaptureAt" TIMESTAMP(3),
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RankingEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExportRecord" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "exportType" "ExportType" NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" "ExportStatus" NOT NULL,
    "scope" "RankingScope",
    "storageKey" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "requestedByUserId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedAt" TIMESTAMP(3),
    "sourceSnapshotType" "RankingSnapshotType",
    "sourceSnapshotVersion" INTEGER,
    "errorCode" TEXT,
    CONSTRAINT "ExportRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentScoringConfig_tournamentId_key"
ON "TournamentScoringConfig"("tournamentId");

CREATE INDEX "ScoreAdjustment_tournamentId_status_createdAt_idx"
ON "ScoreAdjustment"("tournamentId", "status", "createdAt");

CREATE INDEX "ScoreAdjustment_participantId_status_createdAt_idx"
ON "ScoreAdjustment"("participantId", "status", "createdAt");

CREATE INDEX "ScoreAdjustment_teamId_status_createdAt_idx"
ON "ScoreAdjustment"("teamId", "status", "createdAt");

CREATE UNIQUE INDEX "TournamentRankingState_tournamentId_key"
ON "TournamentRankingState"("tournamentId");

CREATE INDEX "RankingEntry_tournamentId_snapshotType_scope_version_positi_idx"
ON "RankingEntry"("tournamentId", "snapshotType", "scope", "version", "position");

CREATE UNIQUE INDEX "RankingEntry_tournamentId_snapshotType_scope_version_compet_key"
ON "RankingEntry"("tournamentId", "snapshotType", "scope", "version", "competitorId");

CREATE INDEX "ExportRecord_tournamentId_requestedAt_idx"
ON "ExportRecord"("tournamentId", "requestedAt");

CREATE INDEX "ExportRecord_requestedByUserId_requestedAt_idx"
ON "ExportRecord"("requestedByUserId", "requestedAt");

ALTER TABLE "TournamentScoringConfig"
ADD CONSTRAINT "TournamentScoringConfig_tournamentId_fkey"
FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentScoringConfig"
ADD CONSTRAINT "TournamentScoringConfig_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScoreAdjustment"
ADD CONSTRAINT "ScoreAdjustment_tournamentId_fkey"
FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScoreAdjustment"
ADD CONSTRAINT "ScoreAdjustment_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "Participant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScoreAdjustment"
ADD CONSTRAINT "ScoreAdjustment_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScoreAdjustment"
ADD CONSTRAINT "ScoreAdjustment_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScoreAdjustment"
ADD CONSTRAINT "ScoreAdjustment_revokedByUserId_fkey"
FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TournamentRankingState"
ADD CONSTRAINT "TournamentRankingState_tournamentId_fkey"
FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentRankingState"
ADD CONSTRAINT "TournamentRankingState_finalizedByUserId_fkey"
FOREIGN KEY ("finalizedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RankingEntry"
ADD CONSTRAINT "RankingEntry_tournamentId_fkey"
FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExportRecord"
ADD CONSTRAINT "ExportRecord_tournamentId_fkey"
FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExportRecord"
ADD CONSTRAINT "ExportRecord_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
