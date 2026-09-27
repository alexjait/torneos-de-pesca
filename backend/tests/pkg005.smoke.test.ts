import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  ExportFormat,
  ExportStatus,
  ExportType,
  RankingScope,
  RankingSnapshotType,
  RegistrationChannel,
  RegistrationReviewStatus,
  ScoreAdjustmentStatus,
  TieBreakerStrategy,
  TournamentStatus,
  UserRole,
} from '@prisma/client';
import { AuditService } from '../src/common/audit/audit.service';
import { CapturesController } from '../src/modules/captures/presentation/captures.controller';
import { RegistrationsService } from '../src/modules/registrations/application/registrations.service';
import { ReportsExportsService } from '../src/modules/reports-exports/application/reports-exports.service';
import { ReportsExportsController } from '../src/modules/reports-exports/presentation/reports-exports.controller';
import { ScoringRankingService } from '../src/modules/scoring-ranking/application/scoring-ranking.service';
import { TournamentsService } from '../src/modules/tournaments/application/tournaments.service';

const adminUser = {
  sub: 'admin-1',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
};

function createResponseDouble() {
  return {
    headers: {} as Record<string, string>,
    sentFile: '' as string | undefined,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    sendFile(path: string) {
      this.sentFile = path;
    },
  };
}

function createAuditAwareTransaction<T extends object>(state: {
  audits: Array<Record<string, unknown>>;
} & T) {
  return {
    ...state,
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.audits.push(data);
        return data;
      },
    },
  };
}

async function testRegistrationApprovalAndRejectionAudit() {
  const audits: Array<Record<string, unknown>> = [];
  const pendingRegistration = {
    id: 'reg-1',
    tournamentId: 'tour-1',
    reviewStatus: RegistrationReviewStatus.PENDING_REVIEW,
    applicantFirstName: 'Ana',
    applicantLastName: 'Lopez',
    applicantDocumentId: '123',
    applicantEmail: 'ana@example.com',
    applicantPhone: '1234',
    acceptedRulesAt: new Date('2026-05-01T10:00:00.000Z'),
    acceptedRulesSnapshot: { tournamentId: 'tour-1' },
    reviewNotes: null,
    reviewedByUserId: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: new Date('2026-05-01T10:00:00.000Z'),
    updatedAt: new Date('2026-05-01T10:00:00.000Z'),
    tournament: { id: 'tour-1', name: 'Torneo Uno', status: TournamentStatus.ACTIVE },
    participant: null,
    reviewedBy: null,
  };
  const participant = {
    id: 'participant-1',
    firstName: 'Ana',
    lastName: 'Lopez',
    phone: '1234',
    documentId: '123',
    enabledToCompete: false,
    userId: 'user-1',
    user: {
      id: 'user-1',
      email: 'ana@example.com',
      firstName: 'Ana',
      lastName: 'Lopez',
      accountStatus: 'ACTIVE',
      deletedAt: null,
      roleAssignments: [{ role: UserRole.PARTICIPANT }],
    },
  };
  const approvedRegistration = {
    ...pendingRegistration,
    participantId: participant.id,
    reviewStatus: RegistrationReviewStatus.APPROVED,
    participant,
    reviewedAt: new Date('2026-05-02T10:00:00.000Z'),
  };
  const rejectedRegistration = {
    ...pendingRegistration,
    reviewStatus: RegistrationReviewStatus.REJECTED,
    rejectionReason: 'Datos incompletos',
    reviewedAt: new Date('2026-05-02T11:00:00.000Z'),
  };

  const tx = createAuditAwareTransaction({
    audits,
    registration: {
      findUnique: async () => pendingRegistration,
      update: async ({ data }: { data: Record<string, unknown> }) =>
        data.reviewStatus === RegistrationReviewStatus.APPROVED
          ? approvedRegistration
          : rejectedRegistration,
    },
    participant: {
      findFirst: async ({ where }: { where: { documentId?: string } }) =>
        where.documentId ? null : participant,
      update: async () => participant,
    },
    user: {
      findUnique: async () => participant.user,
    },
    userRoleAssignment: {
      createMany: async () => ({ count: 0 }),
    },
  });

  const prisma = {
    registration: {
      findUnique: async () => pendingRegistration,
    },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  };
  const service = new RegistrationsService(
    prisma as never,
    { get: () => 'http://localhost:3005' } as never,
    new AuditService(prisma as never),
    {
      sendParticipantRegistrationEmail: async () => {
        throw new Error('No deberia enviar email en este escenario');
      },
    } as never,
  );

  const approved = await service.approve('reg-1', {}, adminUser as never);
  assert.equal(approved.data.review_status, RegistrationReviewStatus.APPROVED);
  assert.equal(
    audits.some((entry) => entry.action === 'registration.approved'),
    true,
  );

  const rejected = await service.reject(
    'reg-1',
    { reason: 'Datos incompletos' },
    adminUser as never,
  );
  assert.equal(rejected.data.review_status, RegistrationReviewStatus.REJECTED);
  assert.equal(
    audits.some((entry) => entry.action === 'registration.rejected'),
    true,
  );
}

