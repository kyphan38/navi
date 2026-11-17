'use client';

import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import { aiError, interviewAnswer, interviewFinish, interviewStart } from '@/lib/ai';
import { findInternalData } from '@/lib/internal-data';
import { deleteInterview, watchInterviews, type InterviewDoc } from '@/lib/repo-career';
import type { InterviewKind } from '@/types/navi';

const KINDS: { kind: InterviewKind; label: string; line: string }[] = [
  { kind: 'troubleshooting', label: 'troubleshooting', line: 'A problem in production: find and fix it.' },
  { kind: 'design', label: 'system design', line: 'Design or change part of a system.' },
  { kind: 'behavioral', label: 'behavioral', line: '"Tell me about a time..." Your STAR stories help.' },
];
const MAIN = 5;
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

function Squares({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-1 align-middle" aria-label={`${value} of 3`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={`size-2.5 rounded-[2px] border ${n <= value ? 'border-ink bg-ink' : 'border-line-strong'}`} />
      ))}
    </span>
  );
}

const labelOf = (k: InterviewKind) => KINDS.find((x) => x.kind === k)?.label ?? k;

/** Main questions with their follow-ups, numbered like the feedback. */
function groups(iv: InterviewDoc) {
  const out: { main: InterviewDoc['turns'][number]; follow: InterviewDoc['turns'][number] | null }[] = [];
  for (const t of iv.turns) {
    if (t.followUp && out.length) out[out.length - 1].follow = t;
    else out.push({ main: t, follow: null });
  }
  return out;
}

