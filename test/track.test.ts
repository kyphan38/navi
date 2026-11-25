import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultNeeds, newTrack, pillarIds, rungChecks, trackDays, trackDrillPick, trackSummary, type TrackSkill } from '@/lib/track';
import type { Drill, DrillLevel, DrillType, Mistake, SkillLevel } from '@/types/navi';

const DAY = 86_400_000;
const NOW = new Date('2026-11-25T12:00:00+07:00').getTime();
// score 0-3 on two criteria: 3/3 = 100%, 2/2 = 67%
const full = { triage: 3, hypothesis: 3, safety: null, comms: null, prevention: null };
const weak = { triage: 2, hypothesis: 2, safety: null, comms: null, prevention: null };

let n = 0;
function drill(level: DrillLevel, score: typeof full, skillIds: string[], daysAgo = 1, type: DrillType = 'logs', extra: Partial<Drill> = {}): Drill & { id: string } {
  return {
    id: `d${n++}`,
    group: 'tech',
    type,
    level,
    topic: 't',
    skillIds,
    clock: '02:04',
    brief: 'b',
    rounds: [],
    status: 'done',
    score,
    debrief: null,
    seniorPath: null,
    whatIf: [],
    newTerms: [],
    startedAt: NOW - daysAgo * DAY,
    doneAt: NOW - daysAgo * DAY,
    ...extra,
  };
}
const mistake = (id: string, drillId: string, nextReviewAt: number | null, createdAt = 0): Mistake & { id: string } => ({
  id,
  drillId,
  skillId: null,
  text: 'x',
  lesson: 'y',
  box: 1,
  nextReviewAt,
  createdAt,
});
const skill = (id: string, level: SkillLevel, area = 'Containers & Kubernetes'): TrackSkill => ({ id, name: id.toUpperCase(), area, level });
const skills = [skill('a', 2), skill('b', 2)];

test('mid: skills at do, 3 medium drills at 70%+ in 60 days, no mistakes due', () => {
  const drills = [drill('medium', full, ['a']), drill('hard', full, ['b']), drill('medium', full, ['a'])];
  assert.equal(rungChecks('mid', ['a', 'b'], skills, drills, [], NOW).met, true);
  // A skill below "do".
  assert.equal(rungChecks('mid', ['a', 'b'], [skill('a', 2), skill('b', 1)], drills, [], NOW).met, false);
  // 67% does not count; nor does a drill of another skill or one older than 60 days.
  const short = [drill('medium', full, ['a']), drill('medium', weak, ['a']), drill('medium', full, ['z']), drill('medium', full, ['a'], 61)];
  const r = rungChecks('mid', ['a', 'b'], skills, short, [], NOW);
  assert.equal(r.met, false);
  assert.equal(r.checks.find((c) => c.label.startsWith('medium'))?.detail, '1/3');
  // A due mistake from a pillar drill blocks; a learned one does not.
  assert.equal(rungChecks('mid', ['a', 'b'], skills, drills, [mistake('m1', drills[0].id, NOW - 1)], NOW).met, false);
  assert.equal(rungChecks('mid', ['a', 'b'], skills, drills, [mistake('m1', drills[0].id, null)], NOW).met, true);
});

test('senior: mid plus 2 hard drills at 70%+, one of them a senior type', () => {
  const mid = [drill('medium', full, ['a']), drill('medium', full, ['a']), drill('medium', full, ['b'])];
  const logsOnly = [...mid, drill('hard', full, ['a']), drill('hard', full, ['b'])];
  assert.equal(rungChecks('senior', ['a', 'b'], skills, logsOnly, [], NOW).met, false);
  const withTradeoff = [...mid, drill('hard', full, ['a']), drill('hard', full, ['b'], 1, 'tradeoff')];
  assert.equal(rungChecks('senior', ['a', 'b'], skills, withTradeoff, [], NOW).met, true);
  // Level 3/4 is never needed.
  assert.ok(skills.every((s) => s.level < 3));
});

test('defaultNeeds: the pillar only, lowest level first, at most 5', () => {
  const all = [skill('c', 3), skill('b', 0), skill('x', 0, 'AI infra'), skill('a', 1), skill('d', 2), skill('e', 2), skill('f', 4)];
  assert.deepEqual(defaultNeeds('Containers & Kubernetes', all), ['b', 'a', 'd', 'e', 'c']);
});

test('newTrack: 28 days, baseline levels, average and open mistakes', () => {
  const d1 = drill('medium', full, ['a'], 5);
  const d2 = drill('medium', weak, ['a'], 5);
  const t = newTrack('K', 'mid', ['a', 'b'], skills, [d1, d2], [mistake('m1', d1.id, NOW + DAY), mistake('m2', 'other', NOW)], NOW);
  assert.equal(t.endBy - t.startedAt, 28 * DAY);
  assert.deepEqual(t.baseline.levels, { a: 2, b: 2 });
  assert.equal(t.baseline.drillAvg, 84);
  assert.deepEqual(t.baseline.openMistakeIds, ['m1']);
  assert.deepEqual(trackDays(t, NOW + 30 * DAY), { day: 30, total: 28, late: 2 });
  assert.equal(trackDays(t, NOW + DAY / 2).late, 0);
});

