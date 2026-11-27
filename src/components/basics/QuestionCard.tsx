'use client';

import { useState } from 'react';

import Glossed from '@/components/basics/Glossed';
import Prose from '@/components/Prose';
import { asCodeBlock } from '@/lib/basics';
import type { BasicQuestion } from '@/types/navi';

export type Answer = { picked: number | null; sure: boolean; result: 'right' | 'wrong' | 'stuck' };

/**
 * One question (PLAN-basics.md 3, 5): "sure / guess" before picking, then the
 * answer and why. "I don't get it" shows the setup first; after that the answer
 * is not graded (result "stuck"), only shown.
 */
export default function QuestionCard({ q, onDone, label }: { q: BasicQuestion; onDone: (a: Answer) => void; label: string }) {
  const [sure, setSure] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const right = picked === q.answer;
  const result: Answer['result'] = stuck ? 'stuck' : right ? 'right' : 'wrong';

  return (
    <div className="space-y-4 text-[15px] leading-relaxed">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[11px] text-faint">{label}</span>
        {!answered && !stuck && (
          <span className="flex gap-3 font-mono text-[12px]" role="radiogroup" aria-label="How sure are you">
            {(['guess', 'sure'] as const).map((w) => (
              <button key={w} type="button" role="radio" aria-checked={(w === 'sure') === sure} onClick={() => setSure(w === 'sure')} className={(w === 'sure') === sure ? 'text-ink' : 'text-faint hover:text-muted'}>
                {w}
              </button>
            ))}
          </span>
        )}
      </div>

      <Glossed text={q.prompt} glossary={q.glossary} className="text-ink" />

      {stuck && <p className="border-l border-line-strong pl-3 text-[14px] text-muted">{q.setup}</p>}

      <ul className="space-y-1.5">
        {q.options.map((o, i) => {
          const mark = answered ? (i === q.answer ? 'text-ink font-medium' : i === picked ? 'text-muted line-through' : 'text-faint') : 'text-ink';
          return (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => setPicked(i)}
                className={`flex w-full gap-3 rounded-md border px-3 py-2 text-left ${answered ? 'border-line' : 'border-line-strong hover:border-ink'} ${mark}`}
              >
                <span className="font-mono text-[12px] text-faint">{String.fromCharCode(97 + i)}</span>
                <span className="min-w-0">{o}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {!answered && !stuck && (
        <button type="button" onClick={() => setStuck(true)} className="font-mono text-[12px] text-faint hover:text-ink">
          I don&apos;t get it
        </button>
      )}

      {answered && (
        <div className="space-y-3 border-l border-line-strong pl-4 text-[14px]">
          <p className="font-mono text-[12px] text-ink">{stuck ? (right ? 'right · not graded' : 'not graded') : right ? 'right' : sure ? 'wrong · you were sure' : 'not quite'}</p>
          <ol className="space-y-1 text-muted">
            {q.why.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-[12px] text-faint">{i + 1}.</span>
                <span>{w}</span>
              </li>
            ))}
          </ol>
          {q.rule && <p className="text-ink">{q.rule}</p>}
          {q.seeIt && (
            <div>
              <p className="mb-1 font-mono text-[11px] text-faint">see it</p>
              <Prose text={asCodeBlock(q.seeIt)} />
            </div>
          )}
          <button type="button" onClick={() => onDone({ picked, sure, result })} className="rounded-md bg-ink px-3 py-1 text-[14px] text-bg active:scale-[0.97]">
            next
          </button>
        </div>
      )}
    </div>
  );
}
