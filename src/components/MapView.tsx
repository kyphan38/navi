'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import ExplainBack from '@/components/ExplainBack';
import MapRoute, { type RouteStop } from '@/components/MapRoute';
import MapWhatIf from '@/components/MapWhatIf';
import OneOnOnePrep from '@/components/OneOnOnePrep';
import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import { useMapData, type SkillView } from '@/hooks/useMapData';
import { useNow } from '@/hooks/useNow';
import { dateFor, isDone, minutesLeft } from '@/lib/forecast';
import { addSkillEvidence, updateMilestone, type MilestoneDoc } from '@/lib/repo';
import { LEVEL_NAMES, isNewLevel } from '@/lib/skill-level';
import { groupByArea } from '@/lib/terms';
import type { SkillLevel } from '@/types/navi';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
// Gray steps for levels 1-4 (DESIGN.md: steps of gray, never color).
const STEP = ['', 'var(--line-strong)', 'var(--faint)', 'var(--muted)', 'var(--ink)'];

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

function LevelCells({ level }: { level: SkillLevel }) {
  return (
    <span className="flex gap-1" aria-label={`level ${level} of 4`}>
      {[1, 2, 3, 4].map((l) => (
        <span key={l} className="h-2.5 w-4 rounded-[2px] border" style={l <= level ? { background: STEP[l], borderColor: STEP[l] } : { borderColor: 'var(--line-strong)' }} />
      ))}
    </span>
  );
}

