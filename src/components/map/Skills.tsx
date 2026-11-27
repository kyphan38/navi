'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import ExplainBack from '@/components/ExplainBack';
import Fold from '@/components/Fold';
import { SkillAdd, SkillEdit } from '@/components/map/SkillEdit';
import type { SkillView } from '@/hooks/useMapData';
import { useNow } from '@/hooks/useNow';
import { PILLARS } from '@/lib/pillars';
import { addSkillEvidence } from '@/lib/repo';
import { LEVEL_NAMES, isNewLevel } from '@/lib/skill-level';
import type { SkillLevel } from '@/types/navi';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
// Gray steps for levels 1-4 (DESIGN.md: steps of gray, never color).
const STEP = ['', 'var(--line-strong)', 'var(--faint)', 'var(--muted)', 'var(--ink)'];

function LevelCells({ level }: { level: SkillLevel }) {
  return (
    <span className="flex gap-1" aria-label={`level ${level} of 4`}>
      {[1, 2, 3, 4].map((l) => (
        <span key={l} className="h-2.5 w-4 rounded-[2px] border" style={l <= level ? { background: STEP[l], borderColor: STEP[l] } : { borderColor: 'var(--line-strong)' }} />
      ))}
    </span>
  );
}

function SkillDetail({ s, areas }: { s: SkillView; areas: string[] }) {
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
                    {l === 1 ? 'finish a module on it' : l === 2 ? 'a demo, a basics lab, or a medium drill at 70%+' : l === 3 ? 'use it at work' : 'teach it to a junior'}
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
      <SkillEdit id={s.id} name={s.name} area={s.area} areas={areas} />
    </div>
  );
}

/** One row per skill; tap to see its evidence, add a work note, or edit it. */
function SkillRows({ list, areas, now }: { list: SkillView[]; areas: string[]; now: number }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="ml-1 border-l border-line pl-4">
      {[...list]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => (
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
            {open === s.id && <SkillDetail s={s} areas={areas} />}
          </li>
        ))}
    </ul>
  );
}

/**
 * Skills folded by area: the five pillars first, one row each with how many are
 * started; every other area sits in one "other" row. Nothing opens by itself.
 */
export default function Skills({ skills, now }: { skills: SkillView[]; now: number }) {
  const areas = [...new Set(skills.map((s) => s.area))].sort();
  const pillars = PILLARS.map((p) => ({ area: p as string, list: skills.filter((s) => s.area === p) })).filter((g) => g.list.length);
  const rest = skills.filter((s) => !(PILLARS as readonly string[]).includes(s.area));
  const restAreas = [...new Set(rest.map((s) => s.area))].sort();
  const started = (list: SkillView[]) => `${list.filter((s) => s.computed > 0).length}/${list.length}`;
  return (
    <div>
      {pillars.map((g) => (
        <Fold key={g.area} title={g.area.toLowerCase()} meta={started(g.list)} strong>
          <SkillRows list={g.list} areas={areas} now={now} />
        </Fold>
      ))}
      {rest.length > 0 && (
        <Fold title={`other (${restAreas.join(', ').toLowerCase()})`} meta={started(rest)}>
          {restAreas.map((a) => (
            <div key={a} className="mb-2">
              <p className="mb-0.5 ml-1 font-mono text-[11px] text-faint">{a.toLowerCase()}</p>
              <SkillRows list={rest.filter((s) => s.area === a)} areas={areas} now={now} />
            </div>
          ))}
        </Fold>
      )}
      <SkillAdd skills={skills} areas={areas} />
    </div>
  );
}
