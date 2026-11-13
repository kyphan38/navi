'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import PageHead from '@/components/PageHead';
import { useNow } from '@/hooks/useNow';
import { useTerms } from '@/hooks/useTerms';
import { dueItems } from '@/lib/leitner';
import { updateTerm } from '@/lib/repo';
import { reviewPatch } from '@/lib/terms';

/**
 * Daily review: up to 5 due terms, one at a time. See the name, try to recall
 * it, show the meaning, then say if you knew it. No AI call.
 */
export default function TermReview() {
  const uid = useUid();
  const terms = useTerms();
  const now = useNow();
  // Fixed when the review starts, so answering does not reshuffle the list.
  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [right, setRight] = useState(0);

  if (terms && now && queue === null) setQueue(dueItems(terms, now).map((t) => t.id));
  const ids = queue ?? [];
  const term = terms?.find((t) => t.id === ids[index]);
  const finished = queue !== null && index >= ids.length;

  const answer = (knew: boolean) => {
    if (!term) return;
    updateTerm(uid, term.id, reviewPatch(term, knew, now));
    if (knew) setRight((n) => n + 1);
    setShown(false);
    setIndex((i) => i + 1);
  };

  return (
    <main className="column">
      <PageHead title="review" meta={queue && !finished ? `${index + 1}/${ids.length}` : undefined} />

      {finished ? (
        <div className="mt-10 text-[15px]">
          <p className="text-ink">{ids.length ? `Done. ${right} of ${ids.length} right.` : 'Nothing to review today.'}</p>
          <Link href="/terms/" className="mt-4 inline-block font-mono text-[12px] text-faint hover:text-ink">
            back to terms
          </Link>
        </div>
      ) : term ? (
        <div className="mt-12">
          <p className="font-mono text-[12px] text-faint">{term.area.toLowerCase()}</p>
          <p className="mt-1 text-[22px] text-ink">{term.name}</p>
          {shown ? (
            <>
              <p className="mt-4 text-[16px] leading-relaxed text-muted">{term.oneLine}</p>
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
