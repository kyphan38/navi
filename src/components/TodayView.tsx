'use client';

import Link from 'next/link';
import { useSyncExternalStore, type ReactNode } from 'react';

import PageHead from '@/components/PageHead';
import DayNote from '@/components/DayNote';
import ModuleRow from '@/components/ModuleRow';
import Waiting from '@/components/Waiting';
import { useDrills } from '@/hooks/useDrills';
import { useLearning } from '@/hooks/useLearning';
import { useNow } from '@/hooks/useNow';
import { useMistakes } from '@/hooks/useMistakes';
import { useTerms } from '@/hooks/useTerms';
import { useStartDrill } from '@/hooks/useStartDrill';
import { useTick } from '@/hooks/useTick';
import { dayOf, parseDay } from '@/lib/day';
import { scorePercent, todayDrill, topicForDay, typeLabel } from '@/lib/drills';
import { dueItems } from '@/lib/leitner';
import { todayModules } from '@/lib/plan';

const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const noop = () => () => {};

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
  // Read on the client only: the static build has no "today".
  const day = useSyncExternalStore(noop, () => dayOf(Date.now()), () => '');
  const drills = useDrills();
  const { start, busy, error } = useStartDrill();
  const pick = day && drills ? todayDrill(day, drills) : null;
  const terms = useTerms();
  const now = useNow();
  const mistakes = useMistakes();
  // Review shows once anything is in review; done = nothing due right now. At most 5 a day.
  const inReview = (terms ?? []).some((t) => t.status === 'learning') || (mistakes ?? []).some((m) => m.nextReviewAt !== null);
  const due = terms && mistakes && now ? dueItems([...terms, ...mistakes], now).length : 0;
  const learning = useLearning();
  const { course, week, todayDoc } = learning;
  const tick = useTick(course, day, todayDoc);
  const planned = course && week ? course.modules.filter((m) => week.plan.moduleIds.includes(m.id)) : [];
  const mods = day ? todayModules(planned, day, new Set(todayDoc?.moduleIds ?? [])) : [];
  const learnDone = mods.length > 0 && mods.every((m) => m.doneAt !== null);
  const topic = day && week ? topicForDay(day, week.plan.drillTopics) : undefined;

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
            {pick.state === 'todo' && (
              <span className="inline-flex flex-wrap items-baseline gap-x-3">
                <span className="text-ink">
                  {typeLabel(pick.type)} <span className="font-mono text-[12px] text-faint">{pick.level}</span>
                </span>
                {topic && <span className="min-w-0 text-[14px] text-faint">{topic}</span>}
                {busy ? (
                  <Waiting />
                ) : (
                  <button type="button" onClick={() => void start(pick.type, pick.level, topic)} className="text-faint transition-colors hover:text-ink">
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
