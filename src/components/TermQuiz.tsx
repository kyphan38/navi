'use client';

import { useState } from 'react';

import Waiting from '@/components/Waiting';
import { aiError, quizTerm, type QuizQuestion } from '@/lib/ai';

/** 3 quick questions about one term. `onDone` gets the number right. */
export default function TermQuiz({ termId, onDone }: { termId: string; onDone: (right: number, total: number) => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [picks, setPicks] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setQuestions((await quizTerm({ termId })).questions);
    } catch (err) {
      setError(aiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!questions) {
    return (
      <div className="text-[14px]">
        {loading ? (
          <Waiting />
        ) : (
          <button type="button" onClick={() => void load()} className="font-mono text-[12px] text-faint hover:text-ink">
            {error ? 'try again' : 'start quiz'}
          </button>
        )}
        {error && <p className="mt-1 text-muted">{error}</p>}
      </div>
    );
  }

  const pick = (qi: number, oi: number) => {
    if (picks[qi] !== undefined) return;
    const next = [...picks];
    next[qi] = oi;
    setPicks(next);
    if (next.filter((p) => p !== undefined).length === questions.length) {
      onDone(questions.filter((q, i) => next[i] === q.answer).length, questions.length);
    }
  };

  return (
    <ol className="space-y-5 text-[15px]">
      {questions.map((q, qi) => {
        const picked = picks[qi];
        return (
          <li key={qi}>
            <p className="text-ink">{q.question}</p>
            <ul className="mt-1.5">
              {q.options.map((o, oi) => {
                const isAnswer = oi === q.answer;
                const shown = picked !== undefined;
                return (
                  <li key={oi}>
                    <button
                      type="button"
                      disabled={shown}
                      onClick={() => pick(qi, oi)}
                      className={`flex w-full items-baseline gap-3 py-1 text-left ${
                        shown ? (isAnswer ? 'text-ink' : 'text-faint') : 'text-muted hover:text-ink'
                      }`}
                    >
                      <span className={`relative top-[-1px] size-[7px] shrink-0 rounded-full border ${shown && isAnswer ? 'border-ink bg-ink' : 'border-line-strong'}`} aria-hidden />
                      {o}
                    </button>
                  </li>
                );
              })}
            </ul>
            {picked !== undefined && (
              <p className="mt-1.5 text-[14px] text-muted">
                <span className="mr-2 font-mono text-[12px] text-ink">{picked === q.answer ? 'correct' : 'not quite'}</span>
                {q.why}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
