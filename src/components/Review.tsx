'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import PageHead from '@/components/PageHead';
import { useMistakes } from '@/hooks/useMistakes';
import { useNow } from '@/hooks/useNow';
import { useTerms } from '@/hooks/useTerms';
import { dueItems, review } from '@/lib/leitner';
import { updateMistake, updateTerm } from '@/lib/repo';
import { reviewPatch } from '@/lib/terms';

type Item = { kind: 'term' | 'mistake'; id: string; nextReviewAt: number | null };

/** Due terms and mistakes together, oldest due first, at most 5 a day (PLAN-navi.md 10). */
export function reviewQueue(terms: Item[], mistakes: Item[], now: number): Item[] {
  return dueItems([...terms, ...mistakes], now, 5);
}

/**
 * Daily review, no AI call. A term: see the name, recall it, show the meaning.
 * A mistake: see what went wrong, think what to do instead, show the lesson.
 * Then say if you knew it; the Leitner box moves.
 */
export default function Review() {
  const uid = useUid();
  const terms = useTerms();
  const mistakes = useMistakes();
  const now = useNow();
  // Fixed when the review starts, so answering does not reshuffle the list.
  const [queue, setQueue] = useState<Item[] | null>(null);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [right, setRight] = useState(0);

  if (terms && mistakes && now && queue === null) {
    setQueue(
      reviewQueue(
        terms.map((t) => ({ kind: 'term', id: t.id, nextReviewAt: t.nextReviewAt })),
        mistakes.map((m) => ({ kind: 'mistake', id: m.id, nextReviewAt: m.nextReviewAt })),
        now,
      ),
    );
  }
  const items = queue ?? [];
  const item = items[index];
  const term = item?.kind === 'term' ? terms?.find((t) => t.id === item.id) : undefined;
  const mistake = item?.kind === 'mistake' ? mistakes?.find((m) => m.id === item.id) : undefined;
  const finished = queue !== null && index >= items.length;

  const answer = (knew: boolean) => {
    if (term) updateTerm(uid, term.id, reviewPatch(term, knew, now));
    if (mistake) {
      const r = review(mistake.box, knew, now);
      updateMistake(uid, mistake.id, { box: r.box, nextReviewAt: r.nextReviewAt });
    }
    if (knew) setRight((n) => n + 1);
    setShown(false);
    setIndex((i) => i + 1);
  };

  return (
    <main className="column">
      <PageHead title="review" meta={queue && !finished ? `${index + 1}/${items.length}` : undefined} />

      {finished ? (
        <div className="mt-10 text-[15px]">
          <p className="text-ink">{items.length ? `Done. ${right} of ${items.length} right.` : 'Nothing to review today.'}</p>
          <Link href="/" className="mt-4 inline-block font-mono text-[12px] text-faint hover:text-ink">
            back to today
          </Link>
        </div>
      ) : term || mistake ? (
        <div className="mt-12">
          <p className="font-mono text-[12px] text-faint">{term ? term.area.toLowerCase() : 'from a drill'}</p>
          {term ? (
            <p className="mt-1 text-[22px] text-ink">{term.name}</p>
          ) : (
            <>
              <p className="mt-1 text-[18px] leading-relaxed text-ink">{mistake!.text}</p>
              <p className="mt-2 text-[14px] text-faint">What should you do instead?</p>
            </>
          )}
          {shown ? (
            <>
              <p className="mt-4 text-[16px] leading-relaxed text-muted">{term ? term.oneLine : mistake!.lesson}</p>
              <div className="mt-8 flex items-center gap-5">
                <button type="button" onClick={() => answer(true)} className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97]">
                  knew it
                </button>
                <button type="button" onClick={() => answer(false)} className="text-[14px] text-faint hover:text-ink">
                  not yet
                </button>
              </div>
            </>
          ) : (
            <button type="button" onClick={() => setShown(true)} className="mt-8 rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97]">
              show
            </button>
          )}
        </div>
      ) : null}
    </main>
  );
}
