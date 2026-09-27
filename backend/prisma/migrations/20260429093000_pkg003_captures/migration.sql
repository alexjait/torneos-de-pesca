-- CreateEnum
CREATE TYPE "CaptureStatus" AS ENUM ('PENDING_VALIDATION', 'APPROVED', 'OBSERVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CaptureSyncStatus" AS ENUM ('ONLINE', 'SYNCED');

-- CreateEnum
CREATE TYPE "CaptureValidationAction" AS ENUM ('APPROVE', 'OBSERVE', 'REJECT');

-- CreateTable
CREATE TABLE "Capture" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "teamId" TEXT,
    "officialId" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceRecordedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "gps" JSONB,
    "observation" TEXT,
    "status" "CaptureStatus" NOT NULL DEFAULT 'PENDING_VALIDATION',
    "syncStatus" "CaptureSyncStatus" NOT NULL DEFAULT 'ONLINE',
    "clientCaptureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureMedia" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureValidation" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "action" "CaptureValidationAction" NOT NULL,
    "reason" TEXT,
    "validatedByUserId" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Capture_clientCaptureId_key" ON "Capture"("clientCaptureId");

-- CreateIndex
CREATE INDEX "Capture_tournamentId_status_capturedAt_idx" ON "Capture"("tournamentId", "status", "capturedAt");

-- CreateIndex
CREATE INDEX "Capture_officialId_createdAt_idx" ON "Capture"("officialId", "createdAt");

-- CreateIndex
CREATE INDEX "Capture_participantId_capturedAt_idx" ON "Capture"("participantId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaptureMedia_storageKey_key" ON "CaptureMedia"("storageKey");

-- CreateIndex
CREATE INDEX "CaptureMedia_captureId_uploadedAt_idx" ON "CaptureMedia"("captureId", "uploadedAt");

-- CreateIndex
CREATE INDEX "CaptureValidation_captureId_validatedAt_idx" ON "CaptureValidation"("captureId", "validatedAt");

-- CreateIndex
CREATE INDEX "CaptureValidation_validatedByUserId_validatedAt_idx" ON "CaptureValidation"("validatedByUserId", "validatedAt");

-- AddForeignKey
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_officialId_fkey" FOREIGN KEY ("officialId") REFERENCES "Official"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureMedia" ADD CONSTRAINT "CaptureMedia_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "Capture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureValidation" ADD CONSTRAINT "CaptureValidation_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "Capture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureValidation" ADD CONSTRAINT "CaptureValidation_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

