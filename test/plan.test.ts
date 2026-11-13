import assert from 'node:assert/strict';
import { test } from 'node:test';

import { daysLeftInWeek, drillTopics, tickModules, forecast, hm, minutesPerWeek, mondayOf, planWeek, previousWeeks, todayModules, weekOf, weeklyBudget } from '@/lib/plan';
import type { CourseModule } from '@/types/navi';

const DAY = 86_400_000;
const mod = (id: string, minutes: number, extra: Partial<CourseModule> = {}): CourseModule => ({
  id,
  section: 's',
  title: `t${id}`,
  minutes,
  kind: 'lesson',
  skillIds: [],
  doneWhen: '',
  doneAt: null,
  ...extra,
});
// 150 lessons of 10 minutes, like a pasted course.
const course = Array.from({ length: 150 }, (_, i) => mod(String(i), 10));

test('weekOf follows ISO weeks, also around new year', () => {
  assert.equal(weekOf('2026-11-13'), '2026-W46');
  assert.equal(weekOf('2026-11-16'), '2026-W47'); // Monday
  assert.equal(weekOf('2026-11-15'), '2026-W46'); // Sunday
  assert.equal(weekOf('2027-01-01'), '2026-W53');
  assert.equal(weekOf('2025-12-29'), '2026-W01');
});

test('mondayOf, daysLeftInWeek and previousWeeks', () => {
  assert.equal(mondayOf('2026-11-13'), '2026-11-09');
  assert.equal(daysLeftInWeek('2026-11-09'), 7);
  assert.equal(daysLeftInWeek('2026-11-15'), 1);
  assert.deepEqual(previousWeeks('2026-11-13', 2), ['2026-W45', '2026-W44']);
});

test('weeklyBudget uses the profile until 2 weeks were planned', () => {
  const mins = new Map([['2026-W45', 400]]);
  assert.deepEqual(weeklyBudget('2026-11-13', new Set(['2026-W45']), mins, 5), { minutes: 300, real: false });
});

test('weeklyBudget averages real minutes; a planned week with no study counts as 0', () => {
  const planned = new Set(['2026-W45', '2026-W44', '2026-W43']);
  const mins = new Map([['2026-W45', 240], ['2026-W43', 120]]); // W44: no study at all
  assert.deepEqual(weeklyBudget('2026-11-13', planned, mins, 5), { minutes: 120, real: true });
});

test('minutesPerWeek sums days by week', () => {
  const m = minutesPerWeek([
    { id: '2026-11-09', minutes: 30 },
    { id: '2026-11-15', minutes: 20 },
    { id: '2026-11-16', minutes: 45 },
  ]);
  assert.equal(m.get('2026-W46'), 50);
  assert.equal(m.get('2026-W47'), 45);
});

test('planWeek fills about 70% of the budget in course order, skipping done modules', () => {
  const done = course.map((m, i) => (i < 3 ? { ...m, doneAt: 1 } : m));
  const week = planWeek(done, 300); // 210 min -> 21 modules of 10
  assert.equal(week.length, 21);
  assert.equal(week[0].id, '3');
});

test('planWeek on a short week still gives one module', () => {
  assert.deepEqual(planWeek([mod('a', 90), mod('b', 10)], 30).map((m) => m.id), ['a']);
  assert.deepEqual(planWeek([], 300), []);
});

test('forecast: 150 x 10 min at 5h a week takes about 7 weeks', () => {
  const f = forecast(course, 300, 0, null);
  assert.equal(f.minutesLeft, 1500);
  assert.equal(f.finishAt, Math.ceil((1500 / 210) * 7) * DAY);
  assert.equal(f.late, false);
});

test('forecast: course done early has no finish date and is never late', () => {
  const done = course.map((m) => ({ ...m, doneAt: 1 }));
  assert.deepEqual(forecast(done, 300, 0, 5), { minutesLeft: 0, finishAt: null, late: false });
});

test('forecast: deadline already passed is late; no study time is late too', () => {
  assert.equal(forecast(course, 300, 100 * DAY, 50 * DAY).late, true);
  assert.deepEqual(forecast(course, 0, 0, 10 * DAY), { minutesLeft: 1500, finishAt: null, late: true });
});

test('todayModules spreads the week over the days left and keeps ticked ones', () => {
  const planned = course.slice(0, 14); // 140 min
  // Monday: 140 / 7 = 20 min -> 2 modules.
  assert.deepEqual(todayModules(planned, '2026-11-09', new Set()).map((m) => m.id), ['0', '1']);
  // Sunday: everything left.
  assert.equal(todayModules(planned, '2026-11-15', new Set()).length, 14);
  // Ticked today: stays, and the quota is met.
  const ticked = planned.map((m, i) => (i < 2 ? { ...m, doneAt: 1 } : m));
  assert.deepEqual(todayModules(ticked, '2026-11-09', new Set(['0', '1'])).map((m) => m.id), ['0', '1']);
});

test('drillTopics takes lessons and demos only', () => {
  assert.deepEqual(drillTopics([mod('a', 1), mod('b', 1, { kind: 'quiz' }), mod('c', 1, { kind: 'demo' })]), ['ta', 'tc']);
});

test('hm formats minutes', () => {
  assert.equal(hm(35), '35m');
  assert.equal(hm(120), '2h');
  assert.equal(hm(260), '4h 20m');
});

test('tickModules marks one module done or not done', () => {
  const ms = [mod('a', 10), mod('b', 10)];
  assert.equal(tickModules(ms, 'a', true, 5)[0].doneAt, 5);
  assert.equal(tickModules(tickModules(ms, 'a', true, 5), 'a', false, 6)[0].doneAt, null);
});

test('course split helpers: chunks keep context and fake split reads sections', async () => {
  const { chunkToc, fakeSplit, parseSplit } = await import('../functions/src/course.ts');
  const text = Array.from({ length: 300 }, (_, i) => `Lesson ${i} about something long enough`).join('\n');
  const parts = chunkToc(text, 2000);
  assert.ok(parts.length > 1);
  assert.ok(parts[1].startsWith('(before) '));
  const ms = parseSplit(fakeSplit('Section 1: IAM\nIAM basics\n[DEMO] Create a role\n(before) old line'));
  assert.deepEqual(ms.map((m) => [m.section, m.kind]), [['Section 1: IAM', 'lesson'], ['Section 1: IAM', 'demo']]);
});

test('parseSplit clamps minutes and drops empty titles', async () => {
  const { parseSplit } = await import('../functions/src/course.ts');
  const ms = parseSplit(JSON.stringify({ modules: [{ section: '', title: 'A', minutes: 9999, kind: 'video', doneWhen: '' }, { title: '' }] }));
  assert.deepEqual(ms, [{ section: 'Course', title: 'A', minutes: 600, kind: 'lesson', doneWhen: '' }]);
});
