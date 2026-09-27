import assert from 'node:assert/strict';
import { api, configureAuthRecovery } from '../src/lib/api.ts';

async function testConcurrentUnauthorizedRequestsShareRefreshAndRetryOnce() {
  const originalFetch = globalThis.fetch;
  const authorizationHeaders: string[] = [];
  let refreshes = 0;

  globalThis.fetch = async (_input, init) => {
    const authorization = new Headers(init?.headers).get('Authorization');
    if (authorization === 'Bearer refreshed-access-token') {
      authorizationHeaders.push(authorization);
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ message: 'Token expirado' }), { status: 401 });
  };
  configureAuthRecovery({
    refreshAccessToken: async () => {
      refreshes += 1;
      return 'refreshed-access-token';
    },
    onSessionInvalid: () => undefined,
  });

  try {
    await Promise.all([api.listTournaments('expired-token'), api.listTeams('expired-token')]);
    assert.equal(refreshes, 1);
    assert.deepEqual(authorizationHeaders, ['Bearer refreshed-access-token', 'Bearer refreshed-access-token']);
  } finally {
    configureAuthRecovery(null);
    globalThis.fetch = originalFetch;
  }
}

testConcurrentUnauthorizedRequestsShareRefreshAndRetryOnce()
  .then(() => console.log('PKG-007 frontend auth recovery checks passed'))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
