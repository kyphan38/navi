// ============================================================
// navi - Milestone forecast for the Map (PLAN-navi.md 9.2). Pure.
//
// Minutes left for a learning milestone:
// - tied to a course: the course minutes not done yet (same as the Learn page);
// - else: undone modules tagged with a skill that is still below its target,
//   plus 6 hours for every missing level step that no module covers.
// The course gets 70% of each study week, as in plan.ts, so dates match.
// Career milestones never get a date: only a checklist.
// ============================================================

import { COURSE_SHARE } from '@/lib/plan';
import type { CourseModule, Milestone, SkillLevel } from '@/types/navi';

const DAY = 86_400_000;
/** Guess for one level step with no module to learn it from; tune once there is data. */
export const HOURS_PER_STEP = 6;

export const CAREER_CHECKLIST = [
  'Join on-call for production',
  'Write a postmortem',
  'Own the SLOs of one service',
  'Write a design doc',
  'Mentor a new teammate',
  'Lead a project from start to end',
];

export function minutesLeft(m: Milestone, levels: Map<string, SkillLevel>, modules: CourseModule[]): number {
  if (m.kind === 'career') return 0;
  if (m.courseId) return modules.filter((x) => x.doneAt === null).reduce((s, x) => s + x.minutes, 0);
  const open = m.needs.filter((n) => (levels.get(n.skillId) ?? 0) < n.level);
  const used = new Set<string>();
  let minutes = 0;
  for (const n of open) {
    const mods = modules.filter((x) => x.doneAt === null && x.skillIds.includes(n.skillId));
    if (mods.length) {
      for (const x of mods) {
        if (!used.has(x.id)) minutes += x.minutes;
        used.add(x.id);
      }
    } else {
      minutes += (n.level - (levels.get(n.skillId) ?? 0)) * HOURS_PER_STEP * 60;
    }
  }
  return minutes;
}

export function isDone(m: Milestone, left: number): boolean {
  if (m.doneAt !== null) return true;
  if (m.kind === 'career') return m.checklist.length > 0 && m.checklist.every((c) => c.done);
  return left === 0;
}

/** Expected date at `hoursPerWeek`; null when done or no study time. */
export function dateFor(left: number, hoursPerWeek: number, now: number): number | null {
  const perWeek = hoursPerWeek * 60 * COURSE_SHARE;
  if (left <= 0 || perWeek <= 0) return null;
  return now + Math.ceil((left / perWeek) * 7) * DAY;
}

/** Whole weeks between two dates (positive = b is earlier). */
export function weeksEarlier(a: number | null, b: number | null): number {
  return a !== null && b !== null ? Math.round((a - b) / (7 * DAY)) : 0;
}

/** Default milestones: the course, core skills at "do", and ready for mid-level. */
export function defaultMilestones(course: { id: string; title: string } | null): Omit<Milestone, 'doneAt'>[] {
  const core = ['iam-policies', 'iam-roles', 'kms-encryption', 's3-security', 'guardrails', 'monitoring', 'incident-response', 'slo'];
  const out: Omit<Milestone, 'doneAt'>[] = [];
  if (course) out.push({ title: `Finish ${course.title}`.slice(0, 200), kind: 'learning', courseId: course.id, needs: [], checklist: [], order: 1 });
  out.push({ title: 'Core skills at "do"', kind: 'learning', courseId: null, needs: core.map((skillId) => ({ skillId, level: 2 as SkillLevel })), checklist: [], order: 2 });
  out.push({
    title: 'Ready for mid-level',
    kind: 'career',
    courseId: null,
    needs: [],
    checklist: CAREER_CHECKLIST.map((text) => ({ text, done: false, at: null })),
    order: 3,
  });
  return out;
}
