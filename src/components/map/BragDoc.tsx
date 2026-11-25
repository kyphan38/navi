'use client';

import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import Waiting from '@/components/Waiting';
import type { SkillView } from '@/hooks/useMapData';
import { useNow } from '@/hooks/useNow';
import { useTerms } from '@/hooks/useTerms';
import { aiError, bragDoc } from '@/lib/ai';
import { bragFacts, quarterRange, recentQuarters } from '@/lib/brag';
import { dayOf, parseDay } from '@/lib/day';
import { watchDaysSince, type CourseDoc, type DayDoc, type DrillDoc, type MilestoneDoc } from '@/lib/repo';

/** A one-page brag doc for a quarter (V3), written by AI only from the app's facts. */
export default function BragDoc(props: {
  courses: CourseDoc[];
  skills: SkillView[];
  drills: DrillDoc[];
  milestones: MilestoneDoc[];
  stories: { title: string; createdAt: number }[];
}) {
  const uid = useUid();
  const now = useNow();
  const terms = useTerms();
  const quarters = now ? recentQuarters(now, 4) : [];
  const [q, setQ] = useState<string | null>(null);
  const quarter = q ?? quarters[0] ?? '';
  const [days, setDays] = useState<DayDoc[]>([]);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Study days of the chosen quarter (the Map itself keeps only 12 weeks).
  const since = quarter ? dayOf(quarterRange(quarter).from) : '';
  useEffect(() => (since ? watchDaysSince(uid, since, setDays) : undefined), [uid, since]);
  if (!now) return null;

  const write = async () => {
    setBusy(true);
    setError(null);
    try {
      const facts = bragFacts(quarter, {
        courseTitle: props.courses.length === 1 ? props.courses[0].title : null,
        modules: props.courses.flatMap((c) => c.modules),
        days,
        dayTime: (id) => parseDay(id).getTime(),
        skills: props.skills,
        drills: props.drills,
        terms: terms ?? [],
        milestones: props.milestones,
        stories: props.stories,
      });
      const res = await bragDoc({ quarter, facts });
      setText(res.markdown);
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text ?? ''], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `brag-${quarter}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="text-[15px]">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        {quarters.map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => {
              setQ(x);
              setText(null);
            }}
            className={`font-mono text-[13px] ${x === quarter ? 'text-ink' : 'text-faint hover:text-muted'}`}
          >
            {x.replace('-', ' ')}
          </button>
        ))}
        {busy ? (
          <Waiting word="writing" />
        ) : (
          <button type="button" onClick={() => void write()} className="font-mono text-[12px] text-faint hover:text-ink">
            write
          </button>
        )}
        {error && <span className="text-[14px] text-muted">{error}</span>}
      </div>
      {text && (
        <div className="mt-4">
          <pre className="whitespace-pre-wrap rounded-md border border-line bg-surface p-3 font-sans text-[14px] leading-relaxed text-ink">{text}</pre>
          <p className="mt-2 flex gap-4 font-mono text-[12px] text-faint">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  // copy blocked: the text is on screen to select
                }
              }}
              className="hover:text-ink"
            >
              {copied ? 'copied' : 'copy'}
            </button>
            <button type="button" onClick={download} className="hover:text-ink">
              download .md
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
