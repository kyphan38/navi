'use client';

import { useEffect, useState } from 'react';

import LessonView from '@/components/basics/LessonView';
import QuestionCard, { type Answer } from '@/components/basics/QuestionCard';
import Waiting from '@/components/Waiting';
import { CONCEPTS } from '@/lib/basics-catalog';
import { afterCheck, afterReview, opened, prereqsToBump } from '@/lib/basics';
import { answerBasicCard, saveBasicState, watchBasicLesson, type BasicCardDoc } from '@/lib/repo-basics';
import { useStartDrill } from '@/hooks/useStartDrill';
import { addMistake, bumpDayReviews } from '@/lib/repo';
import type { BasicLesson, BasicQuestion, BasicState } from '@/types/navi';

const nameOf = (id: string) => CONCEPTS.find((c) => c.id === id)?.name ?? id;
const deckOf = (id: string) => CONCEPTS.find((c) => c.id === id)?.deck ?? 'linux';

/**
 * Wrong while "sure" is a wrong belief: it also goes into the shared mistakes
 * (reviewed on the review page, and first during a track on one of its skills).
 */
function keepSureMiss(uid: string, conceptId: string, q: BasicQuestion, a: Answer): void {
  if (a.result !== 'wrong' || !a.sure) return;
  const said = q.kind === 'order' ? 'the order of the steps' : a.picked !== null ? `"${q.options[a.picked]}"` : 'an answer';
  addMistake(uid, {
    drillId: '',
    skillId: CONCEPTS.find((c) => c.id === conceptId)?.skills[0] ?? null,
    text: `${nameOf(conceptId)}: you were sure about ${said}, and it was wrong.`,
    lesson: q.rule || q.why.join(' '),
  });
}

/** "go deeper": a drill on this concept. A myth goes to spot-the-lie, the rest to a why chain. */
function useDeeper(conceptId: string) {
  const { start } = useStartDrill();
  const skill = CONCEPTS.find((x) => x.id === conceptId)?.skills[0];
  return (kind: BasicQuestion['kind']) => void start(kind === 'myth' ? 'spot-the-lie' : 'why-chain', 'easy', nameOf(conceptId), undefined, skill);
}

export function useLesson(uid: string, id: string): BasicLesson | null | undefined {
  const [lesson, setLesson] = useState<BasicLesson | null | undefined>(undefined);
  useEffect(() => watchBasicLesson(uid, id, setLesson), [uid, id]);
  return lesson;
}

/**
 * A new concept: read the lesson (or "I know this"), then its check question.
 * With "I know this", a wrong check opens the lesson before moving on.
 */
export function LessonStep({ uid, id, state, day, hasDay }: { uid: string; id: string; state: BasicState | undefined; day: string; hasDay: boolean }) {
  const lesson = useLesson(uid, id);
  const deeper = useDeeper(id);
  const [mode, setMode] = useState<'read' | 'know' | null>(state ? 'read' : null);
  const [checking, setChecking] = useState(false);
  // "I know this" and missed: the answer waits until the lesson is read (the step ends when it is saved).
  const [missed, setMissed] = useState<Answer | null>(null);

  if (lesson === undefined) return <Waiting />;
  if (lesson === null) return <p className="text-[15px] text-muted">The lesson for {nameOf(id)} is not written yet.</p>;

  const start = (m: 'read' | 'know') => {
    if (!state) saveBasicState(uid, id, opened(deckOf(id), Date.now()));
    setMode(m);
    if (m === 'know') setChecking(true);
  };
  const finish = (a: Answer) => {
    const now = Date.now();
    keepSureMiss(uid, id, lesson.check, a);
    saveBasicState(uid, id, afterCheck(state ?? opened(deckOf(id), now), a.result === 'right', a.sure, now));
    bumpDayReviews(uid, day, hasDay);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-[17px] text-ink">{nameOf(id)}</h2>
      {mode === null && (
        <div className="flex items-baseline gap-5">
          <button type="button" onClick={() => start('read')} className="rounded-md bg-ink px-3 py-1 text-[14px] text-bg active:scale-[0.97]">
            read
          </button>
          <button type="button" onClick={() => start('know')} className="font-mono text-[12px] text-faint hover:text-ink">
            I know this
          </button>
        </div>
      )}
      {mode === 'read' && <LessonView conceptId={id} lesson={lesson} />}
      {mode === 'read' && !checking && (
        <button type="button" onClick={() => setChecking(true)} className="rounded-md bg-ink px-3 py-1 text-[14px] text-bg active:scale-[0.97]">
          check
        </button>
      )}
      {checking && !missed && (
        <QuestionCard
          q={lesson.check}
          label="check"
          onDone={(a) => {
            // "I know this" and not right: read the lesson first, then go on.
            if (mode === 'know' && a.result !== 'right') {
              setMissed(a);
              return;
            }
            finish(a);
          }}
          onDeeper={(a) => {
            finish(a);
            deeper(lesson.check.kind);
          }}
        />
      )}
      {missed && (
        <div className="space-y-4">
          <p className="font-mono text-[12px] text-faint">read it first</p>
          <LessonView conceptId={id} lesson={lesson} />
          <button type="button" onClick={() => finish(missed)} className="rounded-md bg-ink px-3 py-1 text-[14px] text-bg active:scale-[0.97]">
            continue
          </button>
        </div>
      )}
    </div>
  );
}

/** A review question for a concept learned before. "I don't get it" brings its prereqs back next time. */
export function CardStep({
  uid,
  card,
  states,
  day,
  hasDay,
}: {
  uid: string;
  card: BasicCardDoc;
  states: ReadonlyMap<string, BasicState>;
  day: string;
  hasDay: boolean;
}) {
  const deeper = useDeeper(card.conceptId);
  const save = (a: Answer) => {
    const now = Date.now();
    const s = states.get(card.conceptId) ?? afterCheck(opened(deckOf(card.conceptId), now), true, false, now);
    const bump =
      a.result === 'stuck'
        ? prereqsToBump(card.conceptId, states).map((p) => ({
            id: p,
            s: { ...states.get(p)!, nextReviewAt: now, updatedAt: now },
          }))
        : [];
    answerBasicCard(
      uid,
      card,
      {
        picked: a.picked,
        sure: a.sure,
        result: a.result,
        answeredAt: now,
      },
      afterReview(s, a.result, a.sure, card.kind, now),
      bump,
    );
    keepSureMiss(uid, card.conceptId, card, a);
    bumpDayReviews(uid, day, hasDay);
  };
  return (
    <div className="space-y-4">
      <h2 className="text-[17px] text-ink">{nameOf(card.conceptId)}</h2>
      <QuestionCard
        key={card.id}
        q={card}
        label={card.link ? `linked to ${card.link}` : `review · level ${card.level}`}
        seed={card.id}
        onDone={save}
        onDeeper={(a) => {
          save(a);
          deeper(card.kind);
        }}
      />
    </div>
  );
}
