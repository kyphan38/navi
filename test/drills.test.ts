import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clockAt, scorePercent, splitProse, todayDrill } from '@/lib/drills';
import type { Drill } from '@/types/navi';

const base: Drill = {
  group: 'tech',
  type: 'incident',
  level: 'easy',
  topic: 'pool',
  skillIds: [],
  clock: '02:04',
  brief: 'b',
  rounds: [],
  status: 'done',
  score: null,
  debrief: null,
  seniorPath: null,
  whatIf: [],
  newTerms: [],
  startedAt: 0,
  doneAt: null,
};
const at = (day: string, hour = 12) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00+07:00`).getTime();

test('clockAt adds 6 minutes a step and wraps at midnight', () => {
  assert.equal(clockAt('02:04', 0), '02:04');
  assert.equal(clockAt('02:04', 3), '02:22');
  assert.equal(clockAt('23:58', 1), '00:04');
  assert.equal(clockAt('bad', 1), '');
});

test('scorePercent skips criteria that are not used', () => {
  assert.equal(scorePercent(null), null);
  assert.equal(scorePercent({ triage: 3, hypothesis: 3, safety: 3, comms: null, prevention: 0 }), 75);
  assert.equal(scorePercent({ triage: null, hypothesis: null, safety: null, comms: null, prevention: null }), null);
});

test('todayDrill prefers the drill in progress', () => {
  const active = { ...base, id: 'a', status: 'active' as const };
  assert.deepEqual(todayDrill('2026-11-13', [active]).state, 'active');
});

test('todayDrill shows a drill done today (day starts at 04:00)', () => {
  const done = { ...base, id: 'd', doneAt: at('2026-11-14', 2) };
  assert.equal(todayDrill('2026-11-13', [done]).state, 'done');
  assert.equal(todayDrill('2026-11-14', [done]).state, 'todo');
});

test('todayDrill rotates types by day and keeps the last level of that type', () => {
  const a = todayDrill('2026-11-13', []);
  const b = todayDrill('2026-11-14', []);
  assert.ok(a.state === 'todo' && b.state === 'todo');
  assert.notEqual(a.type, b.type);
  const pastSame = { ...base, id: 'x', type: a.type, level: 'medium' as const, doneAt: at('2026-11-01') };
  const again = todayDrill('2026-11-13', [pastSame]);
  assert.ok(again.state === 'todo' && again.level === 'medium');
});

test('splitProse keeps code blocks apart from paragraphs', () => {
  const parts = splitProse('Look at this.\n\n```hcl\nresource "x" {}\n```\n\nWhat is wrong?');
  assert.deepEqual(parts, [
    { code: false, text: 'Look at this.' },
    { code: true, text: 'resource "x" {}' },
    { code: false, text: 'What is wrong?' },
  ]);
});
