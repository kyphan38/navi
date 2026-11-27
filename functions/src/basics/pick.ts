// Basics (PLAN-basics.md 4): what today's session holds. Pure: the root test suite imports it.

import { CONCEPTS, DECKS, type Concept } from './catalog.ts';

const DAY = 86_400_000;
export const MAX_REVIEWS = 2;
/** "I don't get it" this many times in one deck within 7 days makes that deck's new questions easier. */
export const STUCK_LIMIT = 2;

/** What the server needs from users/{uid}/basics/{id}. */
export type StateLite = {
  status: 'reading' | 'learning' | 'learned';
  box: number;
  nextReviewAt: number | null;
  lastKind: Kind | null;
  stuckAt: number[];
  updatedAt?: number;
};

/** Started = the check after the lesson was answered (learning or learned). */
const started = (s: StateLite | undefined) => !!s && s.status !== 'reading';

/** The next concept to learn: decks in order, catalog order inside, every prereq started. */
export function nextConcept(states: ReadonlyMap<string, StateLite>, catalog: readonly Concept[] = CONCEPTS): string | null {
  for (const deck of DECKS) {
    for (const c of catalog) {
      if (c.deck !== deck || states.has(c.id)) continue;
      if (c.prereqs.every((p) => started(states.get(p)))) return c.id;
    }
  }
  return null;
}

/**
 * Today's session: up to 2 due reviews (oldest first) and 1 new concept. A lesson
 * opened but not finished comes back first. `spare` is the concept after `next`,
 * written ahead so "one more" needs no wait.
 */
export function pickSession(
  states: ReadonlyMap<string, StateLite>,
  now: number,
  catalog: readonly Concept[] = CONCEPTS,
): { reviews: string[]; next: string | null; spare: string | null } {
  // Only ids from the catalog: a stray doc (old concept, test data) is never picked.
  const known = new Set(catalog.map((c) => c.id));
  const reviews = [...states.entries()]
    .filter(([id, s]) => known.has(id) && s.status === 'learning' && s.nextReviewAt !== null && s.nextReviewAt <= now)
    .sort((a, b) => (a[1].nextReviewAt ?? 0) - (b[1].nextReviewAt ?? 0))
    .slice(0, MAX_REVIEWS)
    .map(([id]) => id);
  const reading = catalog.find((c) => states.get(c.id)?.status === 'reading')?.id ?? null;
  const next = reading ?? nextConcept(states, catalog);
  let spare: string | null = null;
  if (next) {
    const after = new Map(states);
    after.set(next, { status: 'learning', box: 1, nextReviewAt: null, lastKind: null, stuckAt: [] });
    spare = nextConcept(after, catalog);
  }
  return { reviews, next, spare };
}

/** Question level from the Leitner box: 1 easy, 2 a real case, 3 noisy and linked to other concepts. */
export function levelFor(box: number): 1 | 2 | 3 {
  return box <= 1 ? 1 : box <= 3 ? 2 : 3;
}

/** True when the learner got stuck too often in this deck lately: its questions get one step easier. */
export function deckStuck(deck: string, states: ReadonlyMap<string, StateLite>, now: number, catalog: readonly Concept[] = CONCEPTS): boolean {
  const inDeck = new Set(catalog.filter((c) => c.deck === deck).map((c) => c.id));
  let n = 0;
  for (const [id, s] of states) if (inDeck.has(id)) n += s.stuckAt.filter((t) => now - t <= 7 * DAY).length;
  return n >= STUCK_LIMIT;
}

export type Kind = 'predict' | 'myth' | 'command' | 'order';
/** Review kinds in turn, so a review never repeats the angle of the last one. */
export const KINDS: readonly Kind[] = ['predict', 'myth', 'command', 'order'];

export function nextKind(last: Kind | null): Kind {
  return last ? KINDS[(KINDS.indexOf(last) + 1) % KINDS.length] : 'predict';
}

/** Day id 'YYYY-MM-DD' in Vietnam time (UTC+7, no daylight saving), the same days as the app. */
export function vnDay(now: number): string {
  return new Date(now + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** What the learner is working on now: skills of the running track and of recent drills, recent term names. */
export type WorkSignals = { skills: ReadonlySet<string>; terms: readonly string[] };
export const LINK_REST_DAYS = 3;

/**
 * One concept already learned that fits the learner's current work, for a
 * "linked" card when fewer than 2 reviews are due (PLAN-basics.md 10). A concept
 * scores one point per shared skill and per recent term found in its name or
 * focus; it must not be in today's reviews nor touched in the last 3 days.
 * Returns the best one and the work it links to, or null.
 */
export function linkedConcept(
  states: ReadonlyMap<string, StateLite>,
  work: WorkSignals,
  exclude: readonly string[],
  now: number,
  catalog: readonly Concept[] = CONCEPTS,
): { id: string; skill: string | null; term: string | null } | null {
  let best: { id: string; score: number; at: number; skill: string | null; term: string | null } | null = null;
  for (const c of catalog) {
    const s = states.get(c.id);
    if (!s || s.status === 'reading' || exclude.includes(c.id)) continue;
    if (s.updatedAt !== undefined && now - s.updatedAt < LINK_REST_DAYS * DAY) continue;
    const skills = c.skills.filter((k) => work.skills.has(k));
    const text = `${c.name} ${c.focus}`.toLowerCase();
    const terms = work.terms.filter((t) => t.length >= 3 && text.includes(t.toLowerCase()));
    const score = skills.length + terms.length;
    if (score === 0) continue;
    const at = s.updatedAt ?? 0;
    if (!best || score > best.score || (score === best.score && at < best.at)) best = { id: c.id, score, at, skill: skills[0] ?? null, term: terms[0] ?? null };
  }
  return best && { id: best.id, skill: best.skill, term: best.term };
}
