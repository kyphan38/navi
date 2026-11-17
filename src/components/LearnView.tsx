'use client';

import { useState } from 'react';

import CourseAdd from '@/components/CourseAdd';
import CourseBlock from '@/components/learn/CourseBlock';
import MonthReview from '@/components/MonthReview';
import PageHead from '@/components/PageHead';
import WeekPlanner from '@/components/WeekPlanner';
import { useLearning } from '@/hooks/useLearning';
import { useNow } from '@/hooks/useNow';
import { useTick } from '@/hooks/useTick';
import { courseShares, hm } from '@/lib/plan';

/** The course plan: the week planner (or this week's extras), then one block per running course (V6). */
export default function LearnView() {
  const now = useNow();
  const learning = useLearning();
  const { ready, courses, week, today, todayDoc } = learning;
  const tick = useTick(courses, today, todayDoc);
  // The add form closes by itself once the new course shows up (the count changes).
  const [addingAt, setAddingAt] = useState<number | null>(null);
  const adding = addingAt !== null && addingAt === courses.length;

  if (!ready) return <main className="column" />;

  if (courses.length === 0) {
    return (
      <main className="column">
        <PageHead title="learn" />
        <CourseAdd />
        <MonthReview />
      </main>
    );
  }

  const all = courses.flatMap((c) => c.modules);
  const done = all.filter((m) => m.doneAt !== null).length;
  const left = all.filter((m) => m.doneAt === null).reduce((s, m) => s + m.minutes, 0);
  const shares = courseShares(courses);

  return (
    <main className="column">
      <PageHead title="learn" meta={`${done}/${all.length} · ${hm(left)} left`} />

      <div className="mt-8">
        {week ? (
          (week.plan.workTask || week.plan.explore) && (
            <section className="text-[15px]">
              {week.plan.workTask && (
                <p className="text-[14px] text-muted">
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
          )
        ) : (
          <WeekPlanner learning={learning} courses={courses} />
        )}
      </div>

      {courses.map((c) => (
        <CourseBlock
          key={c.id}
          course={c}
          week={week}
          weekMinutes={Math.round((week?.minutesPlanned ?? 0) * (shares.get(c.id) ?? 0))}
          now={now}
          tick={tick}
        />
      ))}

      <MonthReview />

      <section className="mt-12">
        {adding ? (
          <CourseAdd />
        ) : (
          <button type="button" onClick={() => setAddingAt(courses.length)} className="font-mono text-[12px] text-faint hover:text-ink">
            add a course
          </button>
        )}
      </section>
    </main>
  );
}
