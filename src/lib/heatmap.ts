// navi - History heatmap (PLAN-track.md 7.3). Pure.
//
// Three grays, never a streak: 0 nothing, 1 learn or review only, 2 practice
// (a drill or a mock interview finished that day).

import { addDays, dayOf } from '@/lib/day';
import { scorePercent, typeLabel } from '@/lib/drills';
import { mondayOf } from '@/lib/plan';
import type { Day, Drill, Interview } from '@/types/navi';

export type Shade = 0 | 1 | 2;
export type Cell = { day: string; shade: Shade; future: boolean };

type DayD = Day & { id: string };
type DrillD = Drill & { id: string };
type InterviewD = Interview & { id: string };

/** Days with a finished drill or interview. */
function practiceDays(drills: DrillD[], interviews: InterviewD[]): Set<string> {
  const out = new Set<string>();
  for (const d of drills) if (d.status === 'done' && d.doneAt !== null) out.add(dayOf(d.doneAt));
  for (const i of interviews) if (i.status === 'done' && i.doneAt !== null) out.add(dayOf(i.doneAt));
  return out;
}

function learned(d: DayD | undefined): boolean {
  return !!d && (d.minutes > 0 || d.moduleIds.length > 0 || (d.reviews ?? 0) > 0);
}

/** `weeks` columns, Monday to Sunday, oldest first; the last column holds today. */
export function heatCells(days: DayD[], drills: DrillD[], interviews: InterviewD[], today: string, weeks = 26): Cell[][] {
  const byId = new Map(days.map((d) => [d.id, d]));
  const practice = practiceDays(drills, interviews);
  const first = addDays(mondayOf(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const day = addDays(first, w * 7 + i);
      const future = day > today;
      const shade: Shade = future ? 0 : practice.has(day) ? 2 : learned(byId.get(day)) ? 1 : 0;
      return { day, shade, future };
    }),
  );
}

/** What happened on one day, as short lines for the list under the grid. */
export function dayLines(
  day: string,
  days: DayD[],
  drills: DrillD[],
  interviews: InterviewD[],
  moduleTitle: (id: string) => string | undefined,
): string[] {
  const out: string[] = [];
  const d = days.find((x) => x.id === day);
  if (d && (d.moduleIds.length || d.minutes)) {
    const titles = d.moduleIds.map(moduleTitle).filter((t): t is string => !!t);
    out.push(`learn · ${d.minutes}m${titles.length ? ` · ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? ` +${titles.length - 3}` : ''}` : ''}`);
  }
  for (const x of drills) {
    if (x.status !== 'done' || x.doneAt === null || dayOf(x.doneAt) !== day) continue;
    const pct = scorePercent(x.score);
    out.push(`drill · ${typeLabel(x.type)} · ${x.level} · ${x.topic}${pct !== null ? ` · ${pct}%` : ''}`);
  }
  for (const i of interviews) if (i.status === 'done' && i.doneAt !== null && dayOf(i.doneAt) === day) out.push(`interview · ${i.kind}`);
  if (d?.reviews) out.push(`review · ${d.reviews}`);
  if (d?.note) out.push(`note · ${d.note}`);
  return out;
}
