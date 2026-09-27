import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ExportFormat,
  ExportStatus,
  ExportType,
  Prisma,
  RankingScope,
  RankingSnapshotType,
} from '@prisma/client';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { AuditService } from '../../../common/audit/audit.service';
import { CurrentUserData } from '../../../common/auth/current-user.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ScoringRankingService } from '../../scoring-ranking/application/scoring-ranking.service';
import { buildCsvBuffer, buildXlsxBuffer, TabularExport } from './export-file.util';
import { CreateExportDto } from '../dto/create-export.dto';

@Injectable()
export class ReportsExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly scoringRankingService: ScoringRankingService,
  ) {}

  async getRegistrationsReport(tournamentId: string) {
    await this.requireTournament(tournamentId);
    const registrations = await this.prisma.registration.findMany({
      where: { tournamentId },
      include: {
        participant: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return {
      data: registrations.map((registration) => ({
        registrationId: registration.id,
        reviewStatus: registration.reviewStatus,
        participantId: registration.participantId,
        participantName: registration.participant
          ? `${registration.participant.firstName} ${registration.participant.lastName}`.trim()
          : null,
        applicantFirstName: registration.applicantFirstName,
        applicantLastName: registration.applicantLastName,
        applicantEmail: registration.applicantEmail,
        applicantPhone: registration.applicantPhone,
        accountStatus: registration.participant?.user?.accountStatus ?? null,
        createdAt: registration.createdAt,
        reviewedAt: registration.reviewedAt,
      })),
    };
  }

  async getLiveRankingReport(tournamentId: string, scope: RankingScope, user: CurrentUserData) {
    return this.scoringRankingService.getLiveRanking(tournamentId, scope, user);
  }

  async getFinalRankingReport(tournamentId: string, scope: RankingScope, user: CurrentUserData) {
    return this.scoringRankingService.getFinalRanking(tournamentId, scope, user);
  }

  async getCapturesByParticipantReport(tournamentId: string) {
    await this.requireTournament(tournamentId);
    const captures = await this.prisma.capture.findMany({
      where: { tournamentId },
      include: {
        participant: true,
        team: true,
        official: {
          include: { user: true },
        },
      },
      orderBy: [{ participantId: 'asc' }, { capturedAt: 'asc' }, { id: 'asc' }],
    });

    return {
      data: captures.map((capture) => ({
        captureId: capture.id,
        participantId: capture.participantId,
        participantName: `${capture.participant.firstName} ${capture.participant.lastName}`.trim(),
        teamName: capture.team?.name ?? null,
        status: capture.status,
        species: capture.species,
        length: capture.length,
        capturedAt: capture.capturedAt,
        recordedAt: capture.recordedAt,
        officialName: `${capture.official.user.firstName} ${capture.official.user.lastName}`.trim(),
        observation: capture.observation,
      })),
    };
  }

  async getCapturesByTeamReport(tournamentId: string) {
    await this.requireTournament(tournamentId);
    const captures = await this.prisma.capture.findMany({
      where: { tournamentId, teamId: { not: null } },
      include: {
        participant: true,
        team: true,
        official: {
          include: { user: true },
        },
      },
      orderBy: [{ teamId: 'asc' }, { capturedAt: 'asc' }, { id: 'asc' }],
    });

    return {
      data: captures.map((capture) => ({
        captureId: capture.id,
        teamId: capture.teamId,
        teamName: capture.team?.name ?? null,
        participantId: capture.participantId,
        participantName: `${capture.participant.firstName} ${capture.participant.lastName}`.trim(),
        status: capture.status,
        species: capture.species,
        length: capture.length,
        capturedAt: capture.capturedAt,
        officialName: `${capture.official.user.firstName} ${capture.official.user.lastName}`.trim(),
        observation: capture.observation,
      })),
    };
  }

  async getRejectedObservedReport(tournamentId: string) {
    await this.requireTournament(tournamentId);
    const captures = await this.prisma.capture.findMany({
      where: {
        tournamentId,
        status: { in: ['OBSERVED', 'REJECTED'] },
      },
      include: {
        participant: true,
        team: true,
        validations: {
          include: {
            validatedBy: true,
          },
          orderBy: { validatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
    });

    return {
      data: captures.map((capture) => ({
        captureId: capture.id,
        status: capture.status,
        participantId: capture.participantId,
        participantName: `${capture.participant.firstName} ${capture.participant.lastName}`.trim(),
        teamName: capture.team?.name ?? null,
        species: capture.species,
        length: capture.length,
        capturedAt: capture.capturedAt,
        latestReason: capture.validations[0]?.reason ?? null,
        validatedAt: capture.validations[0]?.validatedAt ?? null,
        validatedBy: capture.validations[0]
          ? `${capture.validations[0].validatedBy.firstName} ${capture.validations[0].validatedBy.lastName}`.trim()
          : null,
      })),
    };
  }

  async createExport(tournamentId: string, dto: CreateExportDto, user: CurrentUserData) {
    const tournament = await this.requireTournament(tournamentId);
    const materialized = await this.buildExportDataset(tournament.id, dto, user);
    const timestamp = new Date();
    const extension = dto.format.toLowerCase();
    const fileName = `${slugify(tournament.name)}-${dto.exportType.toLowerCase()}-${timestamp
      .toISOString()
      .replaceAll(':', '-')}.${extension}`;

    try {
      const buffer =
        dto.format === ExportFormat.CSV
          ? buildCsvBuffer(materialized.tabular)
          : buildXlsxBuffer(materialized.tabular, dto.exportType);
      const storageKey = join('exports', tournament.id, fileName);
      const absolutePath = this.resolveStoragePath(storageKey);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, buffer);

      const record = await this.prisma.$transaction(async (tx) => {
        const created = await tx.exportRecord.create({
          data: {
            tournamentId,
            exportType: dto.exportType,
            format: dto.format,
            status: ExportStatus.READY,
            scope: materialized.scope,
            storageKey,
            fileName,
            mimeType: dto.format === ExportFormat.CSV
              ? 'text/csv; charset=utf-8'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            sizeBytes: buffer.length,
            requestedByUserId: user.sub,
            generatedAt: timestamp,
            sourceSnapshotType: materialized.sourceSnapshotType,
            sourceSnapshotVersion: materialized.sourceSnapshotVersion,
          },
        });

        await this.auditService.logWithTransaction(tx, {
          actorUserId: user.sub,
          actorRole: user.roles[0],
          action: 'report.export_generated',
          entityName: 'ExportRecord',
          entityId: created.id,
          context: {
            tournamentId,
            exportType: dto.exportType,
            format: dto.format,
            scope: dto.scope ?? null,
            status: ExportStatus.READY,
          },
        });

        return created;
      });

      return { data: this.serializeExportRecord(record) };
    } catch {
      const failed = await this.prisma.$transaction(async (tx) => {
        const created = await tx.exportRecord.create({
          data: {
            tournamentId,
            exportType: dto.exportType,
            format: dto.format,
            status: ExportStatus.FAILED,
            scope: dto.scope ?? null,
            fileName,
            mimeType: dto.format === ExportFormat.CSV
              ? 'text/csv; charset=utf-8'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            requestedByUserId: user.sub,
            errorCode: 'EXPORT_GENERATION_FAILED',
          },
        });

        await this.auditService.logWithTransaction(tx, {
          actorUserId: user.sub,
          actorRole: user.roles[0],
          action: 'report.export_generated',
          entityName: 'ExportRecord',
          entityId: created.id,
          context: {
            tournamentId,
            exportType: dto.exportType,
            format: dto.format,
            status: created.status,
            errorCode: created.errorCode,
          },
        });

        return created;
      });

      return { data: this.serializeExportRecord(failed) };
    }
  }

  async getExport(id: string) {
    const record = await this.prisma.exportRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Exportacion no encontrada');
    }

    return { data: this.serializeExportRecord(record) };
  }

  async getDownloadableExport(id: string, user: CurrentUserData) {
    const record = await this.prisma.exportRecord.findUnique({
      where: { id },
    });

    if (!record || record.status !== ExportStatus.READY || !record.storageKey) {
      throw new NotFoundException('Exportacion no disponible');
    }

    const absolutePath = this.resolveStoragePath(record.storageKey);
    try {
      await readFile(absolutePath);
    } catch {
      throw new NotFoundException('Archivo de exportacion no disponible');
    }

    await this.auditService.log({
      actorUserId: user.sub,
      actorRole: user.roles[0],
      action: 'report.export_downloaded',
      entityName: 'ExportRecord',
      entityId: record.id,
      context: {
        tournamentId: record.tournamentId,
        exportType: record.exportType,
      },
    });

    return {
      absolutePath,
      fileName: record.fileName,
      mimeType: record.mimeType,
    };
  }

  private async buildExportDataset(
    tournamentId: string,
    dto: CreateExportDto,
    user: CurrentUserData,
  ): Promise<{
    tabular: TabularExport;
    scope: RankingScope | null;
    sourceSnapshotType: RankingSnapshotType | null;
    sourceSnapshotVersion: number | null;
  }> {
    switch (dto.exportType) {
      case ExportType.REGISTRATIONS: {
        const report = await this.getRegistrationsReport(tournamentId);
        return {
          tabular: toTabular(report.data),
          scope: null,
          sourceSnapshotType: null,
          sourceSnapshotVersion: null,
        };
      }
      case ExportType.LIVE_RANKING: {
        const report = await this.getLiveRankingReport(
          tournamentId,
          dto.scope ?? RankingScope.INDIVIDUAL,
          user,
        );
        return {
          tabular: toTabular(report.data.entries),
          scope: report.meta.scope,
          sourceSnapshotType: RankingSnapshotType.LIVE,
          sourceSnapshotVersion: report.meta.version,
        };
      }
      case ExportType.FINAL_RANKING: {
        const report = await this.getFinalRankingReport(
          tournamentId,
          dto.scope ?? RankingScope.INDIVIDUAL,
          user,
        );
        return {
          tabular: toTabular(report.data.entries),
          scope: report.meta.scope,
          sourceSnapshotType: RankingSnapshotType.FINAL,
          sourceSnapshotVersion: report.meta.version,
        };
      }
      case ExportType.CAPTURES_BY_PARTICIPANT: {
        const report = await this.getCapturesByParticipantReport(tournamentId);
        return {
          tabular: toTabular(report.data),
          scope: null,
          sourceSnapshotType: null,
          sourceSnapshotVersion: null,
        };
      }
      case ExportType.CAPTURES_BY_TEAM: {
        const report = await this.getCapturesByTeamReport(tournamentId);
        return {
          tabular: toTabular(report.data),
          scope: RankingScope.TEAM,
          sourceSnapshotType: null,
          sourceSnapshotVersion: null,
        };
      }
      case ExportType.REJECTED_OBSERVED_CAPTURES: {
        const report = await this.getRejectedObservedReport(tournamentId);
        return {
          tabular: toTabular(report.data),
          scope: null,
          sourceSnapshotType: null,
          sourceSnapshotVersion: null,
        };
      }
    }

    throw new NotFoundException('Tipo de exportacion no soportado');
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

  private resolveStoragePath(storageKey: string) {
    const configured = this.configService.get<string>('MEDIA_STORAGE_DIR');
    const root = resolve(configured || join(process.cwd(), 'uploads'));
    return resolve(root, storageKey);
  }

  private serializeExportRecord(record: Prisma.ExportRecordGetPayload<Record<string, never>>) {
    return {
      id: record.id,
      tournamentId: record.tournamentId,
      exportType: record.exportType,
      format: record.format,
      status: record.status,
      fileName: record.fileName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      requestedAt: record.requestedAt,
      generatedAt: record.generatedAt,
      sourceSnapshotType: record.sourceSnapshotType,
      sourceSnapshotVersion: record.sourceSnapshotVersion,
      errorCode: record.errorCode,
      downloadUrl: record.status === ExportStatus.READY ? `/exports/${record.id}/download` : null,
    };
  }
}

function toTabular(rows: Array<Record<string, unknown>>): TabularExport {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 80);
}
