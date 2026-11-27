'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { useUid } from '@/components/AuthGate';
import { dayOf } from '@/lib/day';
import { watchBasicCards, watchBasicDay, watchBasicStates, type BasicCardDoc } from '@/lib/repo-basics';
import type { BasicDay, BasicState } from '@/types/navi';

const noop = () => () => {};

/** Basics for today: the learner's states, today's session doc and its review cards. null while loading. */
export function useBasics() {
  const uid = useUid();
  // Read on the client only: the static build has no "today".
  const day = useSyncExternalStore(noop, () => dayOf(Date.now()), () => '');
  const [states, setStates] = useState<Map<string, BasicState> | null>(null);
  const [dayDoc, setDayDoc] = useState<BasicDay | null | undefined>(undefined);
  const [cards, setCards] = useState<BasicCardDoc[] | null>(null);
  useEffect(() => watchBasicStates(uid, setStates), [uid]);
  useEffect(() => (day ? watchBasicDay(uid, day, setDayDoc) : undefined), [uid, day]);
  useEffect(() => (day ? watchBasicCards(uid, day, setCards) : undefined), [uid, day]);
  const ready = states !== null && dayDoc !== undefined && cards !== null;
  return { uid, day, states, dayDoc: dayDoc ?? null, cards: cards ?? [], ready };
}