function SkillDetail({ s }: { s: SkillView }) {
  const uid = useUid();
  const now = useNow();
  const [work, setWork] = useState('');
  return (
    <div className="mb-3 ml-1 space-y-4 border-l border-line-strong pl-4 pt-1 text-[14px]">
      <ul className="space-y-1">
        {([1, 2, 3, 4] as const).map((l) => {
          const ev = s.all.filter((e) => e.level === l);
          return (
            <li key={l} className="flex gap-3">
              <span className={`w-12 shrink-0 font-mono text-[12px] ${l <= s.computed ? 'text-ink' : 'text-faint'}`}>{LEVEL_NAMES[l]}</span>
              <span className="min-w-0 text-muted">
                {ev.length ? (
                  ev.slice(0, 3).map((e, i) => (
                    <span key={i} className="block truncate">
                      {e.note || e.kind} <span className="font-mono text-[11px] text-faint">{dateFmt.format(e.at)}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-faint">
                    {l === 1 ? 'finish a module on it' : l === 2 ? 'a demo, or a medium drill at 70%+' : l === 3 ? 'use it at work' : 'teach it to a junior'}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!work.trim()) return;
          addSkillEvidence(uid, s.id, { level: 3, kind: 'work', ref: null, note: work.trim().slice(0, 500), at: now });
          setWork('');
        }}
        className="flex items-center gap-3"
      >
        <input
          value={work}
          onChange={(e) => setWork(e.target.value)}
          maxLength={500}
          placeholder="used at work: what you did"
          aria-label={`How you used ${s.name} at work`}
          className="min-w-0 flex-1 border-b border-line bg-transparent pb-1 text-[15px] text-ink placeholder:text-faint focus:border-line-strong"
        />
        <button type="submit" disabled={!work.trim()} className="shrink-0 font-mono text-[12px] text-faint hover:text-ink disabled:opacity-40">
          add
        </button>
      </form>

      <ExplainBack skillId={s.id} skillName={s.name} />
    </div>
  );
}

function Milestones({ items, now }: { items: { m: MilestoneDoc; done: boolean; date: number | null }[]; now: number }) {
  const uid = useUid();
  return (
    <ul className="space-y-4 text-[15px]">
      {items.map(({ m, done, date }) => (
        <li key={m.id}>
          <p className="flex items-baseline justify-between gap-4">
            <span className={done ? 'text-faint' : 'text-ink'}>{m.title}</span>
            <span className="shrink-0 font-mono text-[12px] text-faint">
              {done ? 'done' : m.kind === 'career' ? `${m.checklist.filter((c) => c.done).length}/${m.checklist.length}` : date ? `~${dateFmt.format(date)}` : ''}
            </span>
          </p>
          {m.kind === 'career' && (
            <ul className="mt-1.5 space-y-0.5">
              {m.checklist.map((c, i) => (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={c.done}
                    onClick={() =>
                      updateMilestone(uid, m.id, { checklist: m.checklist.map((x, j) => (j === i ? { ...x, done: !x.done, at: x.done ? null : now } : x)) })
                    }
                    className="flex items-center gap-3 py-0.5 text-left text-[14px]"
                  >
                    <span className={`size-2.5 rounded-[2px] border ${c.done ? 'border-ink bg-ink' : 'border-line-strong'}`} aria-hidden />
                    <span className={c.done ? 'text-ink' : 'text-muted'}>{c.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MapView() {
  const now = useNow();
  const { learning, drills, skills, milestones, days, tagging, tagError } = useMapData();
  const realHours = Math.round((learning.budget.minutes / 60) * 2) / 2 || 2;
  const [hoursEdit, setHours] = useState<number | null>(null);
  const hours = hoursEdit ?? realHours;
  const [open, setOpen] = useState<string | null>(null);

  if (!skills || !milestones || !days || !learning.ready || !now) return <main className="column" />;

  const levels = new Map(skills.map((s) => [s.id, s.computed]));
  const modules = learning.course?.modules ?? [];
  const rough = !learning.budget.real;
  const info = milestones.map((m) => {
    const left = minutesLeft(m, levels, m.courseId && m.courseId !== learning.course?.id ? [] : modules);
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
  const whatIf = info.filter((i) => i.m.kind === 'learning' && !i.done).map((i) => ({ id: i.m.id, title: i.m.title, left: i.left }));
  const atLevel = skills.filter((s) => s.computed > 0).length;

  return (
    <main className="column md:max-w-[48rem]">
      <PageHead title="map" meta={`${atLevel}/${skills.length} skills started`} />

      <section className="mt-8">
        <MapRoute stops={stops} />
      </section>

      <section className="mt-10">
        <SectionTitle>what if</SectionTitle>
        <MapWhatIf items={whatIf} hours={hours} realHours={realHours} real={learning.budget.real} onHours={setHours} now={now} days={days} today={learning.today} />
      </section>

      <section className="mt-10">
        <SectionTitle>milestones</SectionTitle>
        <Milestones items={info} now={now} />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline gap-4">
          <h2 className="font-mono text-[12px] tracking-[0.12em] text-faint">skills</h2>
          {tagging && <Waiting word="matching skills" />}
          {tagError && <span className="text-[13px] text-muted">{tagError}</span>}
        </div>
        {groupByArea(skills).map((g) => (
          <div key={g.area} className="mb-5">
            <p className="mb-1 font-mono text-[11px] text-faint">{g.area.toLowerCase()}</p>
            <ul>
              {g.terms.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-expanded={open === s.id}
                    onClick={() => setOpen(open === s.id ? null : s.id)}
                    className="flex w-full items-center gap-3 py-1.5 text-left text-[15px]"
                  >
                    <span className={`min-w-0 flex-1 truncate ${s.computed ? 'text-ink' : 'text-muted'}`}>{s.name}</span>
                    {isNewLevel(s.reachedAt, now) && <span className="shrink-0 font-mono text-[11px] text-ink">new</span>}
                    <LevelCells level={s.computed} />
                  </button>
                  {open === s.id && <SkillDetail s={s} />}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <SectionTitle>1:1 prep</SectionTitle>
        <OneOnOnePrep course={learning.course} days={days} skills={skills} drills={drills ?? []} milestones={milestones} />
      </section>
    </main>
  );
}
