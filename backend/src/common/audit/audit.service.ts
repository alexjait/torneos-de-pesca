import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditPayload = {
  actorUserId?: string;
  actorRole?: string;
  action: string;
  entityName: string;
  entityId: string;
  context?: Record<string, unknown>;
  diffSummary?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(payload: AuditPayload) {
    await this.writeAuditLog(this.prisma, payload);
  }

  async logWithTransaction(
    tx: Prisma.TransactionClient,
    payload: AuditPayload,
  ) {
    await this.writeAuditLog(tx, payload);
  }

  private async writeAuditLog(
    client: PrismaService | Prisma.TransactionClient,
    payload: AuditPayload,
  ) {
    await client.auditLog.create({
      data: {
        actorUserId: payload.actorUserId,
        actorRole: payload.actorRole,
        action: payload.action,
        entityName: payload.entityName,
        entityId: payload.entityId,
        context: payload.context as Prisma.InputJsonValue | undefined,
        diffSummary: payload.diffSummary as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
