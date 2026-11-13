import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clockAt, scorePercent, splitProse, todayDrill, topicForDay } from '@/lib/drills';
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

test('topicForDay rotates through the week topics', () => {
  assert.equal(topicForDay('2026-11-13', []), undefined);
  const a = topicForDay('2026-11-13', ['x', 'y']);
  const b = topicForDay('2026-11-14', ['x', 'y']);
  assert.ok(a && b && a !== b);
});

import { openLevels as serverOpenLevels } from '../functions/src/drill/catalog.ts';
import { DRILL_TYPES, GROUPS, openLevels, typeForDay, unlockProgress } from '@/lib/drills';
import { addDays, parseDay } from '@/lib/day';
import type { DrillLevel, Score } from '@/types/navi';

const sc = (p: number): Score => {
  const v = Math.round((p / 100) * 3);
  return { triage: v, hypothesis: v, safety: v, comms: v, prevention: v };
};
const h = (...xs: [DrillLevel, number][]) => xs.map(([level, p]) => ({ level, score: sc(p) }));

test('openLevels: medium after 3 easy at 70%+, hard after 3 medium', () => {
  assert.deepEqual(openLevels([]), ['easy']);
  assert.deepEqual(openLevels(h(['easy', 100], ['easy', 100])), ['easy']);
  assert.deepEqual(openLevels(h(['easy', 100], ['easy', 67], ['easy', 100])), ['easy']); // one below 70%
  assert.deepEqual(openLevels(h(['easy', 100], ['easy', 100], ['easy', 100])), ['easy', 'medium']);
  assert.deepEqual(openLevels(h(['medium', 100], ['medium', 100], ['medium', 100], ['easy', 0])), ['easy', 'medium', 'hard']);
});

test('openLevels: a level already used stays open, older scores do not count', () => {
  assert.deepEqual(openLevels(h(['medium', 0])), ['easy', 'medium']);
  // Last 3 easy: two bad ones are newest.
  assert.deepEqual(openLevels(h(['easy', 0], ['easy', 0], ['easy', 100], ['easy', 100], ['easy', 100])), ['easy']);
});

test('client and server unlock rules agree', () => {
  const levels: DrillLevel[] = ['easy', 'medium', 'hard'];
  for (let seed = 1; seed < 300; seed++) {
    const hist = Array.from({ length: seed % 9 }, (_, i) => ({ level: levels[(seed * (i + 3)) % 3], score: sc(((seed * 37 + i * 53) % 101)) }));
    assert.deepEqual(openLevels(hist), serverOpenLevels(hist), `seed ${seed}`);
  }
});

test('unlockProgress counts good drills toward the next level', () => {
  assert.deepEqual(unlockProgress(h(['easy', 100], ['easy', 0])), { next: 'medium', good: 1 });
  assert.equal(unlockProgress(h(['medium', 0], ['hard', 0])), null);
});

test('typeForDay: Sunday is incident, about half the days are tech, all types show up', () => {
  const seen = new Set<string>();
  let tech = 0;
  for (let i = 0; i < 140; i++) {
    const day = addDays('2026-11-16', i);
    const t = typeForDay(day);
    seen.add(t);
    if (DRILL_TYPES.find((d) => d.type === t)?.group === 'tech') tech++;
    if (parseDay(day).getDay() === 0) assert.equal(t, 'incident');
  }
  assert.equal(seen.size, DRILL_TYPES.length);
  assert.ok(tech > 60 && tech < 90, `tech days: ${tech}`);
  assert.equal(GROUPS.length, 5);
});

test('client drill list matches the server catalog and groups', async () => {
  const { DRILLS } = await import('../functions/src/drill/catalog.ts');
  assert.deepEqual(DRILL_TYPES.map((t) => t.type).sort(), Object.keys(DRILLS).sort());
  for (const t of DRILL_TYPES) assert.equal(t.group, DRILLS[t.type as keyof typeof DRILLS].group, t.type);
});
