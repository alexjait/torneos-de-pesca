import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HealthService } from '../src/modules/health/application/health.service';
import { requestLoggingMiddleware } from '../src/common/http/request-logging.middleware';

async function testReadyDoesNotWriteProbeFiles() {
  const root = await mkdtemp(join(tmpdir(), 'torneopesca-health-'));
  const service = new HealthService(
    { $queryRaw: async () => [{ ok: 1 }] } as never,
    { get: (key: string) => (key === 'MEDIA_STORAGE_DIR' ? root : undefined) } as never,
  );

  try {
    await service.onModuleInit();
    const before = await readdir(root);
    await service.getReadyStatus();
    const after = await readdir(root);

    assert.deepEqual(before, [], 'la inicializacion no debe dejar probes temporales');
    assert.deepEqual(after, [], 'cada readiness debe ser observacional para storage');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function requestIdFor(header: string | undefined) {
  const request = {
    header: (name: string) => (name.toLowerCase() === 'x-request-id' ? header : undefined),
    originalUrl: '/api/v1/health/ready',
    url: '/api/v1/health/ready',
    method: 'GET',
  };
  const response = Object.assign(new EventEmitter(), {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  });

  requestLoggingMiddleware(request as never, response as never, () => undefined);
  response.emit('finish');
  return response.headers['X-Request-Id'];
}

function testRequestIdNormalization() {
  assert.equal(requestIdFor('trace-01'), 'trace-01');
  assert.match(requestIdFor(undefined), /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  assert.match(requestIdFor(' x '), /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  assert.match(requestIdFor('a'.repeat(129)), /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
}

async function main() {
  await testReadyDoesNotWriteProbeFiles();
  testRequestIdNormalization();
  console.log('PKG-006 hardening checks passed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
