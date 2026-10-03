import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type PackageManifest = {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};

function testDevelopmentWatcherUsesMaintainedDependency() {
  const manifestPath = resolve(__dirname, '..', 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;

  assert.equal(manifest.devDependencies['ts-node-dev'], undefined);
  assert.ok(manifest.devDependencies.tsx);
  assert.equal(manifest.scripts['start:dev'], 'tsx watch src/main.ts');
}

testDevelopmentWatcherUsesMaintainedDependency();
console.log('Development watcher checks passed');
