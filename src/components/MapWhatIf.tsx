'use client';

import { dateFor, weeksEarlier } from '@/lib/forecast';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export type WhatIfItem = { id: string; title: string; left: number };

/** "Cố thêm thì sao" (PLAN-navi.md 9.1c): a slider for hours a week; dates move at once. The old week bars are now the heatmap. */
export default function MapWhatIf({
  items,
  hours,
  realHours,
  real,
  onHours,
  now,
}: {
  items: WhatIfItem[];
  hours: number;
  realHours: number;
  real: boolean;
  onHours: (h: number) => void;
  now: number;
}) {
  const same = hours === realHours;
  return (
    <div className="text-[15px]">
      <label className="flex items-center gap-4">
        <input
          type="range"
          min={2}
          max={12}
          step={0.5}
          value={hours}
          onChange={(e) => onHours(Number(e.target.value))}
          aria-label="Hours a week"
          className="w-full max-w-[280px] accent-[var(--ink)]"
        />
        <span className="shrink-0 font-mono text-[13px] text-ink tabular-nums">{hours}h a week</span>
      </label>

      {items.length === 0 ? (
        <p className="mt-4 text-muted">Nothing left to plan.</p>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <p className="font-mono text-[12px] text-faint">
              at {realHours}h a week ({real ? 'your real average' : 'from settings'})
            </p>
            {items.map((it) => {
              const d = dateFor(it.left, realHours, now);
              return (
                <p key={it.id} className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0 truncate text-muted">{it.title}</span>
                  <span className="shrink-0 font-mono text-[13px] text-muted tabular-nums">{d ? dateFmt.format(d) : '-'}</span>
                </p>
              );
            })}
          </div>
          {!same && (
            <div>
              <p className="font-mono text-[12px] text-faint">at {hours}h a week</p>
              {items.map((it) => {
                const base = dateFor(it.left, realHours, now);
                const d = dateFor(it.left, hours, now);
                const diff = weeksEarlier(base, d);
                return (
                  <p key={it.id} className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 truncate text-ink">{it.title}</span>
                    <span className="shrink-0 font-mono text-[13px] text-ink tabular-nums">
                      {d ? dateFmt.format(d) : '-'}
                      {diff !== 0 && <span className="ml-2 text-faint">{diff > 0 ? `${diff}w earlier` : `${-diff}w later`}</span>}
                    </span>
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