async function testTournamentCloseBlocksPendingCaptures() {
  const prisma = {
    tournament: {
      findFirst: async () => ({
        id: 'tour-1',
        status: TournamentStatus.ACTIVE,
        deletedAt: null,
      }),
    },
    capture: {
      count: async () => 1,
    },
  };
  const service = new TournamentsService(
    prisma as never,
    { logWithTransaction: async () => undefined } as never,
    { finalizeTournamentRankingInTransaction: async () => undefined } as never,
  );

  await assert.rejects(
    () => service.close('tour-1', adminUser as never),
    (error: unknown) =>
      error instanceof ConflictException &&
      error.message.includes('capturas pendientes de validacion'),
  );
}

async function testFinalizeRankingAndCloseAudit() {
  const rankingAudits: Array<Record<string, unknown>> = [];
  const finalEntries: Array<Record<string, unknown>> = [];
  let rankingStateUpdate: any = null;

  const rankingTx = createAuditAwareTransaction({
    audits: rankingAudits,
    tournament: {
      findFirst: async () => ({
        id: 'tour-1',
        status: TournamentStatus.ACTIVE,
        deletedAt: null,
      }),
    },
    rankingEntry: {
      findMany: async () => [
        {
          tournamentId: 'tour-1',
          snapshotType: RankingSnapshotType.LIVE,
          scope: RankingScope.INDIVIDUAL,
          version: 3,
          position: 1,
          competitorType: 'PARTICIPANT',
          competitorId: 'participant-1',
          competitorName: 'Ana Lopez',
          totalPoints: 20,
          validPieces: 2,
          totalLength: 90,
          bestCaptureLength: 50,
          distinctSpeciesCount: 2,
          penaltyPoints: 0,
          lastScoringCaptureAt: new Date('2026-05-02T08:30:00.000Z'),
        },
      ],
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        finalEntries.push(...data);
        return { count: data.length };
      },
    },
    tournamentRankingState: {
      upsert: async () => ({
        id: 'state-1',
        tournamentId: 'tour-1',
        liveVersion: 3,
        finalVersion: null,
        dirty: false,
        dirtyReason: null,
        lastCalculatedAt: new Date('2026-05-02T09:00:00.000Z'),
        finalizedAt: null,
        finalizedByUserId: null,
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        rankingStateUpdate = data;
        return data;
      },
    },
  });

  const scoringPrisma = {
    tournament: {
      findFirst: async () => ({
        id: 'tour-1',
        status: TournamentStatus.ACTIVE,
        deletedAt: null,
      }),
    },
    tournamentRankingState: {
      upsert: async () => ({
        id: 'state-1',
        tournamentId: 'tour-1',
        liveVersion: 3,
        finalVersion: null,
        dirty: false,
        dirtyReason: null,
        lastCalculatedAt: new Date('2026-05-02T09:00:00.000Z'),
        finalizedAt: null,
        finalizedByUserId: null,
      }),
    },
    rankingEntry: {
      findMany: async () => [
        {
          tournamentId: 'tour-1',
          snapshotType: RankingSnapshotType.LIVE,
          scope: RankingScope.INDIVIDUAL,
          version: 3,
          position: 1,
          competitorType: 'PARTICIPANT',
          competitorId: 'participant-1',
          competitorName: 'Ana Lopez',
          totalPoints: 20,
          validPieces: 2,
          totalLength: 90,
          bestCaptureLength: 50,
          distinctSpeciesCount: 2,
          penaltyPoints: 0,
          lastScoringCaptureAt: new Date('2026-05-02T08:30:00.000Z'),
        },
      ],
    },
    $transaction: async (callback: (client: typeof rankingTx) => Promise<unknown>) =>
      callback(rankingTx),
  };

  const scoringService = new ScoringRankingService(
    scoringPrisma as never,
    new AuditService(scoringPrisma as never),
  );
  await scoringService.finalizeTournamentRanking('tour-1', adminUser as never);

  assert.equal(finalEntries.length, 1);
  assert.ok(rankingStateUpdate);
  assert.equal(rankingStateUpdate.finalVersion, 1);
  assert.equal(
    rankingAudits.some((entry) => entry.action === 'ranking.finalized'),
    true,
  );

  const closeAudits: Array<Record<string, unknown>> = [];
  let finalizeCalls = 0;
  const closeTx = createAuditAwareTransaction({
    audits: closeAudits,
    tournament: {
      update: async () => ({
        id: 'tour-1',
        status: TournamentStatus.CLOSED,
      }),
    },
  });
  const tournamentsPrisma = {
    tournament: {
      findFirst: async () => ({
        id: 'tour-1',
        status: TournamentStatus.ACTIVE,
        deletedAt: null,
      }),
    },
    capture: {
      count: async () => 0,
    },
    $transaction: async (callback: (client: typeof closeTx) => Promise<unknown>) =>
      callback(closeTx),
  };
  const tournamentsService = new TournamentsService(
    tournamentsPrisma as never,
    new AuditService(tournamentsPrisma as never),
    {
      finalizeTournamentRankingInTransaction: async () => {
        finalizeCalls += 1;
      },
    } as never,
  );

  const closed = await tournamentsService.close('tour-1', adminUser as never);
  assert.equal(closed.data.status, TournamentStatus.CLOSED);
  assert.equal(finalizeCalls, 1);
  assert.equal(
    closeAudits.some((entry) => entry.action === 'tournament.closed'),
    true,
  );
}

