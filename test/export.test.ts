import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EXPORT_COLLECTIONS, buildExport, exportFilename } from '@/lib/export';

test('export lists every collection, sorted by id, with counts', () => {
  const out = JSON.parse(buildExport({ profile: { role: 'SRE' }, terms: [{ id: 'b', name: 'B' }, { id: 'a', name: 'A' }] }, Date.UTC(2026, 10, 15)));
  assert.equal(out.profile.role, 'SRE');
  assert.equal(out.app, 'navi');
  assert.equal(out.exportedAt, '2026-11-15T00:00:00.000Z');
  assert.deepEqual(Object.keys(out.collections), [...EXPORT_COLLECTIONS]);
  assert.deepEqual(out.collections.terms.map((t: { id: string }) => t.id), ['a', 'b']);
  assert.equal(out.counts.terms, 2);
  assert.equal(out.counts.drills, 0);
});

test('export filename carries the day', () => {
  assert.equal(exportFilename('2026-11-15'), 'navi-2026-11-15.json');
});
