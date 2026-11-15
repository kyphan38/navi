// Monthly review (owner request 2026-11-15, PLAN-navi.md "Để sau").
// Pure file: the root test suite imports it.

import { PLAIN_ENGLISH } from './style.ts';

const VN = 7 * 3_600_000;

/** 'YYYY-MM' of the month before `now`, in Vietnam time. */
export function monthBefore(now: number): string {
  const local = new Date(now + VN);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** [start, end) in epoch ms for a 'YYYY-MM' month in Vietnam time. */
export function monthRange(id: string): [number, number] {
  const [y, m] = id.split('-').map(Number);
  return [Date.UTC(y, m - 1, 1) - VN, Date.UTC(y, m, 1) - VN];
}

export type MonthInput = {
  drills: { type: string; group: string; level: string; topic: string; status: string; score: Record<string, number | null> | null }[];
  days: { minutes: number; note: string; confidence: number | null }[];
  weekReviews: { done: string; missed: string; why: string }[];
  mistakes: { text: string; lesson: string }[];
  termsAdded: string[];
  termsKnown: string[];
  modulesDone: string[];
};

/** A short, plain summary of the month for the prompt. Caps every list so the prompt stays small. */
export function summarizeMonth(d: MonthInput): string {
  const done = d.drills.filter((x) => x.status === 'done');
  const dropped = d.drills.filter((x) => x.status === 'dropped').length;
  const minutes = d.days.reduce((s, x) => s + x.minutes, 0);
  const activeDays = d.days.filter((x) => x.minutes > 0).length;
  const conf = d.days.map((x) => x.confidence).filter((x): x is number => typeof x === 'number');
  const avgConf = conf.length ? (conf.reduce((s, x) => s + x, 0) / conf.length).toFixed(1) : 'none';
  const byGroup: Record<string, number> = {};
  for (const x of done) byGroup[x.group] = (byGroup[x.group] ?? 0) + 1;
  const scored = done
    .map((x) => {
      const vals = Object.values(x.score ?? {}).filter((v): v is number => typeof v === 'number');
      return vals.length ? `${x.type} (${x.level}, ${x.topic}): ${vals.reduce((s, v) => s + v, 0)}/${vals.length * 3}` : null;
    })
    .filter(Boolean)
    .slice(0, 30);
  const lines = [
    `Study time: ${minutes} minutes on ${activeDays} days. Average confidence (1-5): ${avgConf}.`,
    `Drills done: ${done.length} (${Object.entries(byGroup).map(([g, n]) => `${g} ${n}`).join(', ') || 'none'}). Dropped: ${dropped}.`,
    scored.length ? `Drill scores:\n- ${scored.join('\n- ')}` : 'No drill scores.',
    `Course modules finished: ${d.modulesDone.length}${d.modulesDone.length ? ` (${d.modulesDone.slice(0, 20).join('; ')})` : ''}.`,
    `New terms: ${d.termsAdded.length}. Terms now known: ${d.termsKnown.length}.`,
    d.mistakes.length ? `Mistakes:\n- ${d.mistakes.slice(0, 20).map((m) => `${m.text} -> ${m.lesson}`).join('\n- ')}` : 'No mistakes logged.',
    d.weekReviews.length
      ? `Week reviews:\n- ${d.weekReviews.map((w) => `done: ${w.done} | missed: ${w.missed} | why: ${w.why}`).join('\n- ')}`
      : 'No week reviews written.',
    d.days.some((x) => x.note.trim()) ? `Day notes:\n- ${d.days.map((x) => x.note.trim()).filter(Boolean).slice(0, 25).join('\n- ')}` : 'No day notes.',
  ];
  return lines.join('\n');
}

export type MonthReview = { summary: string; progress: string[]; avoiding: string[]; next: string[] };

export const MONTH_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    progress: { type: 'array', items: { type: 'string' } },
    avoiding: { type: 'array', items: { type: 'string' } },
    next: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'progress', 'avoiding', 'next'],
};

export function buildMonthPrompt(month: string, role: string, focus: string, data: string): string {
  return `${PLAIN_ENGLISH}

You are a kind but honest mentor. Below is one month (${month}) of a ${role}'s learning log.
Their focus: ${focus || 'not set'}.

"""
${data}
"""

Use only this data. Do not invent numbers or events. If the data is thin, say so.

Return JSON:
- "summary": the month in 2 sentences.
- "progress": 2-4 points where they really got better, each tied to the data.
- "avoiding": 1-3 things they seem to avoid or keep missing, each tied to the data. Be direct, not harsh.
- "next": 2-3 small, concrete things to do next month.`;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.map((x) => str(x, 400)).filter(Boolean).slice(0, max) : []);

export function parseMonth(text: string): MonthReview {
  const d = JSON.parse(text) as Record<string, unknown>;
  const summary = str(d.summary, 600);
  const progress = list(d.progress, 4);
  const next = list(d.next, 3);
  if (!summary || !progress.length || !next.length) throw new Error('Missing parts');
  return { summary, progress, avoiding: list(d.avoiding, 3), next };
}

export function fakeMonth(): string {
  return JSON.stringify({
    summary: 'A steady month with fewer drills in the second half.',
    progress: ['Incident drills scored higher.', 'You finished four course modules.'],
    avoiding: ['Writing drills were skipped.'],
    next: ['Do one writing drill a week.', 'Write the week review every Sunday.'],
  });
}
