'use client';

import { useState } from 'react';

import { useNow } from '@/hooks/useNow';
import { useTerms } from '@/hooks/useTerms';
import type { SkillView } from '@/hooks/useMapData';
import { parseDay } from '@/lib/day';
import { oneOnOne } from '@/lib/one-on-one';
import type { CourseDoc, DayDoc, DrillDoc, MilestoneDoc } from '@/lib/repo';

const DAY = 86_400_000;
const toInput = (t: number) => new Date(t - new Date(t).getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

/** 1:1 prep: notes for a date range, ready to copy. Defaults to the last 30 days. */
export default function OneOnOnePrep(props: {
  course: CourseDoc | null;
  days: DayDoc[];
  skills: SkillView[];
  drills: DrillDoc[];
  milestones: MilestoneDoc[];
}) {
  const now = useNow();
  const terms = useTerms();
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (!now) return null;

  const fromDay = from ?? toInput(now - 30 * DAY);
  const toDay = to ?? toInput(now);
  const text = oneOnOne({
    from: parseDay(fromDay).getTime() - 12 * 3_600_000,
    to: parseDay(toDay).getTime() + 12 * 3_600_000 - 1,
    courseTitle: props.course?.title ?? null,
    modules: props.course?.modules ?? [],
    days: props.days,
    dayTime: (id) => parseDay(id).getTime(),
    skills: props.skills,
    drills: props.drills,
    terms: terms ?? [],
    milestones: props.milestones,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-3 text-[15px]">
      <div className="flex flex-wrap items-baseline gap-3 font-mono text-[13px]">
        <input type="date" value={fromDay} max={toDay} onChange={(e) => setFrom(e.target.value)} aria-label="From" className="bg-transparent text-ink" />
        <span className="text-faint">to</span>
        <input type="date" value={toDay} min={fromDay} onChange={(e) => setTo(e.target.value)} aria-label="To" className="bg-transparent text-ink" />
        <button type="button" onClick={() => void copy()} className="ml-auto text-faint hover:text-ink">
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-surface-2 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-ink">{text}</pre>
    </div>
  );
}
