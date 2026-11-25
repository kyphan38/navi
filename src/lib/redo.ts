// navi - Redo a low-score drill after two weeks, one level up when it is open (V5). Pure.

import { doneOfType, openLevels, scorePercent } from '@/lib/drills';
import type { Drill, DrillLevel } from '@/types/navi';

export const REDO_BELOW = 60;
export const REDO_AFTER_DAYS = 14;
const ALL: DrillLevel[] = ['easy', 'medium', 'hard'];

type D = Drill & { id: string };

/**
 * The drill to redo today, and the level for the new try; null when none is due.
 * `first`: drill ids to try before the others (the running track's pillar).
 */
export function redoPick(drills: D[], now: number, first: Set<string> = new Set()): { drill: D; level: DrillLevel } | null {
  const redone = new Set(drills.map((d) => d.redoOf).filter((x): x is string => !!x));
  const due = drills
    .filter((d) => d.status === 'done' && d.doneAt !== null && !d.redoOf && !redone.has(d.id))
    .filter((d) => (scorePercent(d.score) ?? 100) < REDO_BELOW)
    .filter((d) => now - (d.doneAt ?? now) >= REDO_AFTER_DAYS * 86_400_000)
    .sort((a, b) => Number(first.has(b.id)) - Number(first.has(a.id)) || (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const drill = due[0];
  if (!drill) return null;
  const open = openLevels(doneOfType(drills, drill.type));
  const up = ALL[ALL.indexOf(drill.level) + 1];
  return { drill, level: up && open.includes(up) ? up : drill.level };
}
