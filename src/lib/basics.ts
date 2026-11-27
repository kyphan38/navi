// Basics (PLAN-basics.md 5): how an answer changes the learner's state. Pure, with tests.

import { CONCEPTS } from '@/lib/basics-catalog';
import { review, type Box } from '@/lib/leitner';
import type { BasicKind, BasicState } from '@/types/navi';

const DAY = 86_400_000;

/** A new state when the lesson is opened for the first time. */
export function opened(deck: string, now: number): BasicState {
  return { deck, status: 'reading', readAt: now, box: 1, nextReviewAt: null, lastKind: null, blindSpots: 0, stuck: 0, stuckAt: [], updatedAt: now };
}

/**
 * The check right after the lesson. Right or wrong, the concept now goes into
 * review in box 1, first review tomorrow: it was taught either way. Wrong while
 * "sure" counts a blind spot (a wrong belief, worse than not knowing).
 */
export function afterCheck(s: BasicState, correct: boolean, sure: boolean, now: number): BasicState {
  return {
    ...s,
    status: 'learning',
    box: 1,
    nextReviewAt: now + DAY,
    blindSpots: s.blindSpots + (!correct && sure ? 1 : 0),
    updatedAt: now,
  };
}

/** A review question. "stuck" (I don't get it) is not wrong: the box stays, it comes back tomorrow. */
export function afterReview(s: BasicState, result: 'right' | 'wrong' | 'stuck', sure: boolean, kind: BasicKind, now: number): BasicState {
  if (result === 'stuck') {
    return { ...s, nextReviewAt: now + DAY, lastKind: kind, stuck: s.stuck + 1, stuckAt: [...s.stuckAt, now].slice(-5), updatedAt: now };
  }
  const r = review(s.box as Box, result === 'right', now);
  return {
    ...s,
    status: r.learned ? 'learned' : 'learning',
    box: r.box,
    nextReviewAt: r.nextReviewAt,
    lastKind: kind,
    blindSpots: s.blindSpots + (result === 'wrong' && sure ? 1 : 0),
    updatedAt: now,
  };
}

/** Stuck on a concept: its prereqs still in review come up in the next session. */
export function prereqsToBump(conceptId: string, states: ReadonlyMap<string, BasicState>): string[] {
  const c = CONCEPTS.find((x) => x.id === conceptId);
  return (c?.prereqs ?? []).filter((p) => states.get(p)?.status === 'learning');
}

/**
 * Words of `text` split around glossary terms for the dotted underline: whole
 * words only (a plural "s" is fine), longest term first, any case, and each term
 * only the first time it appears, so a paragraph does not turn into a row of links.
 */
