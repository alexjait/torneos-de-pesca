import assert from 'node:assert/strict';
import { nextSortState, sortAriaValue, sortRows } from '../src/lib/table-sorting.ts';

const rows = [
  { id: 'one', name: 'Zorro', count: 2 },
  { id: 'two', name: 'Águila', count: 8 },
  { id: 'three', name: 'Boga', count: 4 },
];

assert.deepEqual(
  sortRows(rows, { column: 'name', direction: 'asc' }, (row, column) => row[column]).map((row) => row.id),
  ['two', 'three', 'one'],
  'sortRows orders text in ascending order with Spanish collation',
);

assert.deepEqual(
  sortRows(rows, { column: 'count', direction: 'desc' }, (row, column) => row[column]).map((row) => row.id),
  ['two', 'three', 'one'],
  'sortRows orders numeric values without lexicographic mistakes',
);

assert.deepEqual(
  nextSortState({ column: 'name', direction: 'asc' }, 'name'),
  { column: 'name', direction: 'desc' },
  'nextSortState reverses the active column',
);

assert.deepEqual(
  nextSortState({ column: 'name', direction: 'desc' }, 'count'),
  { column: 'count', direction: 'asc' },
  'nextSortState starts a new column in ascending order',
);

assert.equal(
  sortAriaValue({ column: 'name', direction: 'desc' }, 'name'),
  'descending',
  'sortAriaValue exposes the active direction to assistive technology',
);

assert.equal(
  sortAriaValue({ column: 'name', direction: 'desc' }, 'count'),
  'none',
  'sortAriaValue keeps inactive columns neutral',
);

console.log('Table sorting checks passed');
