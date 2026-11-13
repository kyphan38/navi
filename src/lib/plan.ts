// ============================================================
// navi - Course plan (PLAN-navi.md 7.3). Pure: no React, no Firestore.
//
// Honest plan rule: the weekly budget is the REAL average of the last weeks,
// not the hours the learner wishes for. Being late moves the finish date; it
// never piles old work onto next week.
// ============================================================

import { addDays, parseDay } from '@/lib/day';
import type { CourseModule } from '@/types/navi';

const DAY = 86_400_000;

/** Share of the weekly budget for the course; 20% work task, 10% explore. */
export const COURSE_SHARE = 0.7;

// ------------------------------------------------------------------ weeks

/** ISO week id 'YYYY-Www' for a day id (weeks start on Monday). */
export function weekOf(day: string): string {
  const d = parseDay(day);
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dow); // Thursday of this week decides the year
  const yearStart = Date.UTC(utc.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((utc.getTime() - yearStart) / DAY + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Monday (day id) of the week that holds `day`. */
export function mondayOf(day: string): string {
  const dow = parseDay(day).getDay() || 7;
  return addDays(day, 1 - dow);
}

/** Days left in the week, today included (Monday = 7, Sunday = 1). */
export function daysLeftInWeek(day: string): number {
  return 8 - (parseDay(day).getDay() || 7);
}

/** The `n` weeks before the week of `day`, newest first. */
export function previousWeeks(day: string, n: number): string[] {
  const monday = mondayOf(day);
  return Array.from({ length: n }, (_, i) => weekOf(addDays(monday, -7 * (i + 1))));
}

// ------------------------------------------------------------------ budget

/**
 * Minutes a week the learner really studies: the average of the last 4 planned
 * weeks (a planned week with no study counts as 0). Fewer than 2 planned weeks
 * -> the hours from the profile.
 */
export function weeklyBudget(
  day: string,
  plannedWeeks: Set<string>,
  minutesByWeek: Map<string, number>,
  profileHours: number,
): { minutes: number; real: boolean } {
  const weeks = previousWeeks(day, 4).filter((w) => plannedWeeks.has(w));
  if (weeks.length < 2) return { minutes: Math.round(profileHours * 60), real: false };
  const total = weeks.reduce((sum, w) => sum + (minutesByWeek.get(w) ?? 0), 0);
  return { minutes: Math.round(total / weeks.length), real: true };
}

/** Day minutes summed per ISO week. */
export function minutesPerWeek(days: { id: string; minutes: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const d of days) out.set(weekOf(d.id), (out.get(weekOf(d.id)) ?? 0) + d.minutes);
  return out;
}

// ------------------------------------------------------------------ week plan

/**
 * Modules for one week: not done yet, in course order, until about 70% of the
 * budget is used. Always at least one module when any are left.
 */
export function planWeek(modules: CourseModule[], budgetMinutes: number): CourseModule[] {
  const target = budgetMinutes * COURSE_SHARE;
  const out: CourseModule[] = [];
  let used = 0;
  for (const m of modules) {
    if (m.doneAt !== null) continue;
    if (out.length > 0 && used + m.minutes > target) break;
    out.push(m);
    used += m.minutes;
  }
  return out;
}

/** Drill topics for the week: titles of planned lessons and demos, at most 5. */
export function drillTopics(planned: CourseModule[]): string[] {
  return planned
    .filter((m) => m.kind === 'lesson' || m.kind === 'demo')
    .map((m) => m.title)
    .slice(0, 5);
}

// ------------------------------------------------------------------ forecast

export type Forecast = {
  minutesLeft: number;
  /** Epoch ms of the expected finish; null when nothing is left or no time to study. */
  finishAt: number | null;
  late: boolean;
};

/** When the course ends at this budget: the course gets 70% of each week. */
export function forecast(modules: CourseModule[], budgetMinutes: number, now: number, deadline: number | null): Forecast {
  const minutesLeft = modules.filter((m) => m.doneAt === null).reduce((s, m) => s + m.minutes, 0);
  if (minutesLeft === 0) return { minutesLeft, finishAt: null, late: false };
  const perWeek = budgetMinutes * COURSE_SHARE;
  if (perWeek <= 0) return { minutesLeft, finishAt: null, late: deadline !== null };
  const finishAt = now + Math.ceil((minutesLeft / perWeek) * 7) * DAY;
  return { minutesLeft, finishAt, late: deadline !== null && finishAt > deadline };
}

// ------------------------------------------------------------------ today

/**
 * Modules for today: the planned modules not done yet, spread over the days
 * left in the week. Modules ticked today stay in the list so they show as done.
 */
export function todayModules(planned: CourseModule[], day: string, doneToday: Set<string>): CourseModule[] {
  const open = planned.filter((m) => m.doneAt === null || doneToday.has(m.id));
  const notDone = open.filter((m) => !doneToday.has(m.id));
  const left = notDone.reduce((s, m) => s + m.minutes, 0);
  const daily = left / daysLeftInWeek(day);
  const out = open.filter((m) => doneToday.has(m.id));
  let used = out.reduce((s, m) => s + m.minutes, 0);
  for (const m of notDone) {
    if (out.length > 0 && used >= daily) break;
    out.push(m);
    used += m.minutes;
  }
  return planned.filter((m) => out.includes(m));
}

/** "4h 20m" / "35m". */
export function hm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

// ------------------------------------------------------------------ ticking a module

/** Course modules after marking one done (now) or not done. */
export function tickModules(modules: CourseModule[], id: string, done: boolean, now: number): CourseModule[] {
  return modules.map((m) => (m.id === id ? { ...m, doneAt: done ? now : null } : m));
}