export function markTerms(text: string, terms: readonly string[]): { text: string; term: string | null }[] {
  const list = terms.filter((t) => t.trim().length > 1).sort((a, b) => b.length - a.length);
  if (!list.length) return [{ text, term: null }];
  const esc = list.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(?<![A-Za-z0-9])(${esc.join('|')})(?:s|es)?(?![A-Za-z0-9])`, 'gi');
  const out: { text: string; term: string | null }[] = [];
  const used = new Set<string>();
  let last = 0;
  for (const m of text.matchAll(re)) {
    const term = list.find((t) => t.toLowerCase() === m[1].toLowerCase()) ?? m[1];
    if (used.has(term)) continue;
    used.add(term);
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), term: null });
    out.push({ text: m[0], term });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), term: null });
  return out.length ? out : [{ text, term: null }];
}

export type Step = { kind: 'lesson'; id: string; done: boolean } | { kind: 'card'; id: string; conceptId: string; done: boolean };

/**
 * Today's steps in order: the new lesson (with its check), then the review cards.
 * A lesson is done once its check is answered; a card once it has a result.
 * `extra`: a concept added with "one more".
 */
export function sessionSteps(
  day: { next: string | null; reviews: string[] } | null,
  cards: readonly { id: string; conceptId: string; result: string | null }[],
  states: ReadonlyMap<string, Pick<BasicState, 'status'>>,
  extra: string | null = null,
): Step[] {
  if (!day) return [];
  const lessonDone = (id: string) => {
    const s = states.get(id);
    return !!s && s.status !== 'reading';
  };
  const steps: Step[] = [];
  if (day.next) steps.push({ kind: 'lesson', id: day.next, done: lessonDone(day.next) });
  for (const id of day.reviews) {
    const c = cards.find((x) => x.conceptId === id);
    if (c) steps.push({ kind: 'card', id: c.id, conceptId: id, done: c.result !== null });
  }
  if (extra && extra !== day.next) steps.push({ kind: 'lesson', id: extra, done: lessonDone(extra) });
  return steps;
}

/** Days until the soonest review, for the quiet line at the end; null when nothing is in review. */
export function nextReviewIn(states: ReadonlyMap<string, Pick<BasicState, 'nextReviewAt'>>, now: number): number | null {
  const times = [...states.values()].map((s) => s.nextReviewAt).filter((t): t is number => t !== null && t > now);
  // Round, not ceil: the page clock can be a minute behind the time the review was set.
  return times.length ? Math.max(1, Math.round((Math.min(...times) - now) / DAY)) : null;
}

/** Text split around `inline code` (the model writes commands that way). */
export function splitCode(text: string): { text: string; code: boolean }[] {
  const out: { text: string; code: boolean }[] = [];
  text.split(/`([^`\n]+)`/).forEach((part, i) => {
    if (part) out.push({ text: part, code: i % 2 === 1 });
  });
  return out.length ? out : [{ text, code: false }];
}

/**
 * A "see it" part as one code block. The model sometimes writes fences inline
 * (```ps -ef```), which would read "ps" as a language name, so all fences are
 * dropped and the whole part becomes a single block.
 */
export function asCodeBlock(text: string): string {
  const body = text
    .replace(/```(?:bash|sh|shell|console|text|plaintext)?[ \t]*\n/g, '')
    .replace(/```/g, '')
    .trim();
  return '```\n' + body + '\n```';
}

/**
 * The order an "order" question shows its steps in: a fixed shuffle from a seed
 * (the card id), never the right order itself when there are 2 or more steps.
 */
export function shuffled(n: number, seed: string): number[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (n > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift()!);
  return idx;
}

/** An "order" answer is right when the picked steps are 0, 1, 2... */
export function orderRight(picks: readonly number[], n: number): boolean {
  return picks.length === n && picks.every((p, i) => p === i);
}

/**
 * Weekly "explain it back": a concept you know fairly well (box 3+ or learned),
 * not explained in the last 30 days, the one reviewed longest ago. Only once a week.
 */
export function explainPick(states: ReadonlyMap<string, BasicState>, now: number): string | null {
  const last = Math.max(0, ...[...states.values()].map((s) => s.explainedAt ?? 0));
  if (now - last < 7 * DAY) return null;
  const ok = [...states.entries()].filter(
    ([id, s]) => CONCEPTS.some((c) => c.id === id) && (s.status === 'learned' || s.box >= 3) && now - (s.explainedAt ?? 0) >= 30 * DAY,
  );
  ok.sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  return ok[0]?.[0] ?? null;
}

/**
 * Weekend lab (Saturday and Sunday): a concept you have reviewed at least once
 * (box 2+ or learned), linked to a skill, with no lab done yet; oldest first.
 */
export function labPick(states: ReadonlyMap<string, BasicState>, weekend: boolean): string | null {
  if (!weekend) return null;
  const ok = CONCEPTS.filter((c) => {
    const s = states.get(c.id);
    return !!s && c.skills.length > 0 && !s.labDoneAt && (s.status === 'learned' || (s.status === 'learning' && s.box >= 2));
  });
  return ok[0]?.id ?? null;
}
