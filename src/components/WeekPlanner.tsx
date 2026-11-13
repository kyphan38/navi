'use client';

import { useRef, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { useNow } from '@/hooks/useNow';
import type { useLearning } from '@/hooks/useLearning';
import { addDays } from '@/lib/day';
import { drillTopics, forecast, hm, mondayOf, planWeek, weekOf } from '@/lib/plan';
import { saveWeek, updateCourse, updateWeek, type CourseDoc } from '@/lib/repo';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const field = 'w-full border-b border-line bg-transparent pb-1 text-[16px] text-ink placeholder:text-faint focus:border-line-strong';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-2 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

/** "At 5h a week you finish around 15 May, after your deadline (31 Mar)." */
export function ForecastLine({ course, budgetMinutes, now }: { course: CourseDoc; budgetMinutes: number; now: number }) {
  const uid = useUid();
  const [moving, setMoving] = useState(false);
  const f = forecast(course.modules, budgetMinutes, now, course.deadline);
  if (f.minutesLeft === 0) return <p className="text-[14px] text-muted">All modules done.</p>;
  return (
    <div className="text-[14px] text-muted">
      <p>
        At {hm(budgetMinutes)} a week you finish {f.finishAt ? `around ${dateFmt.format(f.finishAt)}` : 'never'}
        {f.late && course.deadline ? (
          <>
            , <span className="font-medium text-ink">after</span> your deadline ({dateFmt.format(course.deadline)}).
          </>
        ) : (
          '.'
        )}
      </p>
      {f.late && (
        <div className="mt-1 flex items-baseline gap-4 font-mono text-[12px]">
          {moving ? (
            <input
              type="date"
              aria-label="New deadline"
              onChange={(e) => {
                const [y, m, d] = e.target.value.split('-').map(Number);
                if (y && m && d) {
                  updateCourse(uid, course.id, { deadline: new Date(y, m - 1, d, 23, 59).getTime() });
                  setMoving(false);
                }
              }}
              className="bg-transparent text-ink"
            />
          ) : (
            <button type="button" onClick={() => setMoving(true)} className="text-faint hover:text-ink">
              move deadline
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Weekly review and plan (PLAN-navi.md 7.3): look back, set the budget, confirm. */
export default function WeekPlanner({ learning, course }: { learning: ReturnType<typeof useLearning>; course: CourseDoc }) {
  const uid = useUid();
  const now = useNow();
  const { today, weekId, weeks, days, budget } = learning;
  // null = not edited: follow the budget (the profile can load a moment later).
  const [hoursEdit, setHours] = useState<string | null>(null);
  const hours = hoursEdit ?? String(Math.round((budget.minutes / 60) * 10) / 10);
  const [why, setWhy] = useState('');
  const [workTask, setWorkTask] = useState('');
  const [explore, setExplore] = useState('');
  const hoursRef = useRef<HTMLInputElement>(null);

  const budgetMinutes = Math.max(0, Math.round((Number(hours) || 0) * 60));
  const planned = planWeek(course.modules, budgetMinutes);
  const plannedMinutes = planned.reduce((s, m) => s + m.minutes, 0);

  // Last week, if it was planned and not looked back on yet.
  const lastId = weekOf(addDays(mondayOf(today), -7));
  const last = weeks.find((w) => w.id === lastId && !w.review) ?? null;
  const lastIds = new Set(last?.plan.moduleIds ?? []);
  const lastModules = course.modules.filter((m) => lastIds.has(m.id));
  const lastDone = lastModules.filter((m) => m.doneAt !== null);
  const lastMissed = lastModules.filter((m) => m.doneAt === null);
  const lastMinutes = days.filter((d) => weekOf(d.id) === lastId).reduce((s, d) => s + d.minutes, 0);
  const f = forecast(course.modules, budgetMinutes, now, course.deadline);

  const confirm = () => {
    if (last) {
      updateWeek(uid, last.id, {
        minutesDone: lastMinutes,
        review: {
          done: `${lastDone.length} of ${lastModules.length} modules, ${hm(lastMinutes)}`,
          missed: lastMissed.slice(0, 3).map((m) => m.title).join('; ').slice(0, 300),
          why: why.trim().slice(0, 300),
        },
      });
    }
    saveWeek(uid, weekId, {
      plan: {
        moduleIds: planned.map((m) => m.id),
        drillTopics: drillTopics(planned),
        workTask: workTask.trim().slice(0, 300) || null,
        explore: explore.trim().slice(0, 300) || null,
      },
      minutesPlanned: budgetMinutes,
      minutesDone: 0,
      review: null,
      createdAt: now,
      updatedAt: now,
    });
  };

  return (
    <div className="space-y-8 text-[15px]">
      {last && (
        <section>
          <SectionTitle>last week</SectionTitle>
          <p className="text-ink">
            {lastDone.length} of {lastModules.length} modules · {hm(lastMinutes)}
          </p>
          {lastMissed.length > 0 && <p className="mt-0.5 text-[14px] text-faint">missed: {lastMissed.slice(0, 3).map((m) => m.title).join(', ')}</p>}
          <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} placeholder="why, in one line" aria-label="Why" className={`${field} mt-3`} />
        </section>
      )}

      <section>
        <SectionTitle>this week</SectionTitle>
        <label className="flex items-baseline gap-3">
          <input
            ref={hoursRef}
            type="number"
            min={0}
            max={40}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            aria-label="Hours this week"
            className="w-14 border-b border-line bg-transparent pb-0.5 text-right font-mono text-[16px] text-ink tabular-nums focus:border-line-strong"
          />
          <span className="text-muted">hours</span>
          <span className="font-mono text-[12px] text-faint">{budget.real ? 'your real average' : 'from settings'}</span>
        </label>
        <p className="mt-3 text-muted">
          {planned.length} modules · {hm(plannedMinutes)}
          {planned[0] && <span className="text-faint"> · from {planned[0].title}</span>}
        </p>
        <div className="mt-4 space-y-3">
          <input value={workTask} onChange={(e) => setWorkTask(e.target.value)} maxLength={300} placeholder="one task linked to work (optional)" aria-label="Work task" className={field} />
          <input value={explore} onChange={(e) => setExplore(e.target.value)} maxLength={300} placeholder="something new to explore (optional)" aria-label="Explore" className={field} />
        </div>
        <div className="mt-4">
          <ForecastLine course={course} budgetMinutes={budgetMinutes} now={now} />
          {f.late && (
            <button type="button" onClick={() => hoursRef.current?.focus()} className="mt-1 font-mono text-[12px] text-faint hover:text-ink">
              more hours
            </button>
          )}
        </div>
      </section>

      <button type="button" onClick={confirm} disabled={!planned.length} className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97] disabled:opacity-30">
        confirm
      </button>
    </div>
  );
}
