// Spaced review (PLAN-navi.md section 10). Pure, so `node --test` can cover it.

const DAY = 86_400_000;

/** Days until the next review for box 1..5. */
export const INTERVALS = [1, 3, 7, 14, 30] as const;

export type Box = 1 | 2 | 3 | 4 | 5;

/**
 * Result of one review. Right moves the item up a box, wrong sends it back to box 1.
 * Right in box 5 means it is learned: no more reviews.
 */
export function review(box: Box, correct: boolean, now: number): { box: Box; nextReviewAt: number | null; learned: boolean } {
  if (!correct) return { box: 1, nextReviewAt: now + INTERVALS[0] * DAY, learned: false };
  if (box >= 5) return { box: 5, nextReviewAt: null, learned: true };
  const next = (box + 1) as Box;
  return { box: next, nextReviewAt: now + INTERVALS[next - 1] * DAY, learned: false };
}

/** First review date for something just put into review. */
export function firstReview(now: number): number {
  return now + INTERVALS[0] * DAY;
}

/** Items due now, oldest due first, at most `max` (Today shows 5). */
export function dueItems<T extends { nextReviewAt: number | null }>(items: T[], now: number, max = 5): T[] {
  return items
    .filter((i) => i.nextReviewAt !== null && i.nextReviewAt <= now)
    .sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
    .slice(0, max);
}