async function testExportReadyAndFailedAudit() {
  const tmpRoot = await mkdtemp(join(tmpdir(), 'pkg005-smoke-'));
  const readyAudits: Array<Record<string, unknown>> = [];
  const readyRecords: Array<Record<string, unknown>> = [];
  const readyTx = createAuditAwareTransaction({
    audits: readyAudits,
    exportRecord: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `export-${readyRecords.length + 1}`,
          requestedAt: new Date('2026-05-02T12:00:00.000Z'),
          generatedAt: data.generatedAt ?? null,
          sizeBytes: data.sizeBytes ?? null,
          errorCode: data.errorCode ?? null,
          sourceSnapshotType: data.sourceSnapshotType ?? null,
          sourceSnapshotVersion: data.sourceSnapshotVersion ?? null,
          storageKey: data.storageKey ?? null,
          ...data,
        };
        readyRecords.push(record);
        return record;
      },
    },
  });
  const readyPrisma = {
    tournament: {
      findFirst: async () => ({
        id: 'tour-1',
        name: 'Torneo Uno',
        deletedAt: null,
      }),
    },
    $transaction: async (callback: (client: typeof readyTx) => Promise<unknown>) =>
      callback(readyTx),
  };
  const readyService = new ReportsExportsService(
    readyPrisma as never,
    { get: () => tmpRoot } as never,
    new AuditService(readyPrisma as never),
    {} as never,
  );
  (readyService as any).buildExportDataset = async () => ({
    tabular: {
      headers: ['position', 'competitorName'],
      rows: [{ position: 1, competitorName: 'Ana Lopez' }],
    },
    scope: RankingScope.INDIVIDUAL,
    sourceSnapshotType: RankingSnapshotType.LIVE,
    sourceSnapshotVersion: 4,
  });
  (readyService as any).resolveStoragePath = (storageKey: string) =>
    join(tmpRoot, storageKey);

  const ready = await readyService.createExport(
    'tour-1',
    {
      exportType: ExportType.LIVE_RANKING,
      format: ExportFormat.CSV,
      scope: RankingScope.INDIVIDUAL,
    },
    adminUser as never,
  );
  assert.equal(ready.data.status, ExportStatus.READY);
  assert.equal(
    readyAudits.some(
      (entry) =>
        entry.action === 'report.export_generated' &&
        entry.context &&
        (entry.context as { status?: ExportStatus }).status === ExportStatus.READY,
    ),
    true,
  );

  const failedAudits: Array<Record<string, unknown>> = [];
  const failedTx = createAuditAwareTransaction({
    audits: failedAudits,
    exportRecord: readyTx.exportRecord,
  });
  const failedPrisma = {
    tournament: readyPrisma.tournament,
    $transaction: async (callback: (client: typeof failedTx) => Promise<unknown>) =>
      callback(failedTx),
  };
  const failedService = new ReportsExportsService(
    failedPrisma as never,
    { get: () => tmpRoot } as never,
    new AuditService(failedPrisma as never),
    {} as never,
  );
  (failedService as any).buildExportDataset = async () => ({
    tabular: {
      headers: ['registrationId'],
      rows: [{ registrationId: 'reg-1' }],
    },
    scope: null,
    sourceSnapshotType: null,
    sourceSnapshotVersion: null,
  });
  (failedService as any).resolveStoragePath = () => {
    throw new Error('boom');
  };

  const failed = await failedService.createExport(
    'tour-1',
    {
      exportType: ExportType.REGISTRATIONS,
      format: ExportFormat.XLSX,
    },
    adminUser as never,
  );
  assert.equal(failed.data.status, ExportStatus.FAILED);
  assert.equal(
    failedAudits.some(
      (entry) =>
        entry.action === 'report.export_generated' &&
        entry.context &&
        (entry.context as { status?: ExportStatus }).status === ExportStatus.FAILED,
    ),
    true,
  );

  await rm(tmpRoot, { recursive: true, force: true });
}

