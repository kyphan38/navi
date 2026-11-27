'use client';

import { useEffect, useState } from 'react';

import Prose from '@/components/Prose';
import Waiting from '@/components/Waiting';
import { aiError, basicsExplain, basicsLab } from '@/lib/ai';
import { CONCEPTS } from '@/lib/basics-catalog';
import { addSkillEvidence } from '@/lib/repo';
import { saveBasicState, watchBasicLab } from '@/lib/repo-basics';
import type { BasicLab, BasicState } from '@/types/navi';

const DAY = 86_400_000;
const nameOf = (id: string) => CONCEPTS.find((c) => c.id === id)?.name ?? id;
const button = 'rounded-md bg-ink px-3 py-1 text-[14px] text-bg active:scale-[0.97] disabled:opacity-30';
const quiet = 'font-mono text-[12px] text-faint hover:text-ink';

type Grade = { pass: boolean; good: string; missing: string[]; better: string };

/** Weekly: explain one concept in your own words; AI says what is missing. A miss brings it back tomorrow. */
export function ExplainCard({ uid, id, state }: { uid: string; id: string; state: BasicState }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const { grade: g } = await basicsExplain({ conceptId: id, text: text.trim() });
      setGrade(g);
      const now = Date.now();
      saveBasicState(uid, id, { ...state, explainedAt: now, nextReviewAt: g.pass ? state.nextReviewAt : now + DAY, updatedAt: now });
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 text-[15px]">
      <p className="font-mono text-[11px] text-faint">explain it back · weekly</p>
      <h3 className="text-[17px] text-ink">{nameOf(id)}</h3>
      {grade ? (
        <div className="space-y-2 border-l border-line-strong pl-4 text-[14px]">
          <p className="font-mono text-[12px] text-ink">{grade.pass ? 'clear' : 'not yet · it comes back tomorrow'}</p>
          {grade.good && <p className="text-muted">{grade.good}</p>}
          {grade.missing.length > 0 && (
            <ul className="space-y-0.5 text-ink">
              {grade.missing.map((m, i) => (
                <li key={i}>- {m}</li>
              ))}
            </ul>
          )}
          <p className="text-muted">{grade.better}</p>
        </div>
      ) : busy ? (
        <Waiting word="reading" />
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="In your own words, 2-4 sentences, no notes"
            className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-[16px] leading-relaxed text-ink placeholder:text-faint focus:border-line-strong"
          />
          <div className="flex items-baseline gap-4">
            <button type="button" disabled={text.trim().split(/\s+/).length < 12} onClick={() => void send()} className={button}>
              send
            </button>
            {error && <span className="text-[14px] text-muted">{error}</span>}
          </div>
        </>
      )}
    </div>
  );
}

/** Weekend: a 15-minute hands-on lab in a throwaway container. "done" adds level 2 evidence to the concept's skills. */
export function LabCard({ uid, id, state }: { uid: string; id: string; state: BasicState }) {
  const [lab, setLab] = useState<BasicLab | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => watchBasicLab(uid, id, setLab), [uid, id]);
  const get = async () => {
    setBusy(true);
    setError(null);
    try {
      await basicsLab({ conceptId: id });
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(false);
    }
  };
  const done = () => {
    const now = Date.now();
    saveBasicState(uid, id, { ...state, labDoneAt: now, updatedAt: now });
    for (const skill of CONCEPTS.find((c) => c.id === id)?.skills ?? []) {
      addSkillEvidence(uid, skill, { level: 2, kind: 'lab', ref: id, note: `lab: ${lab?.title ?? nameOf(id)}`.slice(0, 500), at: now });
    }
  };
  return (
    <div className="space-y-3 text-[15px]">
      <p className="font-mono text-[11px] text-faint">lab · weekend · about 15 minutes</p>
      <h3 className="text-[17px] text-ink">{lab?.title ?? nameOf(id)}</h3>
      {lab === undefined ? (
        <Waiting />
      ) : lab === null ? (
        busy ? (
          <Waiting word="writing the lab" />
        ) : (
          <div className="flex items-baseline gap-4">
            <button type="button" onClick={() => void get()} className={button}>
              get the lab
            </button>
            {error && <span className="text-[14px] text-muted">{error}</span>}
          </div>
        )
      ) : (
        <div className="space-y-3 leading-relaxed">
          <p className="text-muted">{lab.goal}</p>
          {lab.needs && <p className="font-mono text-[12px] text-faint">needs · {lab.needs}</p>}
          <ol className="space-y-3">
            {lab.steps.map((s, i) => (
              <li key={i} className="space-y-1">
                <p className="flex gap-2">
                  <span className="font-mono text-[12px] text-faint">{i + 1}.</span>
                  <span className="text-ink">{s.do}</span>
                </p>
                {s.command && <Prose text={'```\n' + s.command + '\n```'} />}
                {s.expect && <p className="text-[14px] text-muted">you should see: {s.expect}</p>}
              </li>
            ))}
          </ol>
          {lab.cleanup && (
            <div>
              <p className="mb-1 font-mono text-[11px] text-faint">clean up</p>
              <Prose text={'```\n' + lab.cleanup + '\n```'} />
            </div>
          )}
          {lab.learn && <p className="text-ink">{lab.learn}</p>}
          {state.labDoneAt ? (
            <p className={quiet}>done · added to your skills</p>
          ) : (
            <button type="button" onClick={done} className={button}>
              done
            </button>
          )}
        </div>
      )}
    </div>
  );
}
