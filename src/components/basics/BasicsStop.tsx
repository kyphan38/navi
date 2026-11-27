'use client';

import Link from 'next/link';

import { useBasics } from '@/hooks/useBasics';
import { sessionSteps } from '@/lib/basics';

/** Today's basics as one line for the Today route: "1 new · 2 review", or done. */
export function useBasicsLine(): { done: boolean; text: string } | null {
  const { states, dayDoc, cards, ready } = useBasics();
  if (!ready || !states) return null;
  const steps = sessionSteps(dayDoc, cards, states);
  if (!dayDoc || steps.length === 0) return { done: false, text: 'not ready yet' };
  const left = steps.filter((s) => !s.done);
  if (!left.length) return { done: true, text: `${steps.length} done` };
  const lessons = left.filter((s) => s.kind === 'lesson').length;
  const reviews = left.length - lessons;
  return { done: false, text: [lessons ? `${lessons} new` : '', reviews ? `${reviews} review` : ''].filter(Boolean).join(' · ') };
}

export function BasicsLink({ line }: { line: { done: boolean; text: string } }) {
  return (
    <Link href="/basics/" className="group inline-flex items-baseline gap-3">
      <span className={line.done ? 'text-muted' : 'text-ink'}>{line.text}</span>
      {!line.done && <span className="text-faint transition-colors group-hover:text-ink">start</span>}
    </Link>
  );
}
