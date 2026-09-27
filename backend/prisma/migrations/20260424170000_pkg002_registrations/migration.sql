-- CreateEnum
CREATE TYPE "RegistrationChannel" AS ENUM ('ADMIN', 'SELF_SERVICE');

-- CreateEnum
CREATE TYPE "RegistrationReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "participantId" TEXT,
    "channel" "RegistrationChannel" NOT NULL,
    "reviewStatus" "RegistrationReviewStatus" NOT NULL,
    "applicantFirstName" TEXT NOT NULL,
    "applicantLastName" TEXT NOT NULL,
    "applicantDocumentId" TEXT,
    "applicantEmail" TEXT,
    "applicantPhone" TEXT,
    "acceptedRulesAt" TIMESTAMP(3) NOT NULL,
    "acceptedRulesSnapshot" JSONB,
    "statusLookupTokenHash" TEXT,
    "reviewNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Registration_statusLookupTokenHash_key" ON "Registration"("statusLookupTokenHash");

-- CreateIndex
CREATE INDEX "Registration_tournamentId_reviewStatus_createdAt_idx" ON "Registration"("tournamentId", "reviewStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Registration_tournamentId_channel_createdAt_idx" ON "Registration"("tournamentId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "Registration_participantId_idx" ON "Registration"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_approved_tournament_participant_unique"
ON "Registration"("tournamentId", "participantId")
WHERE "reviewStatus" = 'APPROVED' AND "participantId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Registration_pending_tournament_email_unique"
ON "Registration"("tournamentId", "applicantEmail")
WHERE "reviewStatus" = 'PENDING_REVIEW' AND "applicantEmail" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Registration_pending_tournament_document_unique"
ON "Registration"("tournamentId", "applicantDocumentId")
WHERE "reviewStatus" = 'PENDING_REVIEW' AND "applicantDocumentId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_tournamentId_fkey"
FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
