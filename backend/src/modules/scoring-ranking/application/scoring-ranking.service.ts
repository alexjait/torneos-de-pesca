import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RankingScope,
  RankingSnapshotType,
  RegistrationReviewStatus,
  ScoreAdjustmentStatus,
  TieBreakerStrategy,
  TournamentStatus,
  UserRole,
} from '@prisma/client';
import { AuditService } from '../../../common/audit/audit.service';
import { CurrentUserData } from '../../../common/auth/current-user.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RankingIntegrationPort } from '../../captures/application/ranking-integration.port';
import { CreateScoreAdjustmentDto } from '../dto/create-score-adjustment.dto';
import { ListScoreAdjustmentsQueryDto } from '../dto/list-score-adjustments-query.dto';
import { UpdateScoringConfigDto } from '../dto/update-scoring-config.dto';
import { calculateRankings } from './ranking-calculator';

const scoreAdjustmentInclude = {
  participant: true,
  team: true,
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  revokedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} satisfies Prisma.ScoreAdjustmentInclude;

@Injectable()
export class ScoringRankingService implements RankingIntegrationPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getScoringConfig(tournamentId: string) {
    const config = await this.ensureScoringConfig(tournamentId);
    return { data: this.serializeScoringConfig(config) };
  }

  async updateScoringConfig(
    tournamentId: string,
    dto: UpdateScoringConfigDto,
    user: CurrentUserData,
  ) {
    const tournament = await this.requireTournament(tournamentId);
    this.assertTournamentMutable(tournament.status);

    const config = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.tournamentScoringConfig.upsert({
        where: { tournamentId },
        update: {
          pointsPerValidPiece: dto.pointsPerValidPiece,
          largestCaptureBonusPoints: dto.largestCaptureBonusPoints,
          distinctSpeciesPoints: dto.distinctSpeciesPoints,
          tieBreakerStrategy: TieBreakerStrategy.MVP_V1,
          updatedByUserId: user.sub,
        },
        create: {
          tournamentId,
          pointsPerValidPiece: dto.pointsPerValidPiece,
          largestCaptureBonusPoints: dto.largestCaptureBonusPoints,
          distinctSpeciesPoints: dto.distinctSpeciesPoints,
          tieBreakerStrategy: TieBreakerStrategy.MVP_V1,
          updatedByUserId: user.sub,
        },
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          scoringConfig: {
            pointsPerValidPiece: dto.pointsPerValidPiece,
            largestCaptureBonusPoints: dto.largestCaptureBonusPoints,
            distinctSpeciesPoints: dto.distinctSpeciesPoints,
            tieBreakerStrategy: TieBreakerStrategy.MVP_V1,
          } satisfies Prisma.InputJsonValue,
        },
      });

      await this.auditService.logWithTransaction(tx, {
        actorUserId: user.sub,
        actorRole: user.roles[0],
        action: 'scoring.config_updated',
        entityName: 'TournamentScoringConfig',
        entityId: saved.id,
        context: {
          tournamentId,
        },
        diffSummary: {
          pointsPerValidPiece: dto.pointsPerValidPiece,
          largestCaptureBonusPoints: dto.largestCaptureBonusPoints,
          distinctSpeciesPoints: dto.distinctSpeciesPoints,
        },
      });

      return saved;
    });

    await this.safeRecalculateLiveRanking(tournamentId, 'scoring.config_updated', user);
    return { data: this.serializeScoringConfig(config) };
  }

  async listScoreAdjustments(tournamentId: string, query: ListScoreAdjustmentsQueryDto) {
    await this.requireTournament(tournamentId);
    const adjustments = await this.prisma.scoreAdjustment.findMany({
      where: {
        tournamentId,
        status: query.status,
        participantId: query.participantId,
        teamId: query.teamId,
      },
      include: scoreAdjustmentInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return { data: adjustments.map((adjustment) => this.serializeScoreAdjustment(adjustment)) };
  }

  async createScoreAdjustment(
    tournamentId: string,
    dto: CreateScoreAdjustmentDto,
    user: CurrentUserData,
  ) {
    const tournament = await this.requireTournament(tournamentId);
    this.assertTournamentMutable(tournament.status);
    const registration = await this.requireApprovedRegistration(tournamentId, dto.participantId);

    if (dto.teamId) {
      const hasTeam = registration.participant?.teamLinks.some((link) => link.teamId === dto.teamId);
      if (!hasTeam) {
        throw new BadRequestException(
          'El equipo indicado no esta asociado al participante para este torneo',
        );
      }
    }

    const adjustment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.scoreAdjustment.create({
        data: {
          tournamentId,
          participantId: dto.participantId,
          teamId: dto.teamId ?? null,
          pointsDelta: dto.pointsDelta,
          reason: dto.reason.trim(),
          createdByUserId: user.sub,
        },
        include: scoreAdjustmentInclude,
      });

      await this.auditService.logWithTransaction(tx, {
        actorUserId: user.sub,
        actorRole: user.roles[0],
        action: 'scoring.adjustment_created',
        entityName: 'ScoreAdjustment',
        entityId: created.id,
        context: {
          tournamentId,
          participantId: created.participantId,
          teamId: created.teamId,
          pointsDelta: created.pointsDelta,
        },
      });

      return created;
    });

    await this.safeRecalculateLiveRanking(tournamentId, 'scoring.adjustment_created', user);
    return { data: this.serializeScoreAdjustment(adjustment) };
  }

  async revokeScoreAdjustment(
    tournamentId: string,
    adjustmentId: string,
    reason: string | undefined,
    user: CurrentUserData,
  ) {
    const tournament = await this.requireTournament(tournamentId);
    this.assertTournamentMutable(tournament.status);
    const existing = await this.prisma.scoreAdjustment.findFirst({
      where: {
        id: adjustmentId,
        tournamentId,
      },
      include: scoreAdjustmentInclude,
    });

    if (!existing) {
      throw new NotFoundException('Ajuste no encontrado');
    }

    if (existing.status === ScoreAdjustmentStatus.REVOKED) {
      throw new ConflictException('El ajuste ya fue revocado');
    }

    const revoked = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.scoreAdjustment.update({
        where: { id: adjustmentId },
        data: {
          status: ScoreAdjustmentStatus.REVOKED,
          revokedByUserId: user.sub,
          revokedAt: new Date(),
          revokedReason: reason?.trim() || null,
        },
        include: scoreAdjustmentInclude,
      });

      await this.auditService.logWithTransaction(tx, {
        actorUserId: user.sub,
        actorRole: user.roles[0],
        action: 'scoring.adjustment_revoked',
        entityName: 'ScoreAdjustment',
        entityId: updated.id,
        context: {
          tournamentId,
          participantId: updated.participantId,
          teamId: updated.teamId,
          revokedReason: updated.revokedReason,
        },
      });

      return updated;
    });

    await this.safeRecalculateLiveRanking(tournamentId, 'scoring.adjustment_revoked', user);
    return { data: this.serializeScoreAdjustment(revoked) };
  }

  async getLiveRanking(tournamentId: string, scope: RankingScope, user: CurrentUserData) {
    await this.assertCanReadRanking(tournamentId, user);
    let state = await this.ensureRankingState(tournamentId);

    if (state.liveVersion === 0) {
      await this.safeRecalculateLiveRanking(tournamentId, 'ranking.initial_read');
      state = await this.ensureRankingState(tournamentId);
    }

    const entries = state.liveVersion
      ? await this.prisma.rankingEntry.findMany({
          where: {
            tournamentId,
            snapshotType: RankingSnapshotType.LIVE,
            scope,
            version: state.liveVersion,
          },
          orderBy: { position: 'asc' },
        })
      : [];

    return {
      data: {
        entries: entries.map((entry) => this.serializeRankingEntry(entry)),
      },
      meta: {
        scope,
        snapshotType: RankingSnapshotType.LIVE,
        version: state.liveVersion,
        calculatedAt: state.lastCalculatedAt,
        isOfficial: false,
        isStale: state.dirty,
      },
    };
  }

  async getFinalRanking(tournamentId: string, scope: RankingScope, user: CurrentUserData) {
    await this.assertCanReadRanking(tournamentId, user);
    const state = await this.ensureRankingState(tournamentId);
    if (!state.finalVersion) {
      throw new ConflictException('El torneo todavia no tiene un ranking final oficial');
    }

    const entries = await this.prisma.rankingEntry.findMany({
      where: {
        tournamentId,
        snapshotType: RankingSnapshotType.FINAL,
        scope,
        version: state.finalVersion,
      },
      orderBy: { position: 'asc' },
    });

    return {
      data: {
        entries: entries.map((entry) => this.serializeRankingEntry(entry)),
      },
      meta: {
        scope,
        snapshotType: RankingSnapshotType.FINAL,
        version: state.finalVersion,
        calculatedAt: state.finalizedAt,
        isOfficial: true,
        isStale: false,
      },
    };
  }

  async finalizeTournamentRanking(tournamentId: string, user: CurrentUserData) {
    const tournament = await this.requireTournament(tournamentId);
    if (tournament.status === TournamentStatus.CLOSED) {
      throw new ConflictException('El torneo ya fue cerrado');
    }

    let state = await this.ensureRankingState(tournamentId);
    if (state.finalVersion) {
      throw new ConflictException('El torneo ya tiene un ranking final oficial');
    }

    if (state.dirty || state.liveVersion === 0) {
      await this.recalculateLiveRanking(tournamentId, {
        reason: 'ranking.finalize',
        actor: user,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await this.finalizeTournamentRankingInTransaction(tx, tournamentId, user);
    });
  }

  async finalizeTournamentRankingInTransaction(
    tx: Prisma.TransactionClient,
    tournamentId: string,
    user: CurrentUserData,
  ) {
    const tournament = await tx.tournament.findFirst({
      where: {
        id: tournamentId,
        deletedAt: null,
      },
    });

    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }

    if (tournament.status === TournamentStatus.CLOSED) {
      throw new ConflictException('El torneo ya fue cerrado');
    }

    const state = await tx.tournamentRankingState.upsert({
      where: { tournamentId },
      update: {},
      create: { tournamentId },
    });

    if (state.finalVersion) {
      throw new ConflictException('El torneo ya tiene un ranking final oficial');
    }

    const liveEntries = await tx.rankingEntry.findMany({
      where: {
        tournamentId,
        snapshotType: RankingSnapshotType.LIVE,
        version: state.liveVersion,
      },
      orderBy: [{ scope: 'asc' }, { position: 'asc' }],
    });

    const finalizedAt = new Date();
    const finalVersion = (state.finalVersion ?? 0) + 1;

    if (liveEntries.length > 0) {
      await tx.rankingEntry.createMany({
        data: liveEntries.map((entry) => ({
          tournamentId,
          snapshotType: RankingSnapshotType.FINAL,
          scope: entry.scope,
          version: finalVersion,
          position: entry.position,
          competitorType: entry.competitorType,
          competitorId: entry.competitorId,
          competitorName: entry.competitorName,
          totalPoints: entry.totalPoints,
          validPieces: entry.validPieces,
          totalLength: entry.totalLength,
          bestCaptureLength: entry.bestCaptureLength,
          distinctSpeciesCount: entry.distinctSpeciesCount,
          penaltyPoints: entry.penaltyPoints,
          lastScoringCaptureAt: entry.lastScoringCaptureAt,
          calculatedAt: finalizedAt,
        })),
      });
    }

    await tx.tournamentRankingState.update({
      where: { tournamentId },
      data: {
        finalVersion,
        finalizedAt,
        finalizedByUserId: user.sub,
        dirty: false,
        dirtyReason: null,
      },
    });

    await this.auditService.logWithTransaction(tx, {
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'ranking.finalized',
      entityName: 'TournamentRankingState',
      entityId: state.id,
      context: {
        tournamentId,
        liveVersion: state.liveVersion,
        finalVersion,
      },
    });
  }

  async markTournamentPendingRecalculation(tournamentId: string, captureId: string) {
    await this.safeRecalculateLiveRanking(tournamentId, `capture:${captureId}`);
  }

  async recalculateLiveRanking(
    tournamentId: string,
    options?: {
      reason?: string;
      actor?: CurrentUserData;
    },
  ) {
    const tournament = await this.requireTournament(tournamentId);
    const config = await this.ensureScoringConfig(tournamentId, tournament);
    const state = await this.ensureRankingState(tournamentId);

    const [captures, adjustments] = await Promise.all([
      this.prisma.capture.findMany({
        where: {
          tournamentId,
          status: 'APPROVED',
        },
        include: {
          participant: true,
          team: true,
        },
        orderBy: [{ capturedAt: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.scoreAdjustment.findMany({
        where: {
          tournamentId,
          status: ScoreAdjustmentStatus.ACTIVE,
        },
        include: {
          participant: true,
          team: true,
        },
      }),
    ]);

    const calculated = calculateRankings({
      config: {
        pointsPerValidPiece: config.pointsPerValidPiece,
        largestCaptureBonusPoints: config.largestCaptureBonusPoints,
        distinctSpeciesPoints: config.distinctSpeciesPoints,
        tieBreakerStrategy: config.tieBreakerStrategy,
      },
      captures: captures.map((capture) => ({
        id: capture.id,
        participantId: capture.participantId,
        participantName: `${capture.participant.firstName} ${capture.participant.lastName}`.trim(),
        teamId: capture.teamId,
        teamName: capture.team?.name ?? null,
        species: capture.species,
        length: capture.length,
        capturedAt: capture.capturedAt,
      })),
      adjustments: adjustments.map((adjustment) => ({
        id: adjustment.id,
        participantId: adjustment.participantId,
        participantName: `${adjustment.participant.firstName} ${adjustment.participant.lastName}`.trim(),
        teamId: adjustment.teamId,
        teamName: adjustment.team?.name ?? null,
        pointsDelta: adjustment.pointsDelta,
      })),
    });

    const calculatedAt = new Date();
    const nextVersion = state.liveVersion + 1;

    await this.prisma.$transaction(async (tx) => {
      await tx.rankingEntry.deleteMany({
        where: {
          tournamentId,
          snapshotType: RankingSnapshotType.LIVE,
          version: nextVersion,
        },
      });

      const individualEntries = calculated.individual.map((entry, index) => ({
        tournamentId,
        snapshotType: RankingSnapshotType.LIVE,
        scope: RankingScope.INDIVIDUAL,
        version: nextVersion,
        position: index + 1,
        competitorType: entry.competitorType,
        competitorId: entry.competitorId,
        competitorName: entry.competitorName,
        totalPoints: entry.totalPoints,
        validPieces: entry.validPieces,
        totalLength: entry.totalLength,
        bestCaptureLength: entry.bestCaptureLength,
        distinctSpeciesCount: entry.distinctSpeciesCount,
        penaltyPoints: entry.penaltyPoints,
        lastScoringCaptureAt: entry.lastScoringCaptureAt,
        calculatedAt,
      }));

      const teamEntries = calculated.team.map((entry, index) => ({
        tournamentId,
        snapshotType: RankingSnapshotType.LIVE,
        scope: RankingScope.TEAM,
        version: nextVersion,
        position: index + 1,
        competitorType: entry.competitorType,
        competitorId: entry.competitorId,
        competitorName: entry.competitorName,
        totalPoints: entry.totalPoints,
        validPieces: entry.validPieces,
        totalLength: entry.totalLength,
        bestCaptureLength: entry.bestCaptureLength,
        distinctSpeciesCount: entry.distinctSpeciesCount,
        penaltyPoints: entry.penaltyPoints,
        lastScoringCaptureAt: entry.lastScoringCaptureAt,
        calculatedAt,
      }));

      if (individualEntries.length > 0) {
        await tx.rankingEntry.createMany({ data: individualEntries });
      }

      if (teamEntries.length > 0) {
        await tx.rankingEntry.createMany({ data: teamEntries });
      }

      await tx.tournamentRankingState.update({
        where: { tournamentId },
        data: {
          liveVersion: nextVersion,
          lastCalculatedAt: calculatedAt,
          dirty: false,
          dirtyReason: null,
        },
      });
    });

    await this.auditService.log({
      actorUserId: options?.actor?.sub,
      actorRole: options?.actor?.roles[0],
      action: 'ranking.live_recalculated',
      entityName: 'TournamentRankingState',
      entityId: state.id,
      context: {
        tournamentId,
        version: nextVersion,
        reason: options?.reason ?? null,
      },
    });
  }

  private async safeRecalculateLiveRanking(
    tournamentId: string,
    reason: string,
    user?: CurrentUserData,
  ) {
    try {
      await this.recalculateLiveRanking(tournamentId, { reason, actor: user });
    } catch {
      await this.prisma.tournamentRankingState.upsert({
        where: { tournamentId },
        update: {
          dirty: true,
          dirtyReason: reason,
        },
        create: {
          tournamentId,
          dirty: true,
          dirtyReason: reason,
        },
      });
    }
  }

  private async requireTournament(tournamentId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        deletedAt: null,
      },
    });

    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }

    return tournament;
  }

  private async ensureScoringConfig(
    tournamentId: string,
    tournament?: Awaited<ReturnType<ScoringRankingService['requireTournament']>>,
  ) {
    const existing = await this.prisma.tournamentScoringConfig.findUnique({
      where: { tournamentId },
    });

    if (existing) {
      return existing;
    }

    const sourceTournament = tournament ?? (await this.requireTournament(tournamentId));
    const fallbackConfig = this.extractLegacyScoringConfig(sourceTournament.scoringConfig);

    return this.prisma.tournamentScoringConfig.create({
      data: {
        tournamentId,
        pointsPerValidPiece: fallbackConfig.pointsPerValidPiece,
        largestCaptureBonusPoints: fallbackConfig.largestCaptureBonusPoints,
        distinctSpeciesPoints: fallbackConfig.distinctSpeciesPoints,
        tieBreakerStrategy: TieBreakerStrategy.MVP_V1,
      },
    });
  }

  private async ensureRankingState(tournamentId: string) {
    await this.requireTournament(tournamentId);
    return this.prisma.tournamentRankingState.upsert({
      where: { tournamentId },
      update: {},
      create: { tournamentId },
    });
  }

  private async assertCanReadRanking(tournamentId: string, user: CurrentUserData) {
    if (user.roles.includes(UserRole.ADMIN)) {
      return;
    }

    if (user.roles.includes(UserRole.OFFICIAL)) {
      const official = await this.prisma.official.findFirst({
        where: {
          userId: user.sub,
          deletedAt: null,
          tournamentAssignments: {
            some: {
              tournamentId,
            },
          },
        },
      });

      if (!official) {
        throw new ForbiddenException('No tenes acceso a ese ranking');
      }

      return;
    }

    const participant = await this.prisma.participant.findFirst({
      where: {
        userId: user.sub,
        deletedAt: null,
        registrations: {
          some: {
            tournamentId,
            reviewStatus: RegistrationReviewStatus.APPROVED,
          },
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException('No tenes acceso a ese ranking');
    }
  }

  private async requireApprovedRegistration(tournamentId: string, participantId: string) {
    const registration = await this.prisma.registration.findFirst({
      where: {
        tournamentId,
        participantId,
        reviewStatus: RegistrationReviewStatus.APPROVED,
        participant: {
          deletedAt: null,
        },
      },
      include: {
        participant: {
          include: {
            teamLinks: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!registration?.participant) {
      throw new BadRequestException(
        'El participante debe tener una inscripcion aprobada para este torneo',
      );
    }

    return registration;
  }

  private extractLegacyScoringConfig(raw: Prisma.JsonValue | null) {
    const source =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};

    return {
      pointsPerValidPiece: this.normalizeNonNegativeInt(source.pointsPerValidPiece),
      largestCaptureBonusPoints: this.normalizeNonNegativeInt(
        source.largestCaptureBonusPoints,
      ),
      distinctSpeciesPoints: this.normalizeNonNegativeInt(source.distinctSpeciesPoints),
    };
  }

  private normalizeNonNegativeInt(value: unknown) {
    return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
  }

  private assertTournamentMutable(status: TournamentStatus) {
    if (status === TournamentStatus.CLOSED) {
      throw new ConflictException(
        'El torneo ya fue cerrado y no admite cambios de scoring ni ajustes manuales',
      );
    }
  }

  private serializeScoringConfig(config: {
    tournamentId: string;
    pointsPerValidPiece: number;
    largestCaptureBonusPoints: number;
    distinctSpeciesPoints: number;
    tieBreakerStrategy: TieBreakerStrategy;
    updatedAt: Date;
    updatedByUserId: string | null;
  }) {
    return {
      tournamentId: config.tournamentId,
      pointsPerValidPiece: config.pointsPerValidPiece,
      largestCaptureBonusPoints: config.largestCaptureBonusPoints,
      distinctSpeciesPoints: config.distinctSpeciesPoints,
      tieBreakerStrategy: config.tieBreakerStrategy,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedByUserId ? { id: config.updatedByUserId } : null,
    };
  }

  private serializeScoreAdjustment(
    adjustment: Prisma.ScoreAdjustmentGetPayload<{ include: typeof scoreAdjustmentInclude }>,
  ) {
    return {
      id: adjustment.id,
      tournamentId: adjustment.tournamentId,
      participantId: adjustment.participantId,
      participantName: `${adjustment.participant.firstName} ${adjustment.participant.lastName}`.trim(),
      teamId: adjustment.teamId,
      teamName: adjustment.team?.name ?? null,
      pointsDelta: adjustment.pointsDelta,
      reason: adjustment.reason,
      status: adjustment.status,
      createdAt: adjustment.createdAt,
      createdBy: adjustment.createdBy,
      revokedAt: adjustment.revokedAt,
      revokedBy: adjustment.revokedBy,
      revokedReason: adjustment.revokedReason,
    };
  }

  private serializeRankingEntry(
    entry: Pick<
      Prisma.RankingEntryGetPayload<Record<string, never>>,
      | 'position'
      | 'competitorType'
      | 'competitorId'
      | 'competitorName'
      | 'totalPoints'
      | 'validPieces'
      | 'totalLength'
      | 'bestCaptureLength'
      | 'distinctSpeciesCount'
      | 'penaltyPoints'
      | 'lastScoringCaptureAt'
    >,
  ) {
    return {
      position: entry.position,
      competitorType: entry.competitorType,
      competitorId: entry.competitorId,
      competitorName: entry.competitorName,
      totalPoints: entry.totalPoints,
      validPieces: entry.validPieces,
      totalLength: entry.totalLength,
      bestCaptureLength: entry.bestCaptureLength,
      distinctSpeciesCount: entry.distinctSpeciesCount,
      penaltyPoints: entry.penaltyPoints,
      lastScoringCaptureAt: entry.lastScoringCaptureAt,
    };
  }
}
