import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { generateOpaqueToken, hashOpaqueToken } from '../../../common/utils/token.util';

type AuthSessionClient = Pick<Prisma.TransactionClient, 'authSession'>;

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string) {
    return this.createWithClient(this.prisma, userId);
  }

  async rotate(rawToken: string) {
    const tokenHash = hashOpaqueToken(rawToken);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.authSession.findFirst({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!current) {
        throw new UnauthorizedException('Sesion invalida o expirada');
      }

      const now = new Date();
      const revoked = await tx.authSession.updateMany({
        where: {
          id: current.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now, lastUsedAt: now },
      });
      if (revoked.count !== 1) {
        throw new UnauthorizedException('Sesion invalida o expirada');
      }

      return this.createWithClient(tx, current.userId);
    });
  }

  async revoke(rawToken: string | undefined) {
    if (!rawToken) {
      return null;
    }

    const session = await this.prisma.authSession.findFirst({
      where: { tokenHash: hashOpaqueToken(rawToken), revokedAt: null },
    });
    if (session) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      return session;
    }
    return null;
  }

  private async createWithClient(client: AuthSessionClient, userId: string) {
    const rawToken = generateOpaqueToken();
    const session = await client.authSession.create({
      data: {
        userId,
        tokenHash: hashOpaqueToken(rawToken),
        expiresAt: new Date(Date.now() + this.refreshDurationMs()),
      },
    });

    return { rawToken, session };
  }

  private refreshDurationMs() {
    const value = this.configService.getOrThrow<string>('AUTH_REFRESH_EXPIRES_IN');
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
      throw new Error('AUTH_REFRESH_EXPIRES_IN debe usar formato <numero><s|m|h|d>');
    }

    const amount = Number(match[1]);
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
    if (!unitMs) {
      throw new Error('AUTH_REFRESH_EXPIRES_IN debe usar una unidad valida');
    }
    return amount * unitMs;
  }
}
