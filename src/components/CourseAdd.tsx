'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import Waiting from '@/components/Waiting';
import { aiError, splitCourse, type SplitModule } from '@/lib/ai';
import { hm } from '@/lib/plan';
import { addCourse } from '@/lib/repo';
import type { CourseModule } from '@/types/navi';

const field = 'w-full border-b border-line bg-transparent pb-1 text-[16px] text-ink placeholder:text-faint focus:border-line-strong';

/** Deadline input (yyyy-mm-dd) -> epoch ms at the end of that day, or null. */
function parseDeadline(v: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59).getTime();
}

/**
 * Add a course once (PLAN-navi.md 7.1): paste the contents, let the AI split it
 * into modules, fix minutes or drop modules, then save.
 */
export default function CourseAdd() {
  const uid = useUid();
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [toc, setToc] = useState('');
  const [modules, setModules] = useState<SplitModule[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const split = async () => {
    setBusy(true);
    setError(null);
    try {
      setModules((await splitCourse({ text: toc })).modules);
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!modules?.length || !title.trim()) return;
    const list: CourseModule[] = modules.map((m, i) => ({ id: `m${i + 1}`, ...m, skillIds: [], doneAt: null }));
    addCourse(uid, { title: title.trim(), goal: goal.trim(), deadline: parseDeadline(deadline), modules: list, status: 'active' });
  };

  const total = (modules ?? []).reduce((s, m) => s + m.minutes, 0);
  const sections = [...new Set((modules ?? []).map((m) => m.section))];

  return (
    <div className="mt-8 space-y-6 text-[15px]">
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} placeholder="course name" aria-label="Course name" className={field} />
      <input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={300} placeholder="goal, for example pass the exam" aria-label="Goal" className={field} />
      <label className="flex items-baseline gap-4">
        <span className="shrink-0 text-muted">deadline</span>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${field} font-mono text-[15px]`} />
      </label>

      {!modules ? (
        <>
          <textarea
            value={toc}
            onChange={(e) => setToc(e.target.value)}
            rows={10}
            maxLength={80_000}
            placeholder="paste the course contents"
            aria-label="Course contents"
            className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 font-mono text-[13px] leading-relaxed text-ink placeholder:font-sans placeholder:text-[15px] placeholder:text-faint focus:border-line-strong"
          />
          <div className="flex items-center gap-5">
            {busy ? (
              <Waiting word="reading" />
            ) : (
              <button
                type="button"
                onClick={() => void split()}
                disabled={!toc.trim() || !title.trim()}
                className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97] disabled:opacity-30"
              >
                split
              </button>
            )}
            {error && <span className="text-[14px] text-muted">{error}</span>}
          </div>
        </>
      ) : (
        <>
          <p className="font-mono text-[12px] text-faint tabular-nums">
            {modules.length} modules · {hm(total)}
          </p>
          <div className="space-y-6">
            {sections.map((sec) => (
              <section key={sec}>
                <h2 className="mb-1 font-mono text-[12px] tracking-[0.08em] text-faint">{sec}</h2>
                <ul>
                  {modules.map((m, i) =>
                    m.section !== sec ? null : (
                      <li key={i} className="group flex items-baseline gap-3 py-1">
                        <span className="min-w-0 flex-1 text-ink [overflow-wrap:anywhere]">{m.title}</span>
                        {m.kind !== 'lesson' && <span className="shrink-0 font-mono text-[11px] text-faint">{m.kind}</span>}
                        <input
                          type="number"
                          min={1}
                          max={600}
                          value={m.minutes}
                          onChange={(e) => setModules(modules.map((x, j) => (j === i ? { ...x, minutes: Math.max(1, Math.min(600, Number(e.target.value) || 1)) } : x)))}
                          aria-label={`Minutes for ${m.title}`}
                          className="w-12 shrink-0 bg-transparent text-right font-mono text-[12px] text-faint tabular-nums focus:text-ink"
                        />
                        <button
                          type="button"
                          onClick={() => setModules(modules.filter((_, j) => j !== i))}
                          aria-label={`Remove ${m.title}`}
                          className="shrink-0 font-mono text-[12px] text-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-ink [@media(hover:none)]:opacity-100"
                        >
                          drop
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            ))}
          </div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={save} disabled={!modules.length} className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97] disabled:opacity-30">
              save
            </button>
            <button type="button" onClick={() => setModules(null)} className="text-[14px] text-faint hover:text-ink">
              back
            </button>
          </div>
        </>
      )}
    </div>
  );
}
