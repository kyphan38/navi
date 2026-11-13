'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useUid } from '@/components/AuthGate';
import PageHead from '@/components/PageHead';
import TermQuiz from '@/components/TermQuiz';
import Review from '@/components/Review';
import Waiting from '@/components/Waiting';
import { useDrills } from '@/hooks/useDrills';
import { useNow } from '@/hooks/useNow';
import { useProfile } from '@/hooks/useProfile';
import { useTerms } from '@/hooks/useTerms';
import { addTerms, aiError } from '@/lib/ai';
import { dueItems } from '@/lib/leitner';
import { deleteTerm, updateTerm, type TermDoc } from '@/lib/repo';
import { CHECKLIST, groupByArea, missingDrillTerms, reviewPatch, statusPatch, studyPrompt } from '@/lib/terms';
import type { Term } from '@/types/navi';

type Filter = 'all' | Term['status'];
const FILTERS: readonly Filter[] = ['all', 'new', 'learning', 'known'];
const STATUSES: readonly Term['status'][] = ['new', 'learning', 'known'];

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-1 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

function TermDetail({ term, now }: { term: TermDoc; now: number }) {
  const uid = useUid();
  const profile = useProfile();
  const [copied, setCopied] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(studyPrompt(term.name, profile));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const toggle = (key: keyof Term['checklist']) => updateTerm(uid, term.id, { checklist: { ...term.checklist, [key]: !term.checklist[key] } });

  const quizDone = (right: number, total: number) => {
    setResult(`${right}/${total}`);
    // 2 of 3 right counts as a good review.
    updateTerm(uid, term.id, reviewPatch(term, right * 3 >= total * 2, now));
  };

  return (
    <div className="mb-3 ml-1 space-y-4 border-l border-line-strong pl-4 pt-1 text-[15px]">
      <p className="text-muted">{term.oneLine}</p>

      <ul className="space-y-1" aria-label="What to know">
        {CHECKLIST.map((c) => (
          <li key={c.key}>
            <button type="button" role="checkbox" aria-checked={term.checklist[c.key]} onClick={() => toggle(c.key)} className="flex items-center gap-3 py-0.5 text-left">
              <span className={`size-2.5 rounded-[2px] border ${term.checklist[c.key] ? 'border-ink bg-ink' : 'border-line-strong'}`} aria-hidden />
              <span className={term.checklist[c.key] ? 'text-ink' : 'text-muted'}>{c.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 font-mono text-[12px]">
        <button type="button" onClick={() => void copy()} className="text-faint hover:text-ink">
          {copied ? 'copied' : 'copy prompt'}
        </button>
        <button type="button" onClick={() => setQuiz((v) => !v)} className={quiz ? 'text-ink' : 'text-faint hover:text-ink'}>
          quiz{result ? ` ${result}` : ''}
        </button>
        <span className="flex gap-3" role="radiogroup" aria-label="Status">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={term.status === s}
              onClick={() => updateTerm(uid, term.id, statusPatch(s, now))}
              className={term.status === s ? 'text-ink' : 'text-faint hover:text-muted'}
            >
              {s}
            </button>
          ))}
        </span>
        <button type="button" onClick={() => deleteTerm(uid, term.id)} className="text-faint hover:text-ink">
          delete
        </button>
      </div>

      {quiz && <TermQuiz termId={term.id} onDone={quizDone} />}
    </div>
  );
}

export default function TermsView() {
  const params = useSearchParams();
  const terms = useTerms();
  const drills = useDrills();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(params.get('open'));
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Old links: /terms/?review=1 now shows the shared review.
  if (params.get('review') === '1') return <Review />;

  const list = terms ?? [];
  const due = now ? dueItems(list, now, 99).length : 0;
  const missing = terms && drills ? missingDrillTerms(drills, new Set(list.map((t) => t.id))) : [];
  const shown = filter === 'all' ? list : list.filter((t) => t.status === filter);

  const add = async (names: string[], source: 'manual' | 'drill') => {
    setAdding(true);
    setError(null);
    try {
      const { ids } = await addTerms({ names, source });
      if (source === 'manual' && ids[0]) setOpen(ids[0]);
      setName('');
    } catch (err) {
      setError(aiError(err));
    } finally {
      setAdding(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() && !adding) void add([name.trim()], 'manual');
  };

  return (
    <main className="column">
      <PageHead title="terms" meta={terms ? `${list.length}${due ? ` · ${due} due` : ''}` : undefined} />

      <form onSubmit={submit} className="mt-8 flex items-center gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="add a term"
          aria-label="Add a term"
          className="min-w-0 flex-1 border-b border-line bg-transparent pb-1 text-[16px] text-ink placeholder:text-faint focus:border-line-strong"
        />
        {adding && <Waiting />}
      </form>
      {error && <p className="mt-2 text-[14px] text-muted">{error}</p>}

      {missing.length > 0 && !adding && (
        <p className="mt-4 flex items-baseline gap-3 text-[14px] text-faint">
          {missing.length} from drills
          <button type="button" onClick={() => void add(missing.slice(0, 10).map((m) => m.name), 'drill')} className="font-mono text-[12px] hover:text-ink">
            add
          </button>
        </p>
      )}

      <div className="mt-6 flex gap-4 font-mono text-[12px]" role="radiogroup" aria-label="Filter">
        {FILTERS.map((f) => (
          <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)} className={filter === f ? 'text-ink' : 'text-faint hover:text-muted'}>
            {f}
          </button>
        ))}
        {due > 0 && (
          <Link href="/review/" className="ml-auto text-ink">
            review {due}
          </Link>
        )}
      </div>

      {groupByArea(shown).map((g) => (
        <section key={g.area} className="mt-8">
          <SectionTitle>{g.area.toLowerCase()}</SectionTitle>
          <ul>
            {g.terms.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-expanded={open === t.id}
                  onClick={() => setOpen(open === t.id ? null : t.id)}
                  className="group flex w-full items-baseline gap-3 py-2 text-left text-[15px]"
                >
                  <span className="shrink-0 text-ink">{t.name}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-faint">{open === t.id ? '' : t.oneLine}</span>
                  <span className="shrink-0 font-mono text-[12px] text-faint">
                    {t.nextReviewAt !== null && now && t.nextReviewAt <= now ? 'due' : t.status}
                  </span>
                </button>
                {open === t.id && <TermDetail term={t} now={now} />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
