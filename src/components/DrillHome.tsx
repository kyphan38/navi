'use client';

import Link from 'next/link';
import { useState } from 'react';

import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import Fold from '@/components/Fold';
import { useStartDrill } from '@/hooks/useStartDrill';
import { useTodayDrill } from '@/hooks/useTodayDrill';
import { DRILL_TYPES, GROUPS, doneOfType, openLevels, scorePercent, typeLabel, unlockProgress } from '@/lib/drills';
import { dueItems } from '@/lib/leitner';
import type { DrillLevel, DrillType } from '@/types/navi';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const ALL: readonly DrillLevel[] = ['easy', 'medium', 'hard'];

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-2 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

/** One drill type opened from the folded list: what it is, its levels, and start. */
function TypePanel({
  line,
  label,
  open,
  progress,
  level,
  onLevel,
  onStart,
  busy,
  starting,
}: {
  line: string;
  label: string;
  open: DrillLevel[];
  progress: { next: DrillLevel; good: number } | null;
  level: DrillLevel;
  onLevel: (l: DrillLevel) => void;
  onStart: () => void;
  busy: boolean;
  starting: boolean;
}) {
  return (
    <div className="my-2 border-l border-line-strong py-1 pl-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[14px] text-muted">{line}</p>
        {busy && starting ? (
          <Waiting />
        ) : (
          <button type="button" disabled={busy} onClick={onStart} className="shrink-0 text-[15px] text-ink disabled:opacity-40">
            start
          </button>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[12px]" role="radiogroup" aria-label={`${label} level`}>
        {ALL.map((l) => {
          if (!open.includes(l)) {
            // Only the next level shows how close it is; the one after is just faint.
            const hint = progress && progress.next === l ? ` ${progress.good}/3` : '';
            return (
              <span key={l} className="text-faint opacity-50" title="3 drills in a row at 70% or more open the next level">
                {l}
                {hint}
              </span>
            );
          }
          return (
            <button key={l} type="button" role="radio" aria-checked={l === level} onClick={() => onLevel(l)} className={l === level ? 'text-ink' : 'text-faint hover:text-muted'}>
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Practice > drill (2026-11-26 cleanup): today's drill and redo on top, then each
 * group as one line of type names; tapping a name opens it. Mistakes and history fold.
 */
export default function DrillHome() {
  const { drills, mistakes, now, pick, redo, next, area } = useTodayDrill();
  const { start, busy, error } = useStartDrill();
  const [picked, setPicked] = useState<Partial<Record<DrillType, DrillLevel>>>({});
  const [starting, setStarting] = useState<DrillType | 'today' | 'redo' | null>(null);
  const [openType, setOpenType] = useState<DrillType | null>(null);
  const [showAllMistakes, setShowAllMistakes] = useState(false);

  const all = drills ?? [];
  const active = all.find((d) => d.status === 'active');
  const history = all.filter((d) => d.status === 'done');
  const toFix = (mistakes ?? []).filter((m) => m.nextReviewAt !== null);
  const due = now ? dueItems(toFix, now, 99).length : 0;

  const go = (key: DrillType | 'today' | 'redo', run: () => Promise<void>) => {
    setStarting(key);
    void run();
  };

  return (
    <main className="column">
      <PageHead title="drill" meta={history.length ? `${history.length} done` : undefined} />

      <section className="mt-8 space-y-2 text-[15px]">
        {active && (
          <Link href={`/drill/play/?id=${active.id}`} className="group flex items-baseline gap-3">
            <span className="w-11 shrink-0 font-mono text-[12px] text-faint">now</span>
            <span className="min-w-0 truncate text-ink">
              {typeLabel(active.type)} · {active.topic}
            </span>
            <span className="ml-auto shrink-0 text-faint transition-colors group-hover:text-ink">continue</span>
          </Link>
        )}
        {next && (
          <div className="flex items-baseline gap-3">
            <span className="w-11 shrink-0 font-mono text-[12px] text-faint">today</span>
            <span className="min-w-0 flex-1 truncate">
              <span className="text-ink">{typeLabel(next.type)}</span> <span className="font-mono text-[12px] text-faint">{next.level}</span>
              {next.topic && <span className="text-faint"> · {next.topic}</span>}
              {area && <span className="font-mono text-[11px] text-faint"> · {area.toLowerCase()}</span>}
            </span>
            {busy && starting === 'today' ? (
              <Waiting />
            ) : (
              <button type="button" disabled={busy} onClick={() => go('today', () => start(next.type, next.level, next.topic, undefined, next.skillId))} className="shrink-0 text-ink disabled:opacity-40">
                start
              </button>
            )}
          </div>
        )}
        {pick?.state === 'done' && (
          <Link href={`/drill/play/?id=${pick.drill.id}`} className="group flex items-baseline gap-3">
            <span className="w-11 shrink-0 font-mono text-[12px] text-faint">today</span>
            <span className="min-w-0 flex-1 truncate text-muted group-hover:text-ink">
              {typeLabel(pick.drill.type)} · {pick.drill.topic}
            </span>
            <span className="shrink-0 font-mono text-[12px] text-faint tabular-nums">{scorePercent(pick.drill.score) ?? '-'}%</span>
          </Link>
        )}
        {redo && (
          <div className="flex items-baseline gap-3">
            <span className="w-11 shrink-0 font-mono text-[12px] text-faint">redo</span>
            <span className="min-w-0 flex-1 truncate text-muted">
              {typeLabel(redo.drill.type)} · {redo.drill.topic} <span className="font-mono text-[12px] text-faint">{scorePercent(redo.drill.score)}% · {redo.level}</span>
            </span>
            {busy && starting === 'redo' ? (
              <Waiting />
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => go('redo', () => start(redo.drill.type, redo.level, redo.drill.topic, redo.drill.id))}
                className="shrink-0 text-faint transition-colors hover:text-ink disabled:opacity-40"
              >
                start
              </button>
            )}
          </div>
        )}
      </section>

      {GROUPS.map((g) => {
        const types = DRILL_TYPES.filter((t) => t.group === g.group);
        const opened = types.find((t) => t.type === openType);
        return (
          <section key={g.group} className="mt-8">
            <SectionTitle>{g.label}</SectionTitle>
            <p className="text-[15px] leading-[1.9]">
              {types.map((t, i) => (
                <span key={t.type}>
                  <button
                    type="button"
                    aria-expanded={openType === t.type}
                    onClick={() => setOpenType(openType === t.type ? null : t.type)}
                    className={openType === t.type ? 'text-ink underline underline-offset-4' : 'text-muted hover:text-ink'}
                  >
                    {t.label}
                  </button>
                  {i < types.length - 1 && <span className="text-faint"> · </span>}
                </span>
              ))}
            </p>
            {opened &&
              (() => {
                const past = doneOfType(all, opened.type);
                const open = openLevels(past);
                // Default: the level used last, if it is still open.
                const level = picked[opened.type] ?? (past[0] && open.includes(past[0].level) ? past[0].level : 'easy');
                return (
                  <TypePanel
                    line={opened.line}
                    label={opened.label}
                    open={open}
                    progress={unlockProgress(past)}
                    level={level}
                    onLevel={(l) => setPicked((s) => ({ ...s, [opened.type]: l }))}
                    onStart={() => go(opened.type, () => start(opened.type, level))}
                    busy={busy}
                    starting={starting === opened.type}
                  />
                );
              })()}
          </section>
        );
      })}
      {error && (
        <p role="alert" className="mt-4 text-[14px] text-muted">
          {error}
        </p>
      )}

      {(toFix.length > 0 || history.length > 0) && (
        <section className="mt-10">
          {toFix.length > 0 && (
            <Fold title="to fix" meta={due ? `${due} due` : toFix.length}>
              {due > 0 && (
                <Link href="/review/" className="mb-2 inline-block font-mono text-[12px] text-ink">
                  review {due}
                </Link>
              )}
              <ul className="space-y-3 text-[15px]">
                {(showAllMistakes ? toFix : toFix.slice(0, 5)).map((m) => (
                  <li key={m.id}>
                    <p className="text-ink">{m.lesson}</p>
                    <p className="text-[13px] text-faint">{m.text}</p>
                  </li>
                ))}
              </ul>
              {toFix.length > 5 && (
                <button type="button" onClick={() => setShowAllMistakes((v) => !v)} className="mt-2 font-mono text-[12px] text-faint hover:text-ink">
                  {showAllMistakes ? 'show less' : `show all ${toFix.length}`}
                </button>
              )}
            </Fold>
          )}
          {history.length > 0 && (
            <Fold title="history" meta={history.length}>
              <ul>
                {history.map((d) => (
                  <li key={d.id}>
                    <Link href={`/drill/play/?id=${d.id}`} className="group flex items-baseline gap-3 py-2 text-[15px]">
                      <span className="w-14 shrink-0 font-mono text-[12px] text-faint tabular-nums">{dateFmt.format(d.doneAt ?? d.startedAt)}</span>
                      <span className="min-w-0 flex-1 truncate text-muted transition-colors group-hover:text-ink">
                        {typeLabel(d.type)} · {d.topic}
                      </span>
                      <span className="shrink-0 font-mono text-[12px] text-faint tabular-nums">
                        {d.level} {scorePercent(d.score) ?? '-'}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Fold>
          )}
        </section>
      )}
    </main>
  );
}
