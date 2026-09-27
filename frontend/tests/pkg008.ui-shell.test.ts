import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const navigationSource = readFileSync(
  new URL('../src/components/workspace-navigation.tsx', import.meta.url),
  'utf8',
);
const styles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

assert.match(navigationSource, /aria-modal="true"/);
assert.match(navigationSource, /aria-expanded=\{isOpen\}/);
assert.match(navigationSource, /event\.key === 'Escape'/);
assert.match(styles, /\.admin-sidebar,\s*\.official-sidebar\s*\{[\s\S]*position:\s*sticky/);
assert.match(styles, /height:\s*100dvh/);
assert.match(styles, /overflow-y:\s*auto/);
assert.match(styles, /\.mobile-navigation-trigger\s*\{[\s\S]*display:\s*none/);
assert.match(styles, /\.official-sidebar \.admin-link,\s*\.mobile-navigation-panel-official \.admin-link\s*\{[\s\S]*color:\s*var\(--text\)/);
assert.match(styles, /\.official-sidebar \.admin-link\.active,\s*\.mobile-navigation-panel-official \.admin-link\.active\s*\{[\s\S]*background:\s*var\(--brand-soft\)/);
assert.match(styles, /\.admin-sidebar \.pill-account-status,\s*\.mobile-navigation-panel-admin \.pill-account-status\s*\{[\s\S]*color:\s*#b9ebcf/);
assert.match(styles, /\.admin-sidebar \.pill-role,\s*\.mobile-navigation-panel-admin \.pill-role\s*\{[\s\S]*color:\s*#d8f2ec/);
assert.match(styles, /\.admin-sidebar \.admin-user-copy \.muted,\s*\.mobile-navigation-panel-admin \.admin-user-copy \.muted\s*\{[\s\S]*color:\s*rgba\(247, 247, 243, 0\.72\)/);

console.log('PKG-008 navigation shell checks passed');
