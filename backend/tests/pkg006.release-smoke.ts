import assert from 'node:assert/strict';

type JsonResponse = {
  data?: Record<string, unknown>;
  error?: unknown;
};

const baseUrl = (process.env.SMOKE_BASE_URL ?? 'http://localhost:3004/api/v1').replace(
  /\/$/,
  '',
);
const adminEmail = process.env.SMOKE_ADMIN_EMAIL?.trim();
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD?.trim();

function requireCredential(value: string | undefined, key: string) {
  if (!value) {
    throw new Error(`Falta ${key} para ejecutar el smoke autenticado`);
  }

  return value;
}

async function getJson(path: string, token?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  let body: JsonResponse | null = null;
  try {
    body = (await response.json()) as JsonResponse;
  } catch {
    body = null;
  }

  return { response, body };
}

async function postJson(path: string, payload: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let body: JsonResponse | null = null;
  try {
    body = (await response.json()) as JsonResponse;
  } catch {
    body = null;
  }

  return { response, body };
}

async function main() {
  const email = requireCredential(adminEmail, 'SMOKE_ADMIN_EMAIL');
  const password = requireCredential(adminPassword, 'SMOKE_ADMIN_PASSWORD');

  const live = await getJson('/health/live');
  assert.equal(live.response.status, 200, 'health/live debe responder 200');

  const ready = await getJson('/health/ready');
  assert.equal(ready.response.status, 200, 'health/ready debe responder 200');

  const login = await postJson('/auth/login', { email, password });
  assert.equal(login.response.status, 200, 'auth/login debe responder 200');

  const accessToken = login.body?.data?.accessToken;
  assert.equal(typeof accessToken, 'string', 'auth/login debe devolver accessToken');

  const me = await getJson('/auth/me', accessToken as string);
  assert.equal(me.response.status, 200, 'auth/me debe responder 200');

  const tournaments = await getJson('/tournaments', accessToken as string);
  assert.equal(tournaments.response.status, 200, 'tournaments debe responder 200');

  console.log(
    JSON.stringify(
      {
        baseUrl,
        checks: [
          { name: 'health/live', status: live.response.status },
          { name: 'health/ready', status: ready.response.status },
          { name: 'auth/login', status: login.response.status },
          { name: 'auth/me', status: me.response.status },
          { name: 'tournaments', status: tournaments.response.status },
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
