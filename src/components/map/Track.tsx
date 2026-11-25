'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import type { SkillView } from '@/hooks/useMapData';
import { PILLARS } from '@/lib/pillars';
import { addTrack, closeTrack, type DrillDoc, type MilestoneDoc, type MistakeDoc } from '@/lib/repo';
import { defaultNeeds, newTrack, rungChecks, trackDays, trackSummary, type Check, type TrackSkill } from '@/lib/track';
import type { Track as TrackData, TrackRung, TrackSummary } from '@/types/navi';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const quiet = 'font-mono text-[12px] text-faint hover:text-ink disabled:opacity-40';
type TrackDoc = MilestoneDoc & { track: TrackData };

function Checks({ checks }: { checks: Check[] }) {
  return (
    <ul className="space-y-0.5">
      {checks.map((c) => (
        <li key={c.label} className="flex items-center gap-3 text-[14px]">
          <span className={`size-2.5 shrink-0 rounded-[2px] border ${c.done ? 'border-ink bg-ink' : 'border-line-strong'}`} aria-hidden />
          <span className={`min-w-0 flex-1 ${c.done ? 'text-ink' : 'text-muted'}`}>{c.label}</span>
          <span className="font-mono text-[12px] text-faint tabular-nums">{c.detail}</span>
        </li>
      ))}
    </ul>
  );
}

const arrow = (a: number | null, b: number | null) => `${a ?? '-'}${a === null ? '' : '%'} -> ${b ?? '-'}${b === null ? '' : '%'}`;

/** Before and after, as saved when the track was closed. */
function Summary({ s }: { s: TrackSummary }) {
  return (
    <div className="mt-2 space-y-2 border-l border-line-strong pl-4 text-[14px] text-muted">
      <ul className="space-y-0.5">
        {s.levels.map((l) => (
          <li key={l.skillId} className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 truncate">{l.name}</span>
            {l.workVerified && <span className="font-mono text-[11px] text-ink">work-verified</span>}
            <span className="font-mono text-[12px] text-faint tabular-nums">
              L{l.before} -&gt; L{l.after}
            </span>
          </li>
        ))}
      </ul>
      <p className="font-mono text-[12px] text-faint">
        drills {s.drills.easy}/{s.drills.medium}/{s.drills.hard} easy/medium/hard
        {(s.drillAvg.before !== null || s.drillAvg.after !== null) && ` · average ${arrow(s.drillAvg.before, s.drillAvg.after)}`}
      </p>
      <p className="font-mono text-[12px] text-faint">
        mistakes fixed {s.mistakesFixed} · new {s.mistakesNew}
      </p>
      {s.redo.map((r, i) => (
        <p key={i} className="font-mono text-[12px] text-faint">
          redo {r.topic} · {r.before}% -&gt; {r.after}%
        </p>
      ))}
    </div>
  );
}

