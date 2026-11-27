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
  lastKind: 'predict' | 'myth' | null;
  stuckAt: number[];
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

/** The other kind than last time, so a review never repeats the same angle. */
export function nextKind(last: 'predict' | 'myth' | null): 'predict' | 'myth' {
  return last === 'predict' ? 'myth' : 'predict';
}

/** Day id 'YYYY-MM-DD' in Vietnam time (UTC+7, no daylight saving), the same days as the app. */
export function vnDay(now: number): string {
  return new Date(now + 7 * 3_600_000).toISOString().slice(0, 10);
}
