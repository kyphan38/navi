'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import Waiting from '@/components/Waiting';
import type { SkillView } from '@/hooks/useMapData';
import { aiError, roleNeeds } from '@/lib/ai';
import { deleteRole, saveRole } from '@/lib/repo-career';
import { learnNext, roleGaps, roleReadiness } from '@/lib/role';
import type { SkillLevel, TargetRole as Role } from '@/types/navi';

const LEVELS = [1, 2, 3, 4] as const;

/** Needed skills and levels, editable before saving. */
function NeedsEditor({ title, needs, skills, createdAt, onDone }: { title: string; needs: Role['needs']; skills: SkillView[]; createdAt: number | null; onDone: () => void }) {
  const uid = useUid();
  const [list, setList] = useState(needs);
  const name = (id: string) => skills.find((s) => s.id === id)?.name ?? id;
  return (
    <div className="mt-3 space-y-1.5">
      {list.map((n) => (
        <div key={n.skillId} className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate text-ink">{name(n.skillId)}</span>
          <select
            value={n.level}
            onChange={(e) => setList(list.map((x) => (x.skillId === n.skillId ? { ...x, level: Number(e.target.value) as SkillLevel } : x)))}
            aria-label={`Level needed for ${name(n.skillId)}`}
            className="bg-transparent font-mono text-[13px] text-muted"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                level {l}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setList(list.filter((x) => x.skillId !== n.skillId))} className="font-mono text-[11px] text-faint hover:text-ink">
            remove
          </button>
        </div>
      ))}
      <div className="flex gap-5 pt-2">
        <button
          type="button"
          disabled={list.length === 0}
          onClick={() => {
            saveRole(uid, title, list, createdAt);
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

/** Skills against a target role (V10): what is missing, thin evidence, what to learn next. */
export default function TargetRole({ role, skills }: { role: Role | null; skills: SkillView[] }) {
  const uid = useUid();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; needs: Role['needs']; createdAt: number | null } | null>(null);

  const find = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await roleNeeds({ role: title.trim() });
      setDraft({ title: title.trim(), needs: res.needs.map((n) => ({ skillId: n.skillId, level: n.level as SkillLevel })), createdAt: null });
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(false);
    }
  };

  const gaps = role ? roleGaps(role.needs, skills) : [];
  const next = learnNext(gaps);

  return (
    <section className="mt-12 text-[15px]">
      <h2 className="mb-3 font-mono text-[12px] tracking-[0.12em] text-faint">target role</h2>
      {draft ? (
        <>
          <p className="text-ink">{draft.title}</p>
          <NeedsEditor title={draft.title} needs={draft.needs} skills={skills} createdAt={draft.createdAt} onDone={() => setDraft(null)} />
        </>
      ) : role ? (
        <>
          <p className="flex items-baseline gap-3">
            <span className="text-ink">{role.title}</span>
            <span className="font-mono text-[12px] text-faint tabular-nums">{roleReadiness(gaps)}% ready</span>
          </p>
          {next.length > 0 && (
            <p className="mt-2 text-muted">
              <span className="mr-2 font-mono text-[12px] text-faint">learn next</span>
              {next.map((g) => g.name).join(' · ')}
            </p>
          )}
          <ul className="mt-3 space-y-1">
            {gaps.map((g) => (
              <li key={g.id} className="flex items-baseline gap-3">
                <span className={`min-w-0 flex-1 truncate ${g.gap > 0 ? 'text-ink' : 'text-faint'}`}>{g.name}</span>
                {g.thin && <span className="shrink-0 font-mono text-[11px] text-faint">thin evidence</span>}
                <span className="shrink-0 font-mono text-[12px] text-faint tabular-nums">
                  {g.have}/{g.need}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex gap-4 font-mono text-[12px] text-faint">
            <button type="button" onClick={() => setDraft({ title: role.title, needs: role.needs, createdAt: role.createdAt })} className="hover:text-ink">
              edit levels
            </button>
            <button type="button" onClick={() => deleteRole(uid)} className="hover:text-ink">
              change role
            </button>
          </p>
        </>
      ) : busy ? (
        <Waiting word="reading the role" />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length >= 3) void find();
          }}
          className="flex items-baseline gap-3"
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="for example: Senior DevOps engineer" aria-label="Target role" className="min-w-0 flex-1 border-b border-line bg-transparent pb-1 text-[15px] text-ink placeholder:text-faint focus:border-line-strong" />
          <button type="submit" disabled={title.trim().length < 3} className="font-mono text-[12px] text-faint hover:text-ink disabled:opacity-30">
            compare
          </button>
          {error && <span className="text-[14px] text-muted">{error}</span>}
        </form>
      )}
    </section>
  );
}
