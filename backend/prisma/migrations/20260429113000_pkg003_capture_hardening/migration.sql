-- DropIndex
DROP INDEX "Capture_clientCaptureId_key";

-- AlterTable
ALTER TABLE "Capture" ALTER COLUMN "clientCaptureId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Capture_tournamentId_officialId_clientCaptureId_key" ON "Capture"("tournamentId", "officialId", "clientCaptureId");

