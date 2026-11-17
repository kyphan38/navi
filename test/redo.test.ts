import assert from 'node:assert/strict';
import { test } from 'node:test';

import { redoPick } from '@/lib/redo';
import type { Drill } from '@/types/navi';

const DAY = 86_400_000;
const NOW = 100 * DAY;
const score = (n: number) => ({ triage: n, hypothesis: n, safety: null, comms: null, prevention: null });

function d(id: string, over: Partial<Drill> = {}): Drill & { id: string } {
  return {
    id,
    group: 'tech', type: 'incident', level: 'easy', topic: id, skillIds: [], clock: '02:00', brief: '', rounds: [],
    status: 'done', score: score(1), debrief: null, seniorPath: null, whatIf: [], newTerms: [],
    startedAt: 0, doneAt: NOW - 20 * DAY, ...over,
  };
}

test('redoPick: low score, two weeks old, not redone yet', () => {
  assert.equal(redoPick([d('a')], NOW)?.drill.id, 'a');
  assert.equal(redoPick([d('a', { doneAt: NOW - 5 * DAY })], NOW), null);
  assert.equal(redoPick([d('a', { score: score(3) })], NOW), null);
  assert.equal(redoPick([d('a'), d('b', { redoOf: 'a', doneAt: NOW })], NOW), null);
  assert.equal(redoPick([d('a', { status: 'active', doneAt: null })], NOW), null);
});

test('redoPick: the latest due one, a level up only when open', () => {
  const r = redoPick([d('old', { doneAt: NOW - 40 * DAY }), d('new', { doneAt: NOW - 15 * DAY })], NOW);
  assert.equal(r?.drill.id, 'new');
  assert.equal(r?.level, 'easy');
  const good = [1, 2, 3].map((i) => d(`g${i}`, { score: score(3), doneAt: NOW - i * DAY }));
  assert.equal(redoPick([...good, d('low')], NOW)?.level, 'medium');
});
