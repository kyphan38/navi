'use client';

import { useState } from 'react';

import MapRoute, { type RouteStop } from '@/components/MapRoute';
import MapWhatIf from '@/components/MapWhatIf';
import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import BasicsLine from '@/components/map/BasicsLine';
import Heatmap from '@/components/map/Heatmap';
import Milestones from '@/components/map/Milestones';
import Skills from '@/components/map/Skills';
import Track from '@/components/map/Track';
import { useMapData } from '@/hooks/useMapData';
import { useMistakes } from '@/hooks/useMistakes';
import { useNow } from '@/hooks/useNow';
import { dateFor, isDone, minutesLeft } from '@/lib/forecast';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

/**
 * Where you are (2026-11-26 cleanup): route, track, skills, history. What if and
 * milestones open from two words under the route. Target role, stories, 1:1 prep
 * and the brag doc moved to the career page.
 */
export default function MapView() {
  const now = useNow();
  const { learning, drills, skills, milestones, days, tagging, tagError } = useMapData();
  const realHours = Math.round((learning.budget.minutes / 60) * 2) / 2 || 2;
  const [hoursEdit, setHours] = useState<number | null>(null);
  const hours = hoursEdit ?? realHours;
  const [peek, setPeek] = useState<'what if' | 'milestones' | null>(null);
  const mistakes = useMistakes();

  if (!skills || !milestones || !days || !learning.ready || !now || !mistakes) return <main className="column" />;

  const levels = new Map(skills.map((s) => [s.id, s.computed]));
  // Every running course (V6); a course milestone counts only its own course.
  const modules = learning.courses.flatMap((c) => c.modules);
  const rough = !learning.budget.real;
  // Tracks have their own section; only the running one is a stop on the route.
  const plain = milestones.filter((m) => m.kind !== 'track');
  const running = milestones.find((m) => m.kind === 'track' && m.doneAt === null && m.track);
  const info = plain.map((m) => {
    const own = m.courseId ? learning.courses.find((c) => c.id === m.courseId)?.modules ?? [] : modules;
    const left = minutesLeft(m, levels, own);
    const done = isDone(m, left);
    return { m, left, done, date: m.kind === 'learning' && !done ? dateFor(left, hours, now) : null };
  });
  const stops: RouteStop[] = info.map((i) => ({
    m: i.m,
    done: i.done,
    date: i.date,
    rough,
    checklist: i.m.kind === 'career' ? `${i.m.checklist.filter((c) => c.done).length}/${i.m.checklist.length}` : null,
  }));
  if (running?.track) stops.unshift({ m: running, done: false, date: running.track.endBy, rough: false, checklist: null });
  const whatIf = info.filter((i) => i.m.kind === 'learning' && !i.done).map((i) => ({ id: i.m.id, title: i.m.title, left: i.left }));
  const atLevel = skills.filter((s) => s.computed > 0).length;

  return (
    <main className="column md:max-w-[48rem]">
      <PageHead title="map" meta={`${atLevel}/${skills.length} skills started`} />

      <section className="mt-8">
        <MapRoute stops={stops} />
        <div className="mt-3 flex gap-5 font-mono text-[12px]">
          {(['what if', 'milestones'] as const).map((p) => (
            <button key={p} type="button" aria-expanded={peek === p} onClick={() => setPeek(peek === p ? null : p)} className={peek === p ? 'text-ink' : 'text-faint hover:text-ink'}>
              {p} {peek === p ? '‹' : '›'}
            </button>
          ))}
        </div>
        {peek === 'what if' && (
          <div className="mt-4">
            <MapWhatIf items={whatIf} hours={hours} realHours={realHours} real={learning.budget.real} onHours={setHours} now={now} />
          </div>
        )}
        {peek === 'milestones' && (
          <div className="mt-4">
            <Milestones items={info} now={now} />
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionTitle>track</SectionTitle>
        <Track skills={skills} drills={drills ?? []} mistakes={mistakes} milestones={milestones} now={now} />
      </section>

      <section className="mt-10">
        <div className="mb-2 flex items-baseline gap-4">
          <h2 className="font-mono text-[12px] tracking-[0.12em] text-faint">skills</h2>
          {tagging && <Waiting word="matching skills" />}
          {tagError && <span className="text-[13px] text-muted">{tagError}</span>}
        </div>
        <Skills skills={skills} now={now} />
        <BasicsLine />
      </section>

      <section className="mt-10">
        <SectionTitle>history</SectionTitle>
        <Heatmap days={days} drills={drills ?? []} modules={modules} today={learning.today} />
      </section>
    </main>
  );
}
