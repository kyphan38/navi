'use client';

import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { dayLines, heatCells, type Shade } from '@/lib/heatmap';
import { parseDay } from '@/lib/day';
import type { DayDoc, DrillDoc } from '@/lib/repo';
import { watchInterviews, type InterviewDoc } from '@/lib/repo-career';
import type { CourseModule } from '@/types/navi';

const dateFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
// Gray steps only (DESIGN.md). 0 empty, 1 learn or review, 2 practice.
const FILL: Record<Shade, string> = { 0: 'var(--surface-2)', 1: 'var(--line-strong)', 2: 'var(--muted)' };

/** Half a year of days. Tap a day to see what you did; no streaks, no counts. */
export default function Heatmap({ days, drills, modules, today }: { days: DayDoc[]; drills: DrillDoc[]; modules: CourseModule[]; today: string }) {
  const uid = useUid();
  const [interviews, setInterviews] = useState<InterviewDoc[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => watchInterviews(uid, setInterviews), [uid]);

  const weeks = heatCells(days, drills, interviews, today);
  const title = (id: string) => modules.find((m) => m.id === id)?.title;
  const lines = open ? dayLines(open, days, drills, interviews, title) : [];

  return (
    <div>
      <div className="flex gap-[2px] overflow-x-auto" role="grid" aria-label="What you did each day, last 26 weeks">
        {weeks.map((w) => (
          <div key={w[0].day} className="flex flex-col gap-[2px]" role="row">
            {w.map((c) =>
              c.future ? (
                <span key={c.day} className="size-[10px]" aria-hidden />
              ) : (
                <button
                  key={c.day}
                  type="button"
                  role="gridcell"
                  aria-label={dateFmt.format(parseDay(c.day))}
                  aria-selected={open === c.day}
                  onClick={() => setOpen(open === c.day ? null : c.day)}
                  className="size-[10px] shrink-0 rounded-[2px]"
                  style={{ background: FILL[c.shade], outline: open === c.day ? '1px solid var(--ink)' : undefined, outlineOffset: 1 }}
                />
              ),
            )}
          </div>
        ))}
      </div>
      {open && (
        <div className="mt-3 text-[14px]">
          <p className="font-mono text-[12px] text-faint">{dateFmt.format(parseDay(open))}</p>
          {lines.length ? (
            <ul className="mt-1 space-y-0.5">
              {lines.map((l, i) => (
                <li key={i} className="text-muted [overflow-wrap:anywhere]">
                  {l}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-faint">Nothing that day.</p>
          )}
        </div>
      )}
    </div>
  );
}
