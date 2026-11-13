'use client';

import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import { useLearning } from '@/hooks/useLearning';
import { aiError, newsNow } from '@/lib/ai';
import { weekOf } from '@/lib/plan';
import { watchDigests, type DigestDoc } from '@/lib/repo';
import type { NewsItem } from '@/types/navi';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

/** External link: new tab, no underline (ws/app rule), ink on hover. */
function Out({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-ink transition-colors hover:text-muted">
      {children}
    </a>
  );
}

function Items({ items }: { items: NewsItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((i) => (
        <li key={i.url}>
          <p className="leading-snug">
            <Out href={i.url}>{i.title}</Out>
            {i.source && <span className="ml-2 font-mono text-[11px] text-faint">{i.source}</span>}
          </p>
          {i.why && <p className="mt-0.5 text-[14px] text-muted">{i.why}</p>}
        </li>
      ))}
    </ul>
  );
}

function DigestBody({ d }: { d: DigestDoc }) {
  const banking = d.items.filter((i) => i.group === 'banking');
  const outside = d.items.filter((i) => i.group !== 'banking');
  return (
    <div className="space-y-8 text-[15px]">
      {banking.length > 0 && (
        <section>
          <SectionTitle>inside banking</SectionTitle>
          <Items items={banking} />
        </section>
      )}
      {outside.length > 0 && (
        <section>
          <SectionTitle>outside</SectionTitle>
          <Items items={outside} />
        </section>
      )}
      {d.postmortem && (
        <section>
          <SectionTitle>postmortem of the week</SectionTitle>
          <p className="leading-snug">
            <Out href={d.postmortem.url}>{d.postmortem.title}</Out>
            {d.postmortem.source && <span className="ml-2 font-mono text-[11px] text-faint">{d.postmortem.source}</span>}
          </p>
          <p className="mt-2 text-muted">{d.postmortem.summary}</p>
          <ol className="mt-3 space-y-1">
            {d.postmortem.questions.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-[12px] text-faint">{i + 1}.</span>
                <span className="text-ink">{q}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {!d.items.length && !d.postmortem && <p className="text-muted">Nothing with a working link this week.</p>}
    </div>
  );
}

/** Weekly digest and postmortem of the week (PLAN-navi.md P6). Made on Sunday morning, or by the button. */
export default function NewsView() {
  const uid = useUid();
  const { today } = useLearning();
  const [digests, setDigests] = useState<DigestDoc[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => watchDigests(uid, setDigests), [uid]);
  if (!digests || !today) return <main className="column" />;

  const thisWeek = weekOf(today);
  const current = digests.find((d) => d.id === thisWeek) ?? null;
  const older = digests.filter((d) => d.id !== thisWeek);

  const get = async () => {
    setBusy(true);
    setError(null);
    try {
      await newsNow();
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="column">
      <PageHead title="news" meta={thisWeek.replace('-W', ' week ')} />

      <div className="mt-8">
        {current ? (
          <DigestBody d={current} />
        ) : busy ? (
          <Waiting word="searching" />
        ) : (
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => void get()} className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97]">
              get this week
            </button>
            {error && <span className="text-[14px] text-muted">{error}</span>}
          </div>
        )}
      </div>

      {older.length > 0 && (
        <section className="mt-12 text-[15px]">
          <SectionTitle>earlier</SectionTitle>
          {older.map((d) => (
            <div key={d.id}>
              <button type="button" aria-expanded={open === d.id} onClick={() => setOpen(open === d.id ? null : d.id)} className="py-1.5 font-mono text-[13px] text-muted hover:text-ink">
                {d.id.replace('-W', ' week ')}
              </button>
              {open === d.id && (
                <div className="mb-4 ml-1 border-l border-line-strong pl-4 pt-2">
                  <DigestBody d={d} />
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
