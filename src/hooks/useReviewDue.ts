'use client';

import { useMistakes } from '@/hooks/useMistakes';
import { useNow } from '@/hooks/useNow';
import { useTerms } from '@/hooks/useTerms';
import { dueItems } from '@/lib/leitner';

/**
 * Review items due now (terms + mistakes, at most 5 a day, as on Today).
 * null while loading or when nothing is in review yet.
 */
export function useReviewDue(): number | null {
  const terms = useTerms();
  const mistakes = useMistakes();
  const now = useNow();
  if (!terms || !mistakes || !now) return null;
  const inReview = terms.some((t) => t.status === 'learning') || mistakes.some((m) => m.nextReviewAt !== null);
  return inReview ? dueItems([...terms, ...mistakes], now).length : null;
}
