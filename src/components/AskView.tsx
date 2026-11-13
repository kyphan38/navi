'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { useUid } from '@/components/AuthGate';
import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import { aiError, askSenior } from '@/lib/ai';
import { findInternalData } from '@/lib/internal-data';
import { deleteAsk, watchAsks, type AskDoc } from '@/lib/repo';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 font-mono text-[12px] tracking-[0.08em] text-faint">{title}</h3>
      {children}
    </section>
  );
}

function Answer({ a }: { a: AskDoc['answer'] }) {
  return (
    <div className="space-y-5 text-[15px] leading-relaxed">
      <Part title="the real problem">
        <p className="text-ink">{a.restate}</p>
      </Part>
      {a.questions.length > 0 && (
        <Part title="ask first">
          <ul className="space-y-0.5 text-muted">
            {a.questions.map((q, i) => (
              <li key={i}>- {q}</li>
            ))}
          </ul>
        </Part>
      )}
      {a.impact && (
        <Part title="impact">
          <p className="text-muted">{a.impact}</p>
        </Part>
      )}
      {a.options.length > 0 && (
        <Part title="options">
          <ul className="space-y-2">
            {a.options.map((o, i) => (
              <li key={i}>
                <p className="text-ink">{o.name}</p>
                <p className="text-[14px] text-muted">+ {o.pros}</p>
                <p className="text-[14px] text-muted">- {o.cons}</p>
              </li>
            ))}
          </ul>
        </Part>
      )}
      <Part title="what I would do">
        <p className="text-ink">{a.recommend}</p>
      </Part>
      {a.tellWho && (
        <Part title="who to tell">
          <p className="text-muted">{a.tellWho}</p>
        </Part>
      )}
      {a.firstSteps.length > 0 && (
        <Part title="first steps today">
          <ol className="space-y-0.5">
            {a.firstSteps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-[12px] text-faint">{i + 1}.</span>
                <span className="text-ink">{s}</span>
              </li>
            ))}
          </ol>
        </Part>
      )}
    </div>
  );
}

/** "Ask a senior" (PLAN-navi.md P6): a real problem in, how a senior thinks out. */
export default function AskView() {
  const uid = useUid();
  const [asks, setAsks] = useState<AskDoc[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => watchAsks(uid, setAsks), [uid]);

  const found = findInternalData(text);
  const send = async () => {
    if (busy || text.trim().length < 10 || found.length) return;
    setBusy(true);
    setError(null);
    try {
      const { id } = await askSenior({ question: text.trim() });
      setOpen(id);
      setText('');
    } catch (err) {
      // The server's own message says which internal data to remove.
      const msg = (err as { message?: string })?.message ?? '';
      setError(msg.startsWith('Remove internal data') || msg.startsWith('Write a bit more') ? msg : aiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="column">
      <PageHead title="ask a senior" />

      <div className="mt-8 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          rows={5}
          maxLength={3000}
          placeholder="A real problem at work. No internal names or data."
          aria-label="Your problem"
          className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-[16px] leading-relaxed text-ink placeholder:text-faint focus:border-line-strong"
        />
        {found.length > 0 && <p className="text-[14px] text-ink">Remove first: {found.join(', ')}.</p>}
        <div className="flex items-center gap-5">
          {busy ? (
            <Waiting />
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={text.trim().length < 10 || found.length > 0}
              className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97] disabled:opacity-30"
            >
              ask
            </button>
          )}
          {error && <span className="text-[14px] text-muted">{error}</span>}
        </div>
      </div>

      {asks && asks.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-2 font-mono text-[12px] tracking-[0.12em] text-faint">asked</h2>
          <ul>
            {asks.map((a) => (
              <li key={a.id} className="group">
                <button
                  type="button"
                  aria-expanded={open === a.id}
                  onClick={() => setOpen(open === a.id ? null : a.id)}
                  className="flex w-full items-baseline gap-3 py-2 text-left text-[15px]"
                >
                  <span className="w-14 shrink-0 font-mono text-[12px] text-faint tabular-nums">{dateFmt.format(a.createdAt)}</span>
                  <span className={`min-w-0 flex-1 truncate ${open === a.id ? 'text-ink' : 'text-muted'}`}>{a.question}</span>
                </button>
                {open === a.id && (
                  <div className="mb-4 ml-1 border-l border-line-strong pl-4 pt-1">
                    <p className="mb-4 whitespace-pre-wrap text-[14px] text-faint">{a.question}</p>
                    <Answer a={a.answer} />
                    <button type="button" onClick={() => deleteAsk(uid, a.id)} className="mt-5 font-mono text-[12px] text-faint hover:text-ink">
                      delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