/** Pick a pillar, a rung and the skills; one button starts it. */
function Start({ skills, drills, mistakes, now }: { skills: TrackSkill[]; drills: DrillDoc[]; mistakes: MistakeDoc[]; now: number }) {
  const uid = useUid();
  const [area, setArea] = useState<string | null>(null);
  const [rung, setRung] = useState<TrackRung>('mid');
  const [needs, setNeeds] = useState<string[]>([]);
  const midOf = (a: string) => rungChecks('mid', defaultNeeds(a, skills), skills, drills, mistakes, now);
  const pick = (a: string) => {
    setArea(a);
    setRung(midOf(a).met ? 'senior' : 'mid');
    setNeeds(defaultNeeds(a, skills));
  };
  const own = area ? skills.filter((s) => s.area === area) : [];
  return (
    <div className="space-y-4 text-[15px]">
      <ul>
        {PILLARS.map((p) => {
          const mid = midOf(p);
          const done = mid.checks.filter((c) => c.done).length;
          return (
            <li key={p}>
              <button type="button" aria-pressed={area === p} onClick={() => pick(p)} className="flex w-full items-baseline gap-3 py-1 text-left">
                <span className={`min-w-0 flex-1 ${area === p ? 'text-ink' : 'text-muted'}`}>{p}</span>
                <span className="font-mono text-[12px] text-faint tabular-nums">{mid.met ? 'mid done' : `mid ${done}/${mid.checks.length}`}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {area && (
        <div className="space-y-3 border-l border-line-strong pl-4">
          <div className="flex gap-4 font-mono text-[12px]" role="radiogroup" aria-label="Rung">
            {(['mid', 'senior'] as const).map((r) => (
              <button key={r} type="button" role="radio" aria-checked={rung === r} onClick={() => setRung(r)} className={rung === r ? 'text-ink' : 'text-faint hover:text-muted'}>
                {r}
              </button>
            ))}
          </div>
          {own.length === 0 ? (
            <p className="text-[14px] text-muted">No skills in this area yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {own.map((s) => {
                const on = needs.includes(s.id);
                const full = !on && needs.length >= 5;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={full}
                      onClick={() => setNeeds(on ? needs.filter((x) => x !== s.id) : [...needs, s.id])}
                      className="flex items-center gap-3 py-0.5 text-left text-[14px] disabled:opacity-40"
                    >
                      <span className={`size-2.5 rounded-[2px] border ${on ? 'border-ink bg-ink' : 'border-line-strong'}`} aria-hidden />
                      <span className={on ? 'text-ink' : 'text-muted'}>{s.name}</span>
                      <span className="font-mono text-[11px] text-faint">L{s.level}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            disabled={needs.length === 0}
            onClick={() => {
              const t = newTrack(area, rung, needs, skills, drills, mistakes, Date.now());
              addTrack(uid, needs.map((skillId) => ({ skillId, level: 2 })), t);
              setArea(null);
            }}
            className="rounded-md bg-ink px-3 py-1 text-[14px] text-bg active:scale-[0.97] disabled:opacity-30"
          >
            start
          </button>
        </div>
      )}
    </div>
  );
}

/** One track at a time: start it, see what is left, close it, look back (PLAN-track.md 7.1). */
export default function Track({
  skills: views,
  drills,
  mistakes,
  milestones,
  now,
}: {
  skills: SkillView[];
  drills: DrillDoc[];
  mistakes: MistakeDoc[];
  milestones: MilestoneDoc[];
  now: number;
}) {
  const uid = useUid();
  const [open, setOpen] = useState<string | null>(null);
  const skills: TrackSkill[] = views.map((s) => ({ id: s.id, name: s.name, area: s.area, level: s.computed }));
  const tracks = milestones.filter((m): m is TrackDoc => m.kind === 'track' && !!m.track);
  const active = tracks.find((t) => t.doneAt === null) ?? null;
  const closed = tracks.filter((t) => t.doneAt !== null).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  return (
    <div className="space-y-5">
      {active ? (
        <ActiveTrack t={active} skills={skills} drills={drills} mistakes={mistakes} now={now} onClose={(s, at) => closeTrack(uid, active.id, active.track, s, at)} />
      ) : (
        <Start skills={skills} drills={drills} mistakes={mistakes} now={now} />
      )}
      {closed.length > 0 && (
        <ul className="text-[15px]">
          {closed.map((t) => (
            <li key={t.id}>
              <button type="button" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full items-baseline gap-3 py-1 text-left">
                <span className="min-w-0 flex-1 truncate text-muted">
                  {t.track.area} · {t.track.rung}
                </span>
                <span className="font-mono text-[12px] text-faint">
                  {t.track.summary?.met ? 'met' : 'not met'} · {dateFmt.format(t.doneAt ?? 0)}
                </span>
              </button>
              {open === t.id && t.track.summary && <Summary s={t.track.summary} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActiveTrack({
  t,
  skills,
  drills,
  mistakes,
  now,
  onClose,
}: {
  t: TrackDoc;
  skills: TrackSkill[];
  drills: DrillDoc[];
  mistakes: MistakeDoc[];
  now: number;
  onClose: (s: TrackSummary, at: number) => void;
}) {
  const [sure, setSure] = useState(false);
  const needIds = t.needs.map((n) => n.skillId);
  const { checks, met } = rungChecks(t.track.rung, needIds, skills, drills, mistakes, now);
  const d = trackDays(t.track, now);
  return (
    <div className="space-y-3 text-[15px]">
      <p className="flex items-baseline justify-between gap-4">
        <span className="text-ink">
          {t.track.area} · {t.track.rung}
        </span>
        <span className="shrink-0 font-mono text-[12px] text-faint tabular-nums">{d.late ? `late · ${d.late}d` : `day ${Math.min(d.day, d.total)}/${d.total}`}</span>
      </p>
      <Checks checks={checks} />
      <div className="flex items-baseline gap-4">
        {met && <span className="text-[14px] text-ink">ready to close</span>}
        <button
          type="button"
          onClick={() => {
            // Closing before the rules are met needs a second tap; the summary then says "not met".
            if (!met && !sure) return setSure(true);
            const at = Date.now();
            onClose(trackSummary(t.track, needIds, skills, drills, mistakes, at), at);
          }}
          className={quiet}
        >
          {!met && sure ? 'close, not met?' : 'close'}
        </button>
      </div>
    </div>
  );
}
