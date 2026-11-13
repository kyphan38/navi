'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import CourseAdd from '@/components/CourseAdd';
import ModuleRow from '@/components/ModuleRow';
import PageHead from '@/components/PageHead';
import WeekPlanner, { ForecastLine } from '@/components/WeekPlanner';
import { useLearning } from '@/hooks/useLearning';
import { useNow } from '@/hooks/useNow';
import { useTick } from '@/hooks/useTick';
import { hm } from '@/lib/plan';
import { deleteCourse } from '@/lib/repo';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-2 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

export default function LearnView() {
  const uid = useUid();
  const now = useNow();
  const learning = useLearning();
  const { ready, course, week, today, todayDoc } = learning;
  const tick = useTick(course, today, todayDoc);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!ready) return <main className="column" />;

  if (!course) {
    return (
      <main className="column">
        <PageHead title="learn" />
        <CourseAdd />
      </main>
    );
  }

  const done = course.modules.filter((m) => m.doneAt !== null).length;
  const left = course.modules.filter((m) => m.doneAt === null).reduce((s, m) => s + m.minutes, 0);
  const planned = week ? course.modules.filter((m) => week.plan.moduleIds.includes(m.id)) : [];
  const sections = [...new Set(course.modules.map((m) => m.section))];
  // The section of the next module to do starts open.
  const current = course.modules.find((m) => m.doneAt === null)?.section ?? null;

  return (
    <main className="column">
      <PageHead title="learn" meta={`${done}/${course.modules.length} · ${hm(left)} left`} />

      <div className="mt-8">
        <p className="text-[16px] text-ink">{course.title}</p>
        {course.goal && <p className="text-[14px] text-faint">{course.goal}</p>}
        {/* Without a week plan, the planner below shows the forecast for the hours being set. */}
        {week && (
          <div className="mt-3">
            <ForecastLine course={course} budgetMinutes={week.minutesPlanned} now={now} />
          </div>
        )}
      </div>

      <div className="mt-10">
        {week ? (
          <section className="text-[15px]">
            <SectionTitle>this week</SectionTitle>
            {planned.map((m) => (
              <ModuleRow key={m.id} m={m} onToggle={(d) => tick(m, d)} showDoneWhen />
            ))}
            {week.plan.workTask && (
              <p className="mt-3 text-[14px] text-muted">
                <span className="mr-2 font-mono text-[12px] text-faint">work</span>
                {week.plan.workTask}
              </p>
            )}
            {week.plan.explore && (
              <p className="mt-1 text-[14px] text-muted">
                <span className="mr-2 font-mono text-[12px] text-faint">explore</span>
                {week.plan.explore}
              </p>
            )}
          </section>
        ) : (
          <WeekPlanner learning={learning} course={course} />
        )}
      </div>

      <section className="mt-12 text-[15px]">
        <SectionTitle>all modules</SectionTitle>
        {sections.map((sec) => {
          const ms = course.modules.filter((m) => m.section === sec);
          const isOpen = (openSection ?? current) === sec;
          return (
            <div key={sec}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenSection(isOpen ? '' : sec)}
                className="flex w-full items-baseline gap-3 py-2 text-left"
              >
                <span className={`min-w-0 flex-1 truncate ${isOpen ? 'text-ink' : 'text-muted'}`}>{sec}</span>
                <span className="shrink-0 font-mono text-[12px] text-faint tabular-nums">
                  {ms.filter((m) => m.doneAt !== null).length}/{ms.length}
                </span>
              </button>
              {isOpen && (
                <div className="mb-3 ml-1 border-l border-line-strong pl-4">
                  {ms.map((m) => (
                    <ModuleRow key={m.id} m={m} onToggle={(d) => tick(m, d)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="mt-12 font-mono text-[12px]">
        {confirmRemove ? (
          <span className="flex gap-4">
            <button type="button" onClick={() => deleteCourse(uid, course.id)} className="text-ink">
              remove the course
            </button>
            <button type="button" onClick={() => setConfirmRemove(false)} className="text-faint hover:text-ink">
              keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmRemove(true)} className="text-faint hover:text-ink">
            remove course
          </button>
        )}
      </div>
    </main>
  );
}
