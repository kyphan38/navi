'use client';

import { useState } from 'react';

import Waiting from '@/components/Waiting';
import { aiError, explainBack, type Grade, type Turn } from '@/lib/ai';

/**
 * "Explain it back" (level 4): the AI plays a junior and asks 3 questions,
 * then grades. A pass is saved by the server as evidence.
 */
export default function ExplainBack({ skillId, skillName }: { skillId: string; skillName: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState('');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = async (next: Turn[]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await explainBack({ skillId, turns: next });
      if (res.grade) setGrade(res.grade);
      else if (res.question) setTurns([...next, { question: res.question }]);
      setAnswer('');
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(false);
    }
  };

  const current = turns[turns.length - 1];
  const send = () => {
    if (!answer.trim() || !current || busy) return;
    void step([...turns.slice(0, -1), { ...current, answer: answer.trim() }]);
  };

  if (!turns.length && !grade) {
    return (
      <div className="text-[14px]">
        {busy ? (
          <Waiting />
        ) : (
          <button type="button" onClick={() => void step([])} className="font-mono text-[12px] text-faint hover:text-ink">
            {error ? 'try again' : `teach "${skillName}" to a junior`}
          </button>
        )}
        {error && <p className="mt-1 text-muted">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-[15px]">
      {turns.map((t, i) => (
        <div key={i}>
          <p className="text-ink">
            <span className="mr-2 font-mono text-[12px] text-faint">junior</span>
            {t.question}
          </p>
          {t.answer && <p className="mt-1 whitespace-pre-wrap text-muted">{t.answer}</p>}
        </div>
      ))}

      {grade ? (
        <div className="border-l border-line-strong pl-3">
          <p className="font-mono text-[12px] text-ink">{grade.pass ? 'passed · level 4' : 'not yet'}</p>
          <p className="mt-1 text-muted">{grade.feedback}</p>
          {grade.gaps.map((g, i) => (
            <p key={i} className="text-[14px] text-faint">
              - {g}
            </p>
          ))}
        </div>
      ) : busy ? (
        <Waiting word={turns.every((t) => t.answer) || turns.length >= 3 ? 'grading' : 'thinking'} />
      ) : (
        current &&
        !current.answer && (
          <div className="space-y-2">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={3}
              maxLength={3000}
              placeholder="Your answer"
              className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-[16px] leading-relaxed text-ink placeholder:text-faint focus:border-line-strong"
            />
            <button type="button" onClick={send} disabled={!answer.trim()} className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97] disabled:opacity-30">
              send
            </button>
          </div>
        )
      )}
      {error && <p className="text-[14px] text-muted">{error}</p>}
    </div>
  );
}
