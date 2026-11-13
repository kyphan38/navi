import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CAREER_CHECKLIST, HOURS_PER_STEP, dateFor, defaultMilestones, isDone, minutesLeft, weeksEarlier } from '@/lib/forecast';
import { SKILL_CATALOG, derivedEvidence, isNewLevel, levelOf } from '@/lib/skill-level';
import type { CourseModule, Drill, Evidence, Milestone, SkillLevel } from '@/types/navi';

const DAY = 86_400_000;
const mod = (id: string, extra: Partial<CourseModule> = {}): CourseModule => ({
  id, section: 's', title: id, minutes: 10, kind: 'lesson', skillIds: ['iam-policies'], doneWhen: '', doneAt: null, ...extra,
});
const drill = (extra: Partial<Drill>): Drill & { id: string } => ({
  id: 'd', group: 'tech', type: 'incident', level: 'medium', topic: 't', skillIds: ['iam-policies'], clock: '', brief: '', rounds: [],
  status: 'done', score: { triage: 3, hypothesis: 2, safety: 2, comms: 2, prevention: 3 }, debrief: null, seniorPath: null,
  whatIf: [], newTerms: [], startedAt: 0, doneAt: 50, ...extra,
});
const ev = (level: SkillLevel, at: number): Evidence => ({ level, kind: 'work', ref: null, note: '', at });

test('catalog ids are unique', () => {
  assert.equal(new Set(SKILL_CATALOG.map((s) => s.id)).size, SKILL_CATALOG.length);
});

test('levelOf needs every lower level', () => {
  assert.deepEqual(levelOf([]), { level: 0, reachedAt: null });
  assert.deepEqual(levelOf([ev(1, 10), ev(3, 5)]), { level: 1, reachedAt: 10 }); // no level 2 -> stays at 1
  assert.deepEqual(levelOf([ev(1, 10), ev(1, 2), ev(2, 30), ev(3, 20)]), { level: 3, reachedAt: 30 });
  assert.equal(levelOf([ev(2, 1), ev(3, 1), ev(4, 1)]).level, 0);
});

test('derivedEvidence: done modules give level 1, done demos level 2', () => {
  const e = derivedEvidence('iam-policies', [mod('a', { doneAt: 5 }), mod('b', { doneAt: 6, kind: 'demo' }), mod('c'), mod('x', { doneAt: 1, skillIds: [] })], []);
  assert.deepEqual(e.map((x) => [x.level, x.kind, x.ref]), [[1, 'module', 'a'], [1, 'module', 'b'], [2, 'demo', 'b']]);
});

test('derivedEvidence: only medium+ drills with 70% or more count', () => {
  const low = { triage: 1, hypothesis: 1, safety: 1, comms: 1, prevention: 1 };
  assert.equal(derivedEvidence('iam-policies', [], [drill({})]).length, 1); // 80%
  assert.equal(derivedEvidence('iam-policies', [], [drill({ level: 'easy' })]).length, 0);
  assert.equal(derivedEvidence('iam-policies', [], [drill({ score: low })]).length, 0);
  assert.equal(derivedEvidence('iam-policies', [], [drill({ status: 'active', doneAt: null })]).length, 0);
});

test('isNewLevel is true for 7 days', () => {
  assert.equal(isNewLevel(0, 6 * DAY), true);
  assert.equal(isNewLevel(0, 8 * DAY), false);
  assert.equal(isNewLevel(null, 0), false);
});

const [courseMs, coreMs, careerMs] = defaultMilestones({ id: 'c1', title: 'AWS Security' }).map((m) => ({ ...m, doneAt: null }) as Milestone);

test('defaultMilestones: course, core skills, mid-level', () => {
  assert.equal(courseMs.courseId, 'c1');
  assert.equal(coreMs.needs.length, 8);
  assert.equal(careerMs.checklist.length, CAREER_CHECKLIST.length);
  assert.equal(defaultMilestones(null).length, 2);
});

test('minutesLeft: course milestone counts undone course minutes', () => {
  assert.equal(minutesLeft(courseMs, new Map(), [mod('a'), mod('b', { doneAt: 1 })]), 10);
});

test('minutesLeft: skills use tagged modules once, else 6h per missing step', () => {
  const ms: Milestone = { ...coreMs, needs: [{ skillId: 'iam-policies', level: 2 }, { skillId: 'iam-roles', level: 2 }, { skillId: 'slo', level: 2 }] };
  const levels = new Map<string, SkillLevel>([['iam-roles', 1], ['slo', 2]]);
  // iam-policies: one undone module (also tagged iam-roles, counted once); iam-roles covered by that module; slo done.
  const modules = [mod('a', { skillIds: ['iam-policies', 'iam-roles'] })];
  assert.equal(minutesLeft(ms, levels, modules), 10);
  // No modules at all: iam-policies 2 steps + iam-roles 1 step.
  assert.equal(minutesLeft(ms, levels, []), 3 * HOURS_PER_STEP * 60);
});

test('career milestones have no minutes and are done when the checklist is done', () => {
  assert.equal(minutesLeft(careerMs, new Map(), []), 0);
  assert.equal(isDone(careerMs, 0), false);
  assert.equal(isDone({ ...careerMs, checklist: careerMs.checklist.map((c) => ({ ...c, done: true })) }, 0), true);
  assert.equal(isDone(coreMs, 0), true);
});

test('dateFor and weeksEarlier: more hours, earlier date', () => {
  const at5 = dateFor(2100, 5, 0)!; // 2100 / 210 per week = 10 weeks
  assert.equal(at5, 70 * DAY);
  const at10 = dateFor(2100, 10, 0)!;
  assert.equal(weeksEarlier(at5, at10), 5);
  assert.equal(dateFor(0, 5, 0), null);
  assert.equal(dateFor(100, 0, 0), null);
});
