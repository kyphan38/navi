// Drill helpers with no React or Firestore, so `node --test` can cover them.

import { dayOf, parseDay } from '@/lib/day';
import type { Criterion, Drill, DrillGroup, DrillLevel, DrillType, Score } from '@/types/navi';

const ALL: readonly DrillLevel[] = ['easy', 'medium', 'hard'];

/** All drill types (PLAN-navi.md 6.3). Server list: functions/src/drill/catalog.ts (a test keeps them equal). */
export const DRILL_TYPES: readonly { type: DrillType; group: DrillGroup; label: string; line: string; levels: readonly DrillLevel[] }[] = [
  { type: 'incident', group: 'tech', label: 'incident', line: 'Something breaks in production. What do you do?', levels: ALL },
  { type: 'security-review', group: 'tech', label: 'security review', line: 'Find the risks in Terraform or IAM.', levels: ALL },
  { type: 'why-chain', group: 'tech', label: 'why chain', line: 'Ask "why" until you reach the real cause.', levels: ALL },
  { type: 'tradeoff', group: 'tech', label: 'trade-off', line: 'Pick an option and defend it.', levels: ALL },
  { type: 'logs', group: 'tech', label: 'logs', line: 'Find the signal in logs and numbers.', levels: ALL },
  { type: 'cost', group: 'tech', label: 'cost', line: 'The cloud bill went up. Why?', levels: ALL },
  { type: 'review-ai-output', group: 'ai', label: 'review AI output', line: 'Find the mistakes in code an AI wrote.', levels: ALL },
  { type: 'brief-an-agent', group: 'ai', label: 'brief an agent', line: 'Write a clear, safe task for an AI agent.', levels: ALL },
  { type: 'use-ai-or-not', group: 'ai', label: 'use AI or not', line: 'AI, together, or by hand? Name the risk.', levels: ALL },
  { type: 'three-audiences', group: 'comms', label: 'three audiences', line: 'One problem, told to a dev, a manager and a customer.', levels: ALL },
  { type: 'say-no', group: 'comms', label: 'say no', line: 'Push back on a risky request, kindly.', levels: ALL },
  { type: 'clarify', group: 'comms', label: 'clarify', line: 'Turn a vague request into clear work.', levels: ALL },
  { type: 'feedback', group: 'comms', label: 'feedback', line: 'Give and take feedback well.', levels: ALL },
  { type: 'status-update', group: 'comms', label: 'status update', line: 'Three clear lines while things are on fire.', levels: ALL },
  { type: 'payment-case', group: 'business', label: 'payment case', line: 'Charged twice, stuck, or failed. Find out why.', levels: ALL },
  { type: 'business-impact', group: 'business', label: 'business impact', line: 'Customers, money, rules: how bad is it?', levels: ALL },
  { type: 'postmortem', group: 'writing', label: 'postmortem', line: 'Write a short, blameless postmortem.', levels: ALL },
  { type: 'cr-risk', group: 'writing', label: 'change risk', line: 'Risk, test and rollback for a change.', levels: ALL },
  { type: 'prioritize', group: 'writing', label: 'prioritize', line: 'Six tasks, time for three.', levels: ALL },
];

export const GROUPS: readonly { group: DrillGroup; label: string }[] = [
  { group: 'tech', label: 'tech' },
  { group: 'ai', label: 'working with AI' },
  { group: 'comms', label: 'communication' },
  { group: 'business', label: 'business' },
  { group: 'writing', label: 'writing and decisions' },
];

export function groupOf(type: DrillType): DrillGroup {
  return DRILL_TYPES.find((t) => t.type === type)?.group ?? 'tech';
}

/**
 * Levels open for one type (PLAN-navi.md 6.2), same rule as the server's
 * openLevels: the next level opens after the last 3 done drills at the level
 * below all scored 70%+; a level already used stays open. Newest first.
 */
export function openLevels(done: Pick<Drill, 'level' | 'score'>[]): DrillLevel[] {
  const open: DrillLevel[] = ['easy'];
  for (let i = 1; i < ALL.length; i++) {
    const below = done.filter((d) => d.level === ALL[i - 1]).slice(0, 3);
    const earned = below.length === 3 && below.every((d) => (scorePercent(d.score) ?? 0) >= 70);
    if (earned || done.some((d) => d.level === ALL[i])) open.push(ALL[i]);
    else break;
  }
  return open;
}

/** How far to the next level: done drills at 70%+ among the last 3 at the top open level. */
export function unlockProgress(done: Pick<Drill, 'level' | 'score'>[]): { next: DrillLevel; good: number } | null {
  const open = openLevels(done);
  if (open.length === ALL.length) return null;
  const top = open[open.length - 1];
  const last3 = done.filter((d) => d.level === top).slice(0, 3);
  return { next: ALL[open.length], good: last3.filter((d) => (scorePercent(d.score) ?? 0) >= 70).length };
}

/** Done drills of one type, newest first. */
export function doneOfType(drills: (Drill & { id: string })[], type: DrillType) {
  return drills.filter((d) => d.type === type && d.status === 'done').sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
}

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
  const type = typeForDay(day);
  const history = doneOfType(drills, type);
  const open = openLevels(history);
  // Sunday: the longest incident at the highest open level. Else keep the last level used.
  const level = parseDay(day).getDay() === 0 ? open[open.length - 1] : history[0] && open.includes(history[0].level) ? history[0].level : 'easy';
  return { state: 'todo', type, level };
}

/**
 * Which type a day gets (PLAN-navi.md 6.4): about half the days are tech
 * (rotating its 6 types), the others rotate the 4 other groups. Sunday is incident.
 */
export function typeForDay(day: string): DrillType {
  if (parseDay(day).getDay() === 0) return 'incident';
  const n = dayNumber(day);
  const half = Math.floor(n / 2);
  const tech = DRILL_TYPES.filter((t) => t.group === 'tech');
  if (n % 2 === 0) return tech[half % tech.length].type;
  const others = GROUPS.filter((g) => g.group !== 'tech');
  const group = others[half % others.length].group;
  const inGroup = DRILL_TYPES.filter((t) => t.group === group);
  return inGroup[Math.floor(half / others.length) % inGroup.length].type;
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