async function testPrivateFileHeaders() {
  const exportController = new ReportsExportsController({
    getDownloadableExport: async () => ({
      absolutePath: '/tmp/export.csv',
      fileName: 'export.csv',
      mimeType: 'text/csv; charset=utf-8',
    }),
  } as never);
  const exportResponse = createResponseDouble();
  await exportController.downloadExport(
    'export-1',
    adminUser as never,
    exportResponse as never,
  );
  assert.equal(exportResponse.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(exportResponse.headers['Cache-Control'], 'private, no-store');
  assert.match(
    exportResponse.headers['Content-Disposition'],
    /^attachment; filename="export\.csv"$/,
  );

  const capturesController = new CapturesController({
    getMediaFile: async () => ({
      absolutePath: '/tmp/capture.jpg',
      mimeType: 'image/jpeg',
    }),
  } as never);
  const mediaResponse = createResponseDouble();
  await capturesController.getMedia('media-1', adminUser as never, mediaResponse as never);
  assert.equal(mediaResponse.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(mediaResponse.headers['Cache-Control'], 'private, no-store');
}

async function main() {
  await testRegistrationApprovalAndRejectionAudit();
  await testTournamentCloseBlocksPendingCaptures();
  await testFinalizeRankingAndCloseAudit();
  await testExportReadyAndFailedAudit();
  await testPrivateFileHeaders();
  console.log('PKG-005 smoke checks passed');
}

main().catch((error: unknown) => {
  if (error instanceof NotFoundException) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
