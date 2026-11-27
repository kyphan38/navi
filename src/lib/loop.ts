// ============================================================
// navi - Today's loop line (PLAN-guide G2)
//
// The same stops as Today, as a short line on the drill, basics and review
// pages, so the daily order is always in sight.
// ============================================================

export type LoopKey = 'drill' | 'basics' | 'review';
export type LoopStep = { key: LoopKey; href: string; done: boolean };

export type LoopState = {
  drillDone: boolean;
  /** null: basics is not set up, so it is not a stop. */
  basicsDone: boolean | null;
  /** null: nothing is in review yet, so it is not a stop. */
  reviewDue: number | null;
};

/** Stops in Today's order. */
export function loopSteps(s: LoopState): LoopStep[] {
  const steps: LoopStep[] = [{ key: 'drill', href: '/drill/', done: s.drillDone }];
  if (s.basicsDone !== null) steps.push({ key: 'basics', href: '/basics/', done: s.basicsDone });
  if (s.reviewDue !== null) steps.push({ key: 'review', href: '/review/', done: s.reviewDue === 0 });
  return steps;
}

/** Which stop a pathname is on, if any. '/drill/play/' counts as drill. */
export function loopKeyOf(pathname: string): LoopKey | null {
  const p = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (p.startsWith('/drill/')) return 'drill';
  if (p.startsWith('/basics/')) return 'basics';
  if (p.startsWith('/review/')) return 'review';
  return null;
}
