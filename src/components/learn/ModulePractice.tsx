'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import Waiting from '@/components/Waiting';
import { aiError, moduleExam, type ExamQuestion } from '@/lib/ai';
import { addMistake, type CourseDoc } from '@/lib/repo';
import type { CourseModule } from '@/types/navi';

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * 5 exam-style questions for one module (V4). Answer all, then check: each
 * question shows the right answer and why; wrong ones join the review queue.
 */
export default function ModulePractice({ course, module, onClose }: { course: CourseDoc; module: CourseModule; onClose: () => void }) {
  const uid = useUid();
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<number[][]>([]);
  const [checked, setChecked] = useState(false);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await moduleExam({ courseTitle: course.title, goal: course.goal, section: module.section, title: module.title, doneWhen: module.doneWhen });
      setQuestions(res.questions);
      setPicks(res.questions.map(() => []));
      setChecked(false);
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(false);
    }
  };

  const pick = (qi: number, oi: number, multi: boolean) => {
    if (checked) return;
    setPicks((all) => all.map((p, i) => (i !== qi ? p : multi ? (p.includes(oi) ? p.filter((x) => x !== oi) : [...p, oi]) : [oi])));
  };

  const check = () => {
    if (!questions) return;
    setChecked(true);
    questions.forEach((q, i) => {
      if (sameSet(picks[i], q.answers)) return;
      const yours = picks[i].map((x) => q.options[x]).join('; ') || '(none)';
      addMistake(uid, {
        drillId: `exam:${course.id}`,
        skillId: module.skillIds[0] ?? null,
        text: `${q.question} You picked: ${yours}`,
        lesson: `${q.answers.map((x) => q.options[x]).join('; ')}. ${q.why}`,
      });
    });
  };

  const right = questions && checked ? questions.filter((q, i) => sameSet(picks[i], q.answers)).length : 0;

  return (
    <div className="mb-4 mt-2 border-l border-line-strong pl-4 text-[15px]">
      {!questions ? (
        busy ? (
          <Waiting word="writing questions" />
        ) : (
          <div className="flex items-baseline gap-4">
            <button type="button" onClick={() => void load()} className="rounded-md bg-ink px-3 py-1 text-[14px] text-bg active:scale-[0.97]">
              5 exam questions
            </button>
            <button type="button" onClick={onClose} className="font-mono text-[12px] text-faint hover:text-ink">
              close
            </button>
            {error && <span className="text-[14px] text-muted">{error}</span>}
          </div>
        )
      ) : (
        <ol className="space-y-5">
          {questions.map((q, qi) => {
            const multi = q.answers.length > 1;
            const ok = checked && sameSet(picks[qi], q.answers);
            return (
              <li key={qi}>
                <p className="text-ink">
                  <span className="mr-2 font-mono text-[12px] text-faint">{qi + 1}.</span>
                  {q.question}
                  {/* The question often says "Choose two" itself. */}
                  {multi && !/choose/i.test(q.question) && <span className="ml-2 font-mono text-[12px] text-faint">choose {q.answers.length}</span>}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {q.options.map((o, oi) => {
                    const on = picks[qi]?.includes(oi);
                    const isRight = checked && q.answers.includes(oi);
                    return (
                      <li key={oi}>
                        <button
                          type="button"
                          role={multi ? 'checkbox' : 'radio'}
                          aria-checked={on}
                          disabled={checked}
                          onClick={() => pick(qi, oi, multi)}
                          className="flex w-full items-baseline gap-3 text-left"
                        >
                          <span className={`relative top-[1px] size-2.5 shrink-0 ${multi ? 'rounded-[2px]' : 'rounded-full'} border ${on ? 'border-ink bg-ink' : 'border-line-strong'}`} aria-hidden />
                          <span className={isRight ? 'font-medium text-ink' : checked ? 'text-faint' : 'text-muted'}>{o}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {checked && (
                  <p className="mt-1.5 text-[14px] text-muted">
                    <span className="mr-2 font-mono text-[12px] text-faint">{ok ? 'right' : 'to review'}</span>
                    {q.why}
                  </p>
                )}
              </li>
            );
          })}
          <li className="flex items-baseline gap-4">
            {checked ? (
              <>
                <span className="text-ink tabular-nums">
                  {right} of {questions.length} right
                </span>
                <button type="button" onClick={() => void load()} className="font-mono text-[12px] text-faint hover:text-ink">
                  new questions
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={check}
                disabled={picks.some((p) => p.length === 0)}
                className="rounded-md bg-ink px-3 py-1 text-[14px] text-bg active:scale-[0.97] disabled:opacity-30"
              >
                check
              </button>
            )}
            <button type="button" onClick={onClose} className="font-mono text-[12px] text-faint hover:text-ink">
              close
            </button>
          </li>
        </ol>
      )}
    </div>
  );
}
