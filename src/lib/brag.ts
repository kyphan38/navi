// navi - Brag doc for a quarter (V3): the quarter's dates and the facts the AI writes from. Pure.

import { oneOnOne, type OneOnOneInput } from '@/lib/one-on-one';

/** "2026-Q4" for a time (local dates). */
export function quarterOf(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

/** First and last ms of a quarter (local time). */
export function quarterRange(q: string): { from: number; to: number } {
  const [y, n] = q.split('-Q').map(Number);
  const from = new Date(y, (n - 1) * 3, 1).getTime();
  const to = new Date(y, n * 3, 1).getTime() - 1;
  return { from, to };
}

/** This quarter and the ones before it, newest first. */
export function recentQuarters(now: number, n: number): string[] {
  const out: string[] = [];
  const d = new Date(now);
  let y = d.getFullYear();
  let q = Math.floor(d.getMonth() / 3) + 1;
  for (let i = 0; i < n; i++) {
    out.push(`${y}-Q${q}`);
    q -= 1;
    if (q === 0) {
      q = 4;
      y -= 1;
    }
  }
  return out;
}

/** The facts for one quarter: the 1:1 notes for its dates, without the "help" lines. */
export function bragFacts(q: string, input: Omit<OneOnOneInput, 'from' | 'to'>): string {
  const { from, to } = quarterRange(q);
  return oneOnOne({ ...input, from, to })
    .split('\n')
    .filter((l) => l !== 'I want help with' && l !== '- ')
    .join('\n')
    .trim();
}
