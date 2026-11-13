'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { useUid } from '@/components/AuthGate';
import { DrillLog } from '@/components/DrillLog';
import Prose from '@/components/Prose';
import Waiting from '@/components/Waiting';
import { useStartDrill } from '@/hooks/useStartDrill';
import { CRITERIA, scorePercent } from '@/lib/drills';
import { watchMistakesFor, type DrillDoc } from '@/lib/repo';

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

/** Three small squares, filled up to the score. */
function Squares({ value }: { value: number }) {
  return (
    <span className="flex gap-1" aria-label={`${value} of 3`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={`size-2.5 rounded-[2px] border ${n <= value ? 'border-ink bg-ink' : 'border-line-strong'}`} />
      ))}
    </span>
  );
}

/** Result of a finished drill: scores, coach notes, your path next to the senior path. */
export default function Debrief({ drill }: { drill: DrillDoc }) {
  const uid = useUid();
  const [mistakes, setMistakes] = useState<{ text: string; lesson: string }[]>([]);
  const { start, busy, error } = useStartDrill();
  const [showLog, setShowLog] = useState(false);

  useEffect(() => watchMistakesFor(uid, drill.id, setMistakes), [uid, drill.id]);

  const pct = scorePercent(drill.score);
  const answers = drill.rounds.map((r) => r.answer).filter((a): a is string => !!a);

  return (
    <div className="mt-8 space-y-10 text-[15px] leading-relaxed">
      <section>
        <SectionTitle>
          score <span className="ml-2 text-ink tabular-nums">{pct ?? '-'}%</span>
        </SectionTitle>
        <ul className="space-y-1.5">
          {CRITERIA.filter((c) => typeof drill.score?.[c.key] === 'number').map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-4 sm:justify-start">
              <span className="w-40 text-muted">{c.label}</span>
              <Squares value={drill.score![c.key] as number} />
            </li>
          ))}
        </ul>
      </section>

      {drill.debrief && (
        <section>
          <SectionTitle>coach</SectionTitle>
          <Prose text={drill.debrief} className="text-ink" />
        </section>
      )}

      <section className="grid gap-8 sm:grid-cols-2">
        <div>
          <SectionTitle>your path</SectionTitle>
          <ol className="space-y-2 text-muted">
            {answers.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-mono text-[12px] text-faint tabular-nums">{i + 1}.</span>
                <span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{a}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <SectionTitle>senior path</SectionTitle>
          {drill.seniorPath && <Prose text={drill.seniorPath} className="text-ink" />}
        </div>
      </section>

      {mistakes.length > 0 && (
        <section>
          <SectionTitle>to fix</SectionTitle>
          <ul className="space-y-3">
            {mistakes.map((m, i) => (
              <li key={i}>
                <p className="text-muted">{m.text}</p>
                <p className="text-ink">{m.lesson}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {drill.whatIf.length > 0 && (
        <section>
          <SectionTitle>what if</SectionTitle>
          <ul className="space-y-4">
            {drill.whatIf.map((w, i) => (
              <li key={i}>
                <p className="text-ink">{w.question}</p>
                <p className="text-muted">{w.answer}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {drill.newTerms.length > 0 && (
        <section>
          <SectionTitle>terms</SectionTitle>
          <p className="font-mono text-[13px] text-muted">{drill.newTerms.join(' · ')}</p>
        </section>
      )}

      <section>
        <button type="button" onClick={() => setShowLog((v) => !v)} className="font-mono text-[12px] text-faint hover:text-ink">
          {showLog ? 'hide the drill' : 'show the drill'}
        </button>
        {showLog && (
          <div className="mt-5">
            <DrillLog drill={drill} />
          </div>
        )}
      </section>

      <div className="flex items-center gap-5">
        {busy ? (
          <Waiting />
        ) : (
          <button
            type="button"
            onClick={() => void start(drill.type, drill.level)}
            className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97]"
          >
            another
          </button>
        )}
        {error && <span className="text-[14px] text-muted">{error}</span>}
      </div>
    </div>
  );
}
