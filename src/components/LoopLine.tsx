'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { usePathname } from 'next/navigation';

import { useBasicsLine } from '@/components/basics/BasicsStop';
import { useReviewDue } from '@/hooks/useReviewDue';
import { useTodayDrill } from '@/hooks/useTodayDrill';
import { loopKeyOf, loopSteps } from '@/lib/loop';

/**
 * Today's stops as a short route line (PLAN-guide G2): done stops a gray dot,
 * the current one a filled ink dot, the rest an empty dot.
 */
export default function LoopLine() {
  const here = loopKeyOf(usePathname());
  const { pick } = useTodayDrill();
  const basics = useBasicsLine();
  const reviewDue = useReviewDue();
  if (!pick) return null;

  // The page you are on is always a stop, even before it has anything in it.
  const steps = loopSteps({
    drillDone: pick.state === 'done',
    basicsDone: basics ? basics.done : here === 'basics' ? false : null,
    reviewDue: reviewDue ?? (here === 'review' ? 0 : null),
  });
  if (steps.length < 2) return null;

  return (
    <nav aria-label="Today's loop" className="mt-5 flex items-center font-mono text-[12px]">
      {steps.map((s, i) => {
        const on = s.key === here;
        return (
          <Fragment key={s.key}>
            {i > 0 && <span aria-hidden className="mx-2 h-px w-8 bg-line-strong" />}
            <Link
              href={s.href}
              aria-current={on ? 'step' : undefined}
              className={`flex items-center gap-1.5 transition-colors hover:text-ink ${on ? 'text-ink' : s.done ? 'text-muted' : 'text-faint'}`}
            >
              <span
                aria-hidden
                className={`size-[7px] rounded-full border ${on ? 'border-ink bg-ink' : s.done ? 'border-faint bg-faint' : 'border-line-strong'}`}
              />
              {s.key}
              {s.done && !on && <span className="sr-only">(done)</span>}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
