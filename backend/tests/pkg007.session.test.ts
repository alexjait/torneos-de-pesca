import assert from 'node:assert/strict';
import { validateEnv } from '../src/config/env.validation';
import { PublicAuthRateLimitGuard } from '../src/common/auth/public-auth-rate-limit.guard';
import { AuthService } from '../src/modules/auth/application/auth.service';
import { AuthSessionService } from '../src/modules/auth/application/auth-session.service';
import { readRefreshToken } from '../src/modules/auth/infrastructure/auth-cookie';

function baseEnv() {
  return {
    DATABASE_URL: 'postgresql://localhost:5434/torneopescaapp?schema=public',
    JWT_SECRET: 'a-long-test-secret',
    APP_BASE_URL: 'http://localhost:3005',
    AUTH_REFRESH_EXPIRES_IN: '7d',
  };
}

function testRefreshConfigurationIsRequired() {
  const valid = validateEnv(baseEnv());
  assert.equal(valid.AUTH_REFRESH_EXPIRES_IN, '7d');

  const missingRefreshDuration = baseEnv();
  Reflect.deleteProperty(missingRefreshDuration, 'AUTH_REFRESH_EXPIRES_IN');
  assert.throws(() => validateEnv(missingRefreshDuration), /AUTH_REFRESH_EXPIRES_IN/);
}

async function testRotatedRefreshTokenCannotBeReused() {
  const sessions: Array<Record<string, unknown>> = [];
  const prisma = {
    authSession: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const session = {
          id: `session-${sessions.length + 1}`,
          lastUsedAt: null,
          revokedAt: null,
          ...data,
        };
        sessions.push(session);
        return session;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        sessions.find(
          (session) =>
            session.tokenHash === where.tokenHash &&
            session.revokedAt === null &&
            session.expiresAt instanceof Date &&
            session.expiresAt > new Date(),
        ) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const session = sessions.find((item) => item.id === where.id)!;
        Object.assign(session, data);
        return session;
      },
      updateMany: async ({ where, data }: { where: { id: string; revokedAt: null; expiresAt: { gt: Date } }; data: Record<string, unknown> }) => {
        const session = sessions.find(
          (item) => item.id === where.id && item.revokedAt === null && item.expiresAt instanceof Date && item.expiresAt > where.expiresAt.gt,
        );
        if (!session) return { count: 0 };
        Object.assign(session, data);
        return { count: 1 };
      },
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma),
  };
  const service = new AuthSessionService(
    prisma as never,
    { getOrThrow: () => '7d' } as never,
  );

  const first = await service.create('user-1');
  const rotated = await service.rotate(first.rawToken);
  assert.notEqual(rotated.rawToken, first.rawToken);
  await assert.rejects(() => service.rotate(first.rawToken), /Sesion invalida o expirada/);
}

async function testConcurrentRefreshRotationHasOneWinner() {
  const sessions: Array<Record<string, unknown>> = [];
  let readyReaders = 0;
  let releaseReaders: (() => void) | undefined;
  const bothReadersReady = new Promise<void>((resolve) => {
    releaseReaders = resolve;
  });
  const prisma = {
    authSession: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const session = { id: `session-${sessions.length + 1}`, lastUsedAt: null, revokedAt: null, ...data };
        sessions.push(session);
        return session;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const session = sessions.find(
          (item) => item.tokenHash === where.tokenHash && item.revokedAt === null && item.expiresAt instanceof Date && item.expiresAt > new Date(),
        ) ?? null;
        if (session) {
          readyReaders += 1;
          if (readyReaders === 2) releaseReaders?.();
          await bothReadersReady;
        }
        return session;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const session = sessions.find((item) => item.id === where.id)!;
        Object.assign(session, data);
        return session;
      },
      updateMany: async ({ where, data }: { where: { id: string; revokedAt: null; expiresAt: { gt: Date } }; data: Record<string, unknown> }) => {
        const session = sessions.find(
          (item) => item.id === where.id && item.revokedAt === null && item.expiresAt instanceof Date && item.expiresAt > where.expiresAt.gt,
        );
        if (!session) return { count: 0 };
        Object.assign(session, data);
        return { count: 1 };
      },
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma),
  };
  const service = new AuthSessionService(prisma as never, { getOrThrow: () => '7d' } as never);
  const first = await service.create('user-1');

  const results = await Promise.allSettled([service.rotate(first.rawToken), service.rotate(first.rawToken)]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
}

async function testLogoutWritesAuditForRevokedSession() {
  const audits: Array<Record<string, unknown>> = [];
  const service = new AuthService(
    {} as never,
    {} as never,
    { get: () => 'development' } as never,
    {} as never,
    {} as never,
    { log: async (payload: Record<string, unknown>) => { audits.push(payload); } } as never,
    { revoke: async () => ({ userId: 'user-1' }) } as never,
  );
  const cleared: unknown[][] = [];

  await service.logout(
    { headers: { cookie: 'torneos_pesca_refresh=refresh-token' } } as never,
    { clearCookie: (...args: unknown[]) => { cleared.push(args); } } as never,
  );

  assert.equal(cleared.length, 1);
  assert.deepEqual(audits, [{ actorUserId: 'user-1', action: 'auth.logout', entityName: 'User', entityId: 'user-1' }]);
}

function testRefreshAndLogoutAreRateLimited() {
  const guard = new PublicAuthRateLimitGuard({ get: () => 'false' } as never);
  const context = (path: string) => ({
    switchToHttp: () => ({
      getRequest: () => ({ method: 'POST', originalUrl: path, ip: '203.0.113.77', headers: {} }),
    }),
  }) as never;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.equal(guard.canActivate(context('/api/v1/auth/refresh')), true);
  }
  assert.throws(() => guard.canActivate(context('/api/v1/auth/refresh')), /Demasiados intentos/);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    assert.equal(guard.canActivate(context('/api/v1/auth/logout')), true);
  }
  assert.throws(() => guard.canActivate(context('/api/v1/auth/logout')), /Demasiados intentos/);
}

function testRefreshCookieParserOnlyReadsNamedCookie() {
  assert.equal(readRefreshToken('other=value; torneos_pesca_refresh=refresh-token; next=x'), 'refresh-token');
  assert.equal(readRefreshToken('torneos_pesca_refresh='), undefined);
  assert.equal(readRefreshToken(undefined), undefined);
}

async function main() {
  testRefreshConfigurationIsRequired();
  await testRotatedRefreshTokenCannotBeReused();
  await testConcurrentRefreshRotationHasOneWinner();
  await testLogoutWritesAuditForRevokedSession();
  testRefreshAndLogoutAreRateLimited();
  testRefreshCookieParserOnlyReadsNamedCookie();
  console.log('PKG-007 session checks passed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
