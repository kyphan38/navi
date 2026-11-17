'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import Waiting from '@/components/Waiting';
import type { SkillView } from '@/hooks/useMapData';
import { aiError, storyDraft } from '@/lib/ai';
import { typeLabel } from '@/lib/drills';
import type { DrillDoc } from '@/lib/repo';
import { deleteStory, saveStory, type StoryDoc } from '@/lib/repo-career';
import type { Story } from '@/types/navi';

type Draft = Omit<Story, 'createdAt' | 'updatedAt'>;
const EMPTY: Draft = { title: '', situation: '', task: '', action: '', result: '', skillIds: [], source: 'manual', sourceId: null };
const PARTS = [
  ['situation', 'Situation'],
  ['task', 'Task'],
  ['action', 'Action'],
  ['result', 'Result'],
] as const;
const field = 'w-full resize-y border-b border-line bg-transparent pb-1 text-[15px] text-ink placeholder:text-faint focus:border-line-strong';

/** A finished drill as text for the AI: the brief, each round and answer, the coach notes. */
function drillText(d: DrillDoc): string {
  return [
    `Drill: ${typeLabel(d.type)} - ${d.topic}`,
    d.brief,
    ...d.rounds.map((r, i) => `Round ${i + 1}: ${r.prompt}\nMy answer: ${r.answer ?? ''}`),
    d.debrief ? `Coach: ${d.debrief}` : '',
  ]
    .join('\n\n')
    .slice(0, 8000);
}

function Form({ start, onDone }: { start: { id: string | null; createdAt: number | null; draft: Draft }; onDone: () => void }) {
  const uid = useUid();
  const [d, setD] = useState<Draft>(start.draft);
  const ok = d.title.trim() && d.situation.trim() && d.action.trim();
  return (
    <div className="mt-3 space-y-3 border-l border-line-strong pl-4">
      <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} maxLength={120} placeholder="title" aria-label="Title" className={field} />
      {PARTS.map(([k, label]) => (
        <label key={k} className="block">
          <span className="font-mono text-[12px] text-faint">{label}</span>
          <textarea value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} rows={2} maxLength={k === 'action' ? 1500 : 1000} className={field} />
        </label>
      ))}
      <div className="flex gap-5">
        <button
          type="button"
          disabled={!ok}
          onClick={() => {
            saveStory(uid, start.id, { ...d, title: d.title.trim() }, start.createdAt);
            onDone();
          }}
          className="rounded-md bg-ink px-3 py-1 text-[14px] text-bg active:scale-[0.97] disabled:opacity-30"
        >
          save
        </button>
        <button type="button" onClick={onDone} className="font-mono text-[12px] text-faint hover:text-ink">
          cancel
        </button>
      </div>
    </div>
  );
}

/** STAR story bank (V2): write one yourself, or let the AI draft one from a drill or a "used at work" note. */
export default function Stories({ stories, drills, skills }: { stories: StoryDoc[]; drills: DrillDoc[]; skills: SkillView[] }) {
  const uid = useUid();
  const [editing, setEditing] = useState<{ id: string | null; createdAt: number | null; draft: Draft } | null>(null);
  const [from, setFrom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const done = drills.filter((d) => d.status === 'done').slice(0, 20);
  const work = skills.flatMap((s) => s.all.filter((e) => e.kind === 'work').map((e) => ({ skill: s, e }))).slice(0, 20);

  const draftFrom = async () => {
    setBusy(true);
    setError(null);
    try {
      if (from.startsWith('d:')) {
        const d = done.find((x) => x.id === from.slice(2))!;
        const s = await storyDraft({ kind: 'drill', source: drillText(d) });
        setEditing({ id: null, createdAt: null, draft: { ...s, skillIds: d.skillIds.slice(0, 10), source: 'drill', sourceId: d.id } });
      } else {
        const w = work[Number(from.slice(2))];
        const s = await storyDraft({ kind: 'work', source: `${w.skill.name}: ${w.e.note}` });
        setEditing({ id: null, createdAt: null, draft: { ...s, skillIds: [w.skill.id], source: 'work', sourceId: `${w.skill.id}:${w.e.at}` } });
      }
      setFrom('');
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-12 text-[15px]">
      <h2 className="mb-3 font-mono text-[12px] tracking-[0.12em] text-faint">stories</h2>
      <ul>
        {stories.map((s) => (
          <li key={s.id}>
            <button type="button" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)} className={`block w-full py-1.5 text-left ${open === s.id ? 'text-ink' : 'text-muted'}`}>
              {s.title}
            </button>
            {open === s.id && editing?.id !== s.id && (
              <div className="mb-3 ml-1 space-y-1.5 border-l border-line-strong pl-4 text-[14px]">
                {PARTS.map(([k, label]) => (
                  <p key={k}>
                    <span className="mr-2 font-mono text-[12px] text-faint">{label[0]}</span>
                    <span className="text-ink">{s[k]}</span>
                  </p>
                ))}
                <p className="flex gap-4 pt-1 font-mono text-[12px] text-faint">
                  <button type="button" onClick={() => setEditing({ id: s.id, createdAt: s.createdAt, draft: { title: s.title, situation: s.situation, task: s.task, action: s.action, result: s.result, skillIds: s.skillIds, source: s.source, sourceId: s.sourceId } })} className="hover:text-ink">
                    edit
                  </button>
                  <button type="button" onClick={() => deleteStory(uid, s.id)} className="hover:text-ink">
                    delete
                  </button>
                </p>
              </div>
            )}
            {editing?.id === s.id && <Form start={editing} onDone={() => setEditing(null)} />}
          </li>
        ))}
      </ul>

      {editing && editing.id === null ? (
        <Form start={editing} onDone={() => setEditing(null)} />
      ) : (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <button type="button" onClick={() => setEditing({ id: null, createdAt: null, draft: EMPTY })} className="font-mono text-[12px] text-faint hover:text-ink">
            write one
          </button>
          {(done.length > 0 || work.length > 0) &&
            (busy ? (
              <Waiting word="drafting" />
            ) : (
              <span className="flex min-w-0 items-baseline gap-3">
                <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Draft from" className="min-w-0 max-w-[60vw] bg-transparent text-[14px] text-muted">
                  <option value="">draft from…</option>
                  {done.map((d) => (
                    <option key={d.id} value={`d:${d.id}`}>
                      drill: {d.topic}
                    </option>
                  ))}
                  {work.map((w, i) => (
                    <option key={i} value={`w:${i}`}>
                      work: {w.skill.name} - {w.e.note.slice(0, 40)}
                    </option>
                  ))}
                </select>
                {from && (
                  <button type="button" onClick={() => void draftFrom()} className="font-mono text-[12px] text-faint hover:text-ink">
                    draft
                  </button>
                )}
              </span>
            ))}
          {error && <span className="text-[14px] text-muted">{error}</span>}
        </div>
      )}
    </section>
  );
}