function Transcript({ iv, withFeedback }: { iv: InterviewDoc; withFeedback: boolean }) {
  return (
    <ol className="space-y-6 text-[15px] leading-relaxed">
      {groups(iv).map((g, i) => {
        const fb = withFeedback ? iv.feedback?.questions[i] : undefined;
        return (
          <li key={i}>
            <p className="text-ink">
              <span className="mr-2 font-mono text-[12px] text-faint">{i + 1}.</span>
              {g.main.q}
            </p>
            {g.main.a && <p className="mt-1 whitespace-pre-wrap text-muted">{g.main.a}</p>}
            {g.follow && (
              <>
                <p className="mt-2 text-ink">
                  <span className="mr-2 font-mono text-[12px] text-faint">and</span>
                  {g.follow.q}
                </p>
                {g.follow.a && <p className="mt-1 whitespace-pre-wrap text-muted">{g.follow.a}</p>}
              </>
            )}
            {fb && (
              <div className="mt-2 border-l border-line-strong pl-3 text-[14px]">
                <p className="flex items-baseline gap-3">
                  <Squares value={fb.score} />
                  <span className="text-muted">{fb.note}</span>
                </p>
                <p className="mt-1.5 text-ink">
                  <span className="mr-2 font-mono text-[12px] text-faint">better</span>
                  {fb.better}
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Mock interview (V1): 5 questions, a follow-up when needed, then feedback with better answers. */
export default function InterviewView() {
  const uid = useUid();
  const [items, setItems] = useState<InterviewDoc[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => watchInterviews(uid, setItems), [uid]);
  if (!items) return <main className="column" />;

  const active = items.find((i) => i.status === 'active') ?? null;
  const past = items.filter((i) => i.status === 'done');
  const current = active?.turns[active.turns.length - 1] ?? null;
  const waitingAnswer = !!current && current.a === null;
  const asked = active ? active.turns.filter((t) => !t.followUp).length : 0;
  const found = findInternalData(answer);

  const run = async (word: string, fn: () => Promise<unknown>) => {
    setBusy(word);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(null);
    }
  };

  const send = () =>
    active &&
    run('thinking', async () => {
      const { over } = await interviewAnswer({ id: active.id, answer: answer.trim() });
      setAnswer('');
      if (over) await interviewFinish({ id: active.id });
    });

  return (
    <main className="column">
      <PageHead title="interview" meta={active ? `${labelOf(active.kind)} · ${Math.min(asked, MAIN)} of ${MAIN}` : undefined} />

      {!active ? (
        <section className="mt-8 text-[15px]">
          <SectionTitle>start</SectionTitle>
          {busy ? (
            <Waiting word={busy} />
          ) : (
            <ul className="space-y-3">
              {KINDS.map((k) => (
                <li key={k.kind}>
                  <button type="button" onClick={() => void run('preparing', () => interviewStart({ kind: k.kind }))} className="group text-left">
                    <span className="text-ink group-hover:text-muted">{k.label}</span>
                    <span className="block text-[14px] text-faint">{k.line}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-3 text-[14px] text-muted">{error}</p>}
        </section>
      ) : (
        <section className="mt-8">
          <Transcript iv={{ ...active, turns: waitingAnswer ? active.turns.slice(0, -1) : active.turns }} withFeedback={false} />
          {current && waitingAnswer && (
            <div className="mt-6 text-[15px]">
              <p className="text-ink">
                <span className="mr-2 font-mono text-[12px] text-faint">{current.followUp ? 'and' : `${asked}.`}</span>
                {current.q}
              </p>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="Answer as you would say it. No internal names or data."
                aria-label="Your answer"
                className="mt-3 w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-[16px] leading-relaxed text-ink placeholder:text-faint focus:border-line-strong"
              />
              {found.length > 0 && <p className="text-[14px] text-ink">Remove first: {found.join(', ')}.</p>}
              <div className="mt-2 flex items-center gap-5">
                {busy ? (
                  <Waiting word={busy} />
                ) : (
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={!answer.trim() || found.length > 0}
                    className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97] disabled:opacity-30"
                  >
                    answer
                  </button>
                )}
                {error && <span className="text-[14px] text-muted">{error}</span>}
              </div>
            </div>
          )}
          {/* All answered but the feedback call failed: try it again. */}
          {!waitingAnswer && !busy && (
            <button type="button" onClick={() => void run('scoring', () => interviewFinish({ id: active.id }))} className="mt-6 rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg">
              get feedback
            </button>
          )}
          {!waitingAnswer && busy && (
            <div className="mt-6">
              <Waiting word={busy} />
            </div>
          )}
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-12 text-[15px]">
          <SectionTitle>done</SectionTitle>
          <ul>
            {past.map((iv) => {
              const scores = iv.feedback?.questions.map((q) => q.score) ?? [];
              const pct = scores.length ? Math.round((100 * scores.reduce((a, b) => a + b, 0)) / (scores.length * 3)) : null;
              return (
                <li key={iv.id}>
                  <button type="button" aria-expanded={open === iv.id} onClick={() => setOpen(open === iv.id ? null : iv.id)} className="flex w-full items-baseline gap-3 py-2 text-left">
                    <span className="w-14 shrink-0 font-mono text-[12px] text-faint tabular-nums">{dateFmt.format(iv.createdAt)}</span>
                    <span className={`min-w-0 flex-1 ${open === iv.id ? 'text-ink' : 'text-muted'}`}>{labelOf(iv.kind)}</span>
                    {pct !== null && <span className="shrink-0 font-mono text-[12px] text-faint tabular-nums">{pct}%</span>}
                  </button>
                  {open === iv.id && iv.feedback && (
                    <div className="mb-6 ml-1 border-l border-line-strong pl-4 pt-1">
                      <p className="mb-4 text-ink">{iv.feedback.overall}</p>
                      <Transcript iv={iv} withFeedback />
                      {iv.feedback.practise.length > 0 && (
                        <div className="mt-5">
                          <SectionTitle>practise</SectionTitle>
                          <ul className="space-y-1">
                            {iv.feedback.practise.map((p, i) => (
                              <li key={i} className="text-ink">
                                - {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button type="button" onClick={() => deleteInterview(uid, iv.id)} className="mt-5 font-mono text-[12px] text-faint hover:text-ink">
                        delete
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
