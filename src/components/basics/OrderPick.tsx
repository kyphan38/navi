'use client';

import { useState } from 'react';

import { shuffled } from '@/lib/basics';

/** "Put these steps in order": tap the steps one by one; "undo" takes the last one back. */
export default function OrderPick({ steps, seed, done, onPicked }: { steps: string[]; seed: string; done: boolean; onPicked: (picks: number[]) => void }) {
  const shown = shuffled(steps.length, seed);
  const [picks, setPicks] = useState<number[]>([]);
  const left = shown.filter((i) => !picks.includes(i));
  return (
    <div className="space-y-3">
      {picks.length > 0 && (
        <ol className="space-y-1.5">
          {picks.map((i, n) => {
            const mark = done ? (i === n ? 'text-ink' : 'text-muted line-through') : 'text-ink';
            return (
              <li key={i} className={`flex gap-3 rounded-md border border-line px-3 py-2 ${mark}`}>
                <span className="font-mono text-[12px] text-faint">{n + 1}</span>
                <span className="min-w-0">{steps[i]}</span>
              </li>
            );
          })}
        </ol>
      )}
      {done && picks.some((i, n) => i !== n) && (
        <ol className="space-y-0.5 text-[14px] text-muted">
          {steps.map((s, n) => (
            <li key={n} className="flex gap-2">
              <span className="font-mono text-[12px] text-faint">{n + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
      {!done && left.length > 0 && (
        <ul className="space-y-1.5">
          {left.map((i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  const next = [...picks, i];
                  setPicks(next);
                  if (next.length === steps.length) onPicked(next);
                }}
                className="w-full rounded-md border border-line-strong px-3 py-2 text-left text-ink hover:border-ink"
              >
                {steps[i]}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!done && picks.length > 0 && (
        <button type="button" onClick={() => setPicks(picks.slice(0, -1))} className="font-mono text-[12px] text-faint hover:text-ink">
          undo
        </button>
      )}
    </div>
  );
}