test('trackSummary: levels before and after, fixed and new mistakes, redo pairs', () => {
  const start = NOW - 10 * DAY;
  const old = drill('medium', weak, ['a'], 40);
  const t = {
    area: 'K',
    rung: 'mid' as const,
    startedAt: start,
    endBy: start + 28 * DAY,
    baseline: { levels: { a: 1 as SkillLevel, b: 0 as SkillLevel }, drillAvg: 50, openMistakeIds: ['m1', 'm2'] },
    summary: null,
  };
  const redo = drill('hard', full, ['a'], 2, 'logs', { redoOf: old.id });
  const drills = [old, drill('medium', full, ['b'], 3), redo];
  const mistakes = [mistake('m1', old.id, null), mistake('m2', old.id, NOW + DAY), mistake('m3', redo.id, NOW + DAY, NOW - DAY)];
  const s = trackSummary(t, ['a', 'b'], [skill('a', 3), skill('b', 2)], drills, mistakes, NOW);
  assert.deepEqual(
    s.levels.map((l) => [l.skillId, l.before, l.after, l.workVerified]),
    [
      ['a', 1, 3, true],
      ['b', 0, 2, false],
    ],
  );
  assert.deepEqual(s.drillAvg, { before: 50, after: 100 });
  assert.deepEqual(s.drills, { easy: 0, medium: 1, hard: 1 });
  assert.equal(s.mistakesFixed, 1);
  assert.equal(s.mistakesNew, 1);
  assert.deepEqual(s.redo, [{ topic: 't', before: 67, after: 100 }]);
  assert.equal(s.late, false);
  assert.equal(s.days, 10);
});

test('trackDrillPick: tech days only, skills below do first, levels by rung', () => {
  const needs = ['a', 'b'];
  const mixed = [skill('a', 2), skill('b', 1)];
  // Non-tech day: keep the normal pick.
  assert.equal(trackDrillPick('2026-11-24', { rung: 'mid' }, needs, mixed, [], { type: 'say-no' }), null);
  // Tech weekday, mid: same type, easy until medium opens, the skill below "do".
  const mid = trackDrillPick('2026-11-24', { rung: 'mid' }, needs, mixed, [], { type: 'logs' });
  assert.deepEqual(mid, { type: 'logs', level: 'easy', topic: 'B', skillId: 'b' });
  // Senior: a senior type at the highest open level.
  const sen = trackDrillPick('2026-11-24', { rung: 'senior' }, needs, mixed, [], { type: 'logs' });
  assert.ok(sen && ['tradeoff', 'failure-mode', 'war-room', 'incident'].includes(sen.type));
  // Sunday: war-room or incident.
  const sun = trackDrillPick('2026-11-29', { rung: 'mid' }, needs, mixed, [], { type: 'incident' });
  assert.ok(sun && ['war-room', 'incident'].includes(sun.type));
  // No needs: nothing to change.
  assert.equal(trackDrillPick('2026-11-24', { rung: 'mid' }, [], mixed, [], { type: 'logs' }), null);
});

test('pillarIds finds drills and mistakes of the pillar', () => {
  const d = drill('easy', full, ['a']);
  const other = drill('easy', full, ['z']);
  const r = pillarIds(['a'], [d, other], [mistake('m1', d.id, 1), mistake('m2', other.id, 1)]);
  assert.deepEqual([...r.drills], [d.id]);
  assert.deepEqual([...r.mistakes], ['m1']);
});

test('heatCells: 26 weeks of 7 days, practice is darker than learning, no future', async () => {
  const { heatCells, dayLines } = await import('@/lib/heatmap');
  const today = '2026-11-25'; // a Wednesday
  const day = (id: string, extra: Partial<{ minutes: number; reviews: number; moduleIds: string[]; note: string }> = {}) => ({
    id,
    moduleIds: [],
    drillId: null,
    minutes: 0,
    note: '',
    confidence: null,
    updatedAt: 0,
    ...extra,
  });
  const days = [day('2026-11-23', { reviews: 2 }), day('2026-11-24', { minutes: 30, moduleIds: ['m1'] }), day('2026-11-20')];
  const d = drill('easy', full, [], 0, 'logs', { doneAt: new Date('2026-11-24T10:00:00+07:00').getTime(), topic: 'pool' });
  const cells = heatCells(days, [d], [], today);
  assert.equal(cells.length, 26);
  assert.ok(cells.every((w) => w.length === 7));
  const last = cells[25];
  assert.equal(last[0].day, '2026-11-23');
  assert.deepEqual(last.slice(0, 3).map((c) => c.shade), [1, 2, 0]);
  assert.equal(last[3].future, true);
  assert.equal(cells[24][4].shade, 0); // an empty day doc stays empty
  const lines = dayLines('2026-11-24', days, [d], [], (id) => (id === 'm1' ? 'Pods' : undefined));
  assert.deepEqual(lines, ['learn · 30m · Pods', 'drill · logs · easy · pool · 100%']);
});
