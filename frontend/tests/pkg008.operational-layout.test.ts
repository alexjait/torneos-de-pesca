import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const participantsPage = readFileSync(new URL('../src/components/admin-pages.tsx', import.meta.url), 'utf8');
const operationsPage = readFileSync(new URL('../src/components/official-pages.tsx', import.meta.url), 'utf8');

assert.match(styles, /\.official-main \.surface\s*\{[\s\S]*width:\s*100%/);
assert.match(styles, /\.official-task-grid\s*\{[\s\S]*grid-template-columns/);
assert.match(styles, /\.participants-mobile-list\s*\{[\s\S]*display:\s*none/);
assert.match(styles, /\.participants-mobile-list\s*\{[\s\S]*display:\s*grid/);
assert.match(styles, /\.official-toolbar \.field\s*\{[\s\S]*flex:\s*0 0 auto/);
assert.match(participantsPage, /participants-mobile-list/);
assert.match(participantsPage, /Ver vínculos/);
assert.match(operationsPage, /official-task-grid/);

console.log('PKG-008 operational layout checks passed');
