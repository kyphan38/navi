'use client';

import Link from 'next/link';
import { useState } from 'react';

import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import { useDrills } from '@/hooks/useDrills';
import { useStartDrill } from '@/hooks/useStartDrill';
import { DRILL_TYPES, scorePercent, typeLabel } from '@/lib/drills';
import type { DrillLevel, DrillType } from '@/types/navi';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-2 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

export default function DrillHome() {
  const drills = useDrills();
  const { start, busy, error } = useStartDrill();
  const [levels, setLevels] = useState<Partial<Record<DrillType, DrillLevel>>>({});
  const [starting, setStarting] = useState<DrillType | null>(null);

  const active = drills?.find((d) => d.status === 'active');
  const history = (drills ?? []).filter((d) => d.status === 'done');

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

      <section className="mt-10">
        <SectionTitle>start</SectionTitle>
        <ul>
          {DRILL_TYPES.map((t) => {
            const level = levels[t.type] ?? t.levels[0];
            return (
              <li key={t.type} className="py-3">
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
                <p className="mt-0.5 text-[14px] text-faint">{t.line}</p>
                <div className="mt-2 flex gap-3 font-mono text-[12px]" role="radiogroup" aria-label={`${t.label} level`}>
                  {t.levels.map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={l === level}
                      onClick={() => setLevels((s) => ({ ...s, [t.type]: l }))}
                      className={l === level ? 'text-ink' : 'text-faint hover:text-muted'}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        {error && (
          <p role="alert" className="mt-2 text-[14px] text-muted">
            {error}
          </p>
        )}
      </section>

      {history.length > 0 && (
        <section className="mt-10">
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
