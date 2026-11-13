'use client';

import Link from 'next/link';
import { useSyncExternalStore, type ReactNode } from 'react';

import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import { useDrills } from '@/hooks/useDrills';
import { useStartDrill } from '@/hooks/useStartDrill';
import { dayOf, parseDay } from '@/lib/day';
import { scorePercent, todayDrill, typeLabel } from '@/lib/drills';

const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const noop = () => () => {};

/** One stop on today's route: a dot (filled when done), a label, and the step. */
function Stop({ done, label, children }: { done: boolean; label: string; children: ReactNode }) {
  return (
    <li className="relative py-2.5 pl-6">
      <span className="route-dot" data-on={done} aria-hidden />
      <span className="mr-3 font-mono text-[12px] text-faint">{label}</span>
      {children}
    </li>
  );
}

export default function TodayView() {
  // Read on the client only: the static build has no "today".
  const day = useSyncExternalStore(noop, () => dayOf(Date.now()), () => '');
  const drills = useDrills();
  const { start, busy, error } = useStartDrill();
  const pick = day && drills ? todayDrill(day, drills) : null;

  return (
    <main className="column">
      <PageHead title="today" meta={day ? fmt.format(parseDay(day)) : undefined} />

      {pick && (
        <ul className="route mt-8 text-[15px]">
          <Stop done={pick.state === 'done'} label="drill">
            {pick.state === 'todo' && (
              <span className="inline-flex flex-wrap items-baseline gap-x-3">
                <span className="text-ink">
                  {typeLabel(pick.type)} <span className="font-mono text-[12px] text-faint">{pick.level}</span>
                </span>
                {busy ? (
                  <Waiting />
                ) : (
                  <button type="button" onClick={() => void start(pick.type, pick.level)} className="text-faint transition-colors hover:text-ink">
                    start
                  </button>
                )}
              </span>
            )}
            {pick.state === 'active' && (
              <Link href={`/drill/play/?id=${pick.drill.id}`} className="group inline-flex items-baseline gap-3">
                <span className="text-ink">{pick.drill.topic}</span>
                <span className="text-faint transition-colors group-hover:text-ink">continue</span>
              </Link>
            )}
            {pick.state === 'done' && (
              <Link href={`/drill/play/?id=${pick.drill.id}`} className="group inline-flex items-baseline gap-3">
                <span className="text-muted transition-colors group-hover:text-ink">{pick.drill.topic}</span>
                <span className="font-mono text-[12px] text-faint tabular-nums">{scorePercent(pick.drill.score) ?? '-'}%</span>
              </Link>
            )}
          </Stop>
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 pl-6 text-[14px] text-muted">
          {error}
        </p>
      )}
    </main>
  );
}
