'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import ModuleRow from '@/components/ModuleRow';
import ModulePractice from '@/components/learn/ModulePractice';
import { ForecastLine } from '@/components/WeekPlanner';
import { hm } from '@/lib/plan';
import { deleteCourse, type CourseDoc, type WeekDoc } from '@/lib/repo';
import type { CourseModule } from '@/types/navi';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-2 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

/**
 * One running course on the Learn page: title, forecast, this week's modules,
 * all modules by section, and "practice" (exam questions, V4) on each module.
 */
export default function CourseBlock({
  course,
  week,
  weekMinutes,
  now,
  tick,
}: {
  course: CourseDoc;
  week: WeekDoc | null;
  /** This course's part of the week's planned minutes. */
  weekMinutes: number;
  now: number;
  tick: (m: CourseModule, done: boolean) => void;
}) {
  const uid = useUid();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [practice, setPractice] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const done = course.modules.filter((m) => m.doneAt !== null).length;
  const left = course.modules.filter((m) => m.doneAt === null).reduce((s, m) => s + m.minutes, 0);
  const planned = week ? course.modules.filter((m) => week.plan.moduleIds.includes(m.id)) : [];
  const sections = [...new Set(course.modules.map((m) => m.section))];
  // The section of the next module to do starts open.
  const current = course.modules.find((m) => m.doneAt === null)?.section ?? null;

  const row = (m: CourseModule, showDoneWhen = false) => (
    <div key={m.id}>
      <ModuleRow m={m} onToggle={(d) => tick(m, d)} showDoneWhen={showDoneWhen} onPractice={() => setPractice(practice === m.id ? null : m.id)} />
      {practice === m.id && <ModulePractice course={course} module={m} onClose={() => setPractice(null)} />}
    </div>
  );

  return (
    <article className="mt-10">
      <p className="text-[16px] text-ink">{course.title}</p>
      <p className="text-[14px] text-faint">
        {course.goal ? `${course.goal} · ` : ''}
        {done}/{course.modules.length} · {hm(left)} left
      </p>
      {week && (
        <div className="mt-3">
          <ForecastLine course={course} budgetMinutes={weekMinutes} now={now} />
        </div>
      )}

      {week && planned.length > 0 && (
        <section className="mt-6 text-[15px]">
          <SectionTitle>this week</SectionTitle>
          {planned.map((m) => row(m, true))}
        </section>
      )}

      <section className="mt-8 text-[15px]">
        <SectionTitle>all modules</SectionTitle>
        {sections.map((sec) => {
          const ms = course.modules.filter((m) => m.section === sec);
          const isOpen = (openSection ?? current) === sec;
          return (
            <div key={sec}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpenSection(isOpen ? '' : sec)} className="flex w-full items-baseline gap-3 py-2 text-left">
                <span className={`min-w-0 flex-1 truncate ${isOpen ? 'text-ink' : 'text-muted'}`}>{sec}</span>
                <span className="shrink-0 font-mono text-[12px] text-faint tabular-nums">
                  {ms.filter((m) => m.doneAt !== null).length}/{ms.length}
                </span>
              </button>
              {isOpen && <div className="mb-3 ml-1 border-l border-line-strong pl-4">{ms.map((m) => row(m))}</div>}
            </div>
          );
        })}
      </section>

      <div className="mt-6 font-mono text-[12px]">
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
    </article>
  );
}
