// Drill helpers with no React or Firestore, so `node --test` can cover them.

import { dayOf } from '@/lib/day';
import type { Criterion, Drill, DrillLevel, DrillType, Score } from '@/types/navi';

/** Drill types the app offers now (P1). Server list: functions/src/drill/catalog.ts. */
export const DRILL_TYPES: readonly { type: DrillType; label: string; line: string; levels: readonly DrillLevel[] }[] = [
  { type: 'incident', label: 'incident', line: 'Something breaks in production. What do you do?', levels: ['easy', 'medium'] },
  { type: 'security-review', label: 'security review', line: 'Find the risks in Terraform or IAM.', levels: ['easy', 'medium'] },
];

export const ROUNDS: Record<DrillLevel, number> = { easy: 3, medium: 4, hard: 5 };

export const CRITERIA: readonly { key: Criterion; label: string }[] = [
  { key: 'triage', label: 'impact first' },
  { key: 'hypothesis', label: 'test your guesses' },
  { key: 'safety', label: 'stay safe' },
  { key: 'comms', label: 'tell people' },
  { key: 'prevention', label: 'stop it next time' },
];

export function typeLabel(type: DrillType): string {
  return DRILL_TYPES.find((t) => t.type === type)?.label ?? type.replace(/-/g, ' ');
}

/** Clock time shown next to round `i` (0 = brief): start + 6 min a step. */
export function clockAt(start: string, i: number): string {
  const m = /^(\d{2}):(\d{2})$/.exec(start);
  if (!m) return '';
  const total = (Number(m[1]) * 60 + Number(m[2]) + i * 6) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Total score in percent over the criteria in use, or null if none. */
export function scorePercent(score: Score | null): number | null {
  if (!score) return null;
  const used = Object.values(score).filter((v): v is number => typeof v === 'number');
  if (!used.length) return null;
  return Math.round((used.reduce((a, b) => a + b, 0) / (used.length * 3)) * 100);
}

/** Days since 1970 for a 'YYYY-MM-DD' id, to rotate types by day. */
function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export type TodayDrill =
  | { state: 'active'; drill: Drill & { id: string } }
  | { state: 'done'; drill: Drill & { id: string } }
  | { state: 'todo'; type: DrillType; level: DrillLevel };

/**
 * What Today shows for the drill: the one in progress, the one done today, or
 * a new one. New ones rotate types by day and keep the last level used for that type.
 * `drills` is newest first.
 */
export function todayDrill(day: string, drills: (Drill & { id: string })[]): TodayDrill {
  const active = drills.find((d) => d.status === 'active');
  if (active) return { state: 'active', drill: active };
  const done = drills.find((d) => d.status === 'done' && d.doneAt !== null && dayOf(d.doneAt) === day);
  if (done) return { state: 'done', drill: done };
  const spec = DRILL_TYPES[dayNumber(day) % DRILL_TYPES.length];
  const last = drills.find((d) => d.type === spec.type && d.status === 'done');
  const level = last && spec.levels.includes(last.level) ? last.level : spec.levels[0];
  return { state: 'todo', type: spec.type, level };
}

/** Splits text into paragraphs and fenced code blocks (no markdown library). */
export function splitProse(text: string): { code: boolean; text: string }[] {
  const out: { code: boolean; text: string }[] = [];
  const parts = text.split(/```[a-zA-Z0-9-]*\n?/);
  parts.forEach((part, i) => {
    const code = i % 2 === 1;
    if (code) {
      if (part.trimEnd()) out.push({ code, text: part.trimEnd() });
      return;
    }
    for (const para of part.split(/\n{2,}/)) if (para.trim()) out.push({ code, text: para.trim() });
  });
  return out;
}

/** Today's drill topic from this week's course modules, rotating by day; undefined = random. */
export function topicForDay(day: string, topics: string[]): string | undefined {
  return topics.length ? topics[dayNumber(day) % topics.length] : undefined;
}
