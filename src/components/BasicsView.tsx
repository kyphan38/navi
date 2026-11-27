'use client';

import { useState } from 'react';

import Fold from '@/components/Fold';
import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import { ExplainCard, LabCard } from '@/components/basics/Extras';
import LessonView from '@/components/basics/LessonView';
import { CardStep, LessonStep, useLesson } from '@/components/basics/Steps';
import { useBasics } from '@/hooks/useBasics';
import { useNow } from '@/hooks/useNow';
import { aiError, basicsNow } from '@/lib/ai';
import { CONCEPTS, DECKS } from '@/lib/basics-catalog';
import { explainPick, labPick, nextReviewIn, sessionSteps } from '@/lib/basics';
import { parseDay } from '@/lib/day';
import type { BasicState } from '@/types/navi';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

/** Status of one concept in the library: locked (prereqs first), new, box n, learned. */
function statusOf(id: string, states: ReadonlyMap<string, BasicState>): string {
  const s = states.get(id);
  if (s) return s.status === 'learned' ? 'learned' : s.status === 'reading' ? 'reading' : `box ${s.box}`;
  const c = CONCEPTS.find((x) => x.id === id)!;
  const locked = c.prereqs.some((p) => !states.get(p) || states.get(p)!.status === 'reading');
  return locked ? 'later' : 'new';
}

function LibraryLesson({ uid, id }: { uid: string; id: string }) {
  const lesson = useLesson(uid, id);
  if (lesson === undefined) return <Waiting />;
  if (lesson === null) return <p className="text-[14px] text-faint">Not written yet. It comes when its turn comes.</p>;
  return <LessonView conceptId={id} lesson={lesson} />;
}

/** All concepts by deck; tap one you have started to read its lesson again. */
function Library({ uid, states }: { uid: string; states: ReadonlyMap<string, BasicState> }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div>
      {DECKS.map((deck) => {
        const list = CONCEPTS.filter((c) => c.deck === deck);
        const learned = list.filter((c) => states.get(c.id) && states.get(c.id)!.status !== 'reading').length;
        return (
          <Fold key={deck} title={deck} meta={`${learned}/${list.length}`} strong>
            <ul className="ml-1 border-l border-line pl-4">
              {list.map((c) => {
                const st = statusOf(c.id, states);
                const readable = states.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={!readable}
                      aria-expanded={open === c.id}
                      onClick={() => setOpen(open === c.id ? null : c.id)}
                      className="flex w-full items-baseline gap-3 py-1.5 text-left text-[15px] disabled:cursor-default"
                    >
                      <span className={`min-w-0 flex-1 truncate ${readable ? 'text-ink' : st === 'later' ? 'text-faint' : 'text-muted'}`}>{c.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-faint">{st}</span>
                    </button>
                    {open === c.id && (
                      <div className="mb-4 mt-1">
                        <LibraryLesson uid={uid} id={c.id} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Fold>
        );
      })}
    </div>
  );
}

/**
 * Practice > basics (PLAN-basics.md 8): today's session (a new lesson with its
 * check, then up to 2 reviews), then the library of every concept.
 */
export default function BasicsView() {
  const { uid, day, states, dayDoc, cards, ready } = useBasics();
  const now = useNow();
  const [extra, setExtra] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spareLesson = useLesson(uid, dayDoc?.spare ?? 'none');
  const [pinned, setPinned] = useState<{ explain: string | null; lab: string | null }>({ explain: null, lab: null });
  const explainNow = states && now ? explainPick(states, now) : null;
  const weekday = day ? parseDay(day).getDay() : 1;
  const labNow = states ? labPick(states, weekday === 0 || weekday === 6) : null;
  // Set during render (guarded, like Review's queue): runs once per new pick.
  if ((explainNow && !pinned.explain) || (labNow && !pinned.lab)) setPinned({ explain: pinned.explain ?? explainNow, lab: pinned.lab ?? labNow });

  if (!ready || !states || !day) return <main className="column" />;

  const steps = sessionSteps(dayDoc, cards, states, extra);
  const current = steps.find((s) => !s.done) ?? null;
  const doneCount = steps.filter((s) => s.done).length;
  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      await basicsNow({});
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(false);
    }
  };
  const days = now ? nextReviewIn(states, now) : null;
  // Pinned once shown: after you answer, the pick moves on, but the feedback must stay.
  const explainId = pinned.explain ?? explainNow;
  const labId = pinned.lab ?? labNow;

  return (
    <main className="column">
      <PageHead title="basics" meta={steps.length ? `${doneCount}/${steps.length}` : undefined} />

      <section className="mt-8">
        {busy ? (
          <Waiting word="writing today's basics" />
        ) : !dayDoc || steps.length === 0 ? (
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => void make()} className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97]">
              make now
            </button>
            {error && <span className="text-[14px] text-muted">{error}</span>}
          </div>
        ) : current ? (
          current.kind === 'lesson' ? (
            <LessonStep key={current.id} uid={uid} id={current.id} state={states.get(current.id)} day={day} hasDay />
          ) : (
            <CardStep key={current.id} uid={uid} card={cards.find((c) => c.id === current.id)!} states={states} day={day} hasDay />
          )
        ) : (
          <div className="space-y-2 text-[15px]">
            <p className="text-ink">
              {doneCount} done{days !== null ? ` · next review in ${days} day${days === 1 ? '' : 's'}` : ''}
            </p>
            {!extra && dayDoc.spare && spareLesson && (
              <button type="button" onClick={() => setExtra(dayDoc.spare)} className="font-mono text-[12px] text-faint hover:text-ink">
                one more
              </button>
            )}
          </div>
        )}
      </section>

      {/* After today's session: once a week explain one concept, on weekends a lab. */}
      {!current && (explainId || labId) && (
        <section className="mt-12 space-y-10">
          {explainId && <ExplainCard key={explainId} uid={uid} id={explainId} state={states.get(explainId)!} />}
          {labId && <LabCard key={labId} uid={uid} id={labId} state={states.get(labId)!} />}
        </section>
      )}

      <section className="mt-12">
        <SectionTitle>library</SectionTitle>
        <Library uid={uid} states={states} />
      </section>
    </main>
  );
}
