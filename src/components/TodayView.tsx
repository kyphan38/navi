'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import PageHead from '@/components/PageHead';
import DayNote from '@/components/DayNote';
import ModuleRow from '@/components/ModuleRow';
import Waiting from '@/components/Waiting';
import { useTerms } from '@/hooks/useTerms';
import { useStartDrill } from '@/hooks/useStartDrill';
import { useTick } from '@/hooks/useTick';
import { useTodayDrill } from '@/hooks/useTodayDrill';
import { BasicsLink, useBasicsLine } from '@/components/basics/BasicsStop';
import { parseDay } from '@/lib/day';
import { scorePercent, typeLabel } from '@/lib/drills';
import { dueItems } from '@/lib/leitner';
import { todayModules } from '@/lib/plan';

const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** One stop on today's route: a dot (filled when done), a label, and the step. */
function Stop({ done, label, children }: { done: boolean; label: string; children: ReactNode }) {
  return (
    <li className="relative py-2.5 pl-6">
      {/* On the first line, not the middle, when a stop has several rows. */}
      <span className="route-dot" data-on={done} style={{ top: '21px' }} aria-hidden />
      <span className="mr-3 font-mono text-[12px] text-faint">{label}</span>
      {children}
    </li>
  );
}

export default function TodayView() {
  const { day, mistakes, now, learning, pick, redo, next, area } = useTodayDrill();
  const { start, busy, error } = useStartDrill();
  const terms = useTerms();
  const basics = useBasicsLine();
  // Review shows once anything is in review; done = nothing due right now. At most 5 a day.
  const inReview = (terms ?? []).some((t) => t.status === 'learning') || (mistakes ?? []).some((m) => m.nextReviewAt !== null);
  const due = terms && mistakes && now ? dueItems([...terms, ...mistakes], now).length : 0;
  const { course, courses, week, todayDoc } = learning;
  const tick = useTick(courses, day, todayDoc);
  // Planned modules of every running course (V6), in course order.
  const planned = week ? courses.flatMap((c) => c.modules.filter((m) => week.plan.moduleIds.includes(m.id))) : [];
  const mods = day ? todayModules(planned, day, new Set(todayDoc?.moduleIds ?? [])) : [];
  const learnDone = mods.length > 0 && mods.every((m) => m.doneAt !== null);

  return (
    <main className="column">
      <PageHead title="today" meta={day ? fmt.format(parseDay(day)) : undefined} />

      {pick && (
        <ul className="route mt-8 text-[15px]">
          {learning.ready && course && !week && (
            <Stop done={false} label="learn">
              <Link href="/learn/" className="group inline-flex items-baseline gap-3">
                <span className="text-ink">plan this week</span>
                <span className="text-faint transition-colors group-hover:text-ink">open</span>
              </Link>
            </Stop>
          )}
          {week && course && (
            <Stop done={learnDone || (planned.length > 0 && mods.length === 0)} label="learn">
              {mods.length === 0 ? (
                <span className="text-muted">{planned.length ? 'week done' : 'nothing planned'}</span>
              ) : (
                <div className="-mt-0.5">
                  {mods.map((m) => (
                    <ModuleRow key={m.id} m={m} onToggle={(d) => tick(m, d)} showDoneWhen />
                  ))}
                  {todayDoc && todayDoc.moduleIds.length > 0 && <DayNote day={day} doc={todayDoc} />}
                </div>
              )}
            </Stop>
          )}
          <Stop done={pick.state === 'done'} label="drill">
            {next && (
              <span className="inline-flex flex-wrap items-baseline gap-x-3">
                <span className="text-ink">
                  {typeLabel(next.type)} <span className="font-mono text-[12px] text-faint">{next.level}</span>
                </span>
                {next.topic && <span className="min-w-0 text-[14px] text-faint">{next.topic}</span>}
                {area && <span className="font-mono text-[11px] text-faint">{area.toLowerCase()}</span>}
                {busy ? (
                  <Waiting />
                ) : (
                  <button
                    type="button"
                    onClick={() => void start(next.type, next.level, next.topic, undefined, next.skillId)}
                    className="text-faint transition-colors hover:text-ink"
                  >
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
            {redo && !busy && (
              <span className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <span className="font-mono text-[12px] text-faint">redo</span>
                <span className="text-muted">{redo.drill.topic}</span>
                <span className="font-mono text-[12px] text-faint">
                  {scorePercent(redo.drill.score)}% · {redo.level}
                </span>
                <button
                  type="button"
                  onClick={() => void start(redo.drill.type, redo.level, redo.drill.topic, redo.drill.id)}
                  className="text-faint transition-colors hover:text-ink"
                >
                  start
                </button>
              </span>
            )}
          </Stop>
          {basics && (
            <Stop done={basics.done} label="basics">
              <BasicsLink line={basics} />
            </Stop>
          )}
          {inReview && (
            <Stop done={due === 0} label="review">
              {due > 0 ? (
                <Link href="/review/" className="group inline-flex items-baseline gap-3">
                  <span className="text-ink">{due} to review</span>
                  <span className="text-faint transition-colors group-hover:text-ink">start</span>
                </Link>
              ) : (
                <span className="text-muted">nothing due</span>
              )}
            </Stop>
          )}
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
