'use client';

import Link from 'next/link';
import { useState } from 'react';

import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import { useDrills } from '@/hooks/useDrills';
import { useMistakes } from '@/hooks/useMistakes';
import { useNow } from '@/hooks/useNow';
import { useStartDrill } from '@/hooks/useStartDrill';
import { DRILL_TYPES, GROUPS, doneOfType, openLevels, scorePercent, typeLabel, unlockProgress } from '@/lib/drills';
import { dueItems } from '@/lib/leitner';
import type { DrillLevel, DrillType } from '@/types/navi';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const ALL: readonly DrillLevel[] = ['easy', 'medium', 'hard'];

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-2 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

export default function DrillHome() {
  const drills = useDrills();
  const mistakes = useMistakes();
  const now = useNow();
  const { start, busy, error } = useStartDrill();
  const [picked, setPicked] = useState<Partial<Record<DrillType, DrillLevel>>>({});
  const [starting, setStarting] = useState<DrillType | null>(null);
  const [showAllMistakes, setShowAllMistakes] = useState(false);

  const all = drills ?? [];
  const active = all.find((d) => d.status === 'active');
  const history = all.filter((d) => d.status === 'done');
  const toFix = (mistakes ?? []).filter((m) => m.nextReviewAt !== null);
  const due = now ? dueItems(toFix, now, 99).length : 0;

  const go = (type: DrillType, level: DrillLevel) => {
    setStarting(type);
    void start(type, level);
  };

  return (
    <main className="column">
      <PageHead title="drill" meta={history.length ? `${history.length} done` : undefined} />

      {active && (
        <Link href={`/drill/play/?id=${active.id}`} className="group mt-8 flex items-baseline gap-3 text-[15px]">
          <span className="font-mono text-[12px] text-faint">now</span>
          <span className="min-w-0 truncate text-ink">
            {typeLabel(active.type)} · {active.topic}
          </span>
          <span className="ml-auto shrink-0 text-faint transition-colors group-hover:text-ink">continue</span>
        </Link>
      )}

      {GROUPS.map((g) => (
        <section key={g.group} className="mt-10">
          <SectionTitle>{g.label}</SectionTitle>
          <ul>
            {DRILL_TYPES.filter((t) => t.group === g.group).map((t) => {
              const past = doneOfType(all, t.type);
              const open = openLevels(past);
              const progress = unlockProgress(past);
              // Default: the level used last, if it is still open.
              const level = picked[t.type] ?? (past[0] && open.includes(past[0].level) ? past[0].level : 'easy');
              return (
                <li key={t.type} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[16px] text-ink">{t.label}</span>
                    {busy && starting === t.type ? (
                      <Waiting />
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => go(t.type, level)}
                        className="shrink-0 text-[15px] text-faint transition-colors hover:text-ink disabled:opacity-40"
                      >
                        start
                      </button>
                    )}
                  </div>
                  <p className="text-[14px] text-faint">{t.line}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[12px]" role="radiogroup" aria-label={`${t.label} level`}>
                    {ALL.map((l) => {
                      const isOpen = open.includes(l);
                      if (!isOpen) {
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
                        <button
                          key={l}
                          type="button"
                          role="radio"
                          aria-checked={l === level}
                          onClick={() => setPicked((s) => ({ ...s, [t.type]: l }))}
                          className={l === level ? 'text-ink' : 'text-faint hover:text-muted'}
                        >
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {error && (
        <p role="alert" className="mt-4 text-[14px] text-muted">
          {error}
        </p>
      )}

      {toFix.length > 0 && (
        <section className="mt-12">
          <div className="mb-2 flex items-baseline gap-4">
            <SectionTitle>to fix</SectionTitle>
            {due > 0 && (
              <Link href="/review/" className="font-mono text-[12px] text-ink">
                review {due}
              </Link>
            )}
          </div>
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
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-12">
          <SectionTitle>history</SectionTitle>
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
        </section>
      )}
    </main>
  );
}
