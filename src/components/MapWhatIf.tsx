'use client';

import { dateFor, weeksEarlier } from '@/lib/forecast';
import { hm, mondayOf, weekOf } from '@/lib/plan';
import { addDays } from '@/lib/day';
import type { DayDoc } from '@/lib/repo';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export type WhatIfItem = { id: string; title: string; left: number };

/** Real minutes of the last 12 weeks as gray bars, with a line at the chosen hours. */
function WeekBars({ days, today, hours }: { days: DayDoc[]; today: string; hours: number }) {
  const monday = mondayOf(today);
  const weeks = Array.from({ length: 12 }, (_, i) => weekOf(addDays(monday, -7 * (11 - i))));
  const per = new Map<string, number>();
  for (const d of days) per.set(weekOf(d.id), (per.get(weekOf(d.id)) ?? 0) + d.minutes);
  const values = weeks.map((w) => per.get(w) ?? 0);
  const target = hours * 60;
  const max = Math.max(target, ...values, 60);
  const W = 360;
  const H = 72;
  const bw = W / 12;
  const ty = H - (target / max) * H;
  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full max-w-[360px]" role="img" aria-label="Minutes studied in the last 12 weeks">
        {values.map((v, i) => (
          <rect
            key={weeks[i]}
            x={i * bw + 3}
            y={H - (v / max) * H}
            width={bw - 6}
            height={Math.max((v / max) * H, v ? 1 : 0)}
            rx="1.5"
            fill={i === 11 ? 'var(--muted)' : 'var(--line-strong)'}
          >
            <title>{`${weeks[i]}: ${hm(v)}`}</title>
          </rect>
        ))}
        <line x1="0" y1={H} x2={W} y2={H} stroke="var(--line)" />
        <line x1="0" y1={ty} x2={W} y2={ty} stroke="var(--ink)" strokeDasharray="3 4" />
      </svg>
      <figcaption className="mt-1 font-mono text-[11px] text-faint">last 12 weeks · line = {hm(target)} a week</figcaption>
    </figure>
  );
}

/** "Cố thêm thì sao" (PLAN-navi.md 9.1c): a slider for hours a week; dates move at once. */
export default function MapWhatIf({
  items,
  hours,
  realHours,
  real,
  onHours,
  now,
  days,
  today,
}: {
  items: WhatIfItem[];
  hours: number;
  realHours: number;
  real: boolean;
  onHours: (h: number) => void;
  now: number;
  days: DayDoc[];
  today: string;
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

      <WeekBars days={days} today={today} hours={hours} />
    </div>
  );
}
