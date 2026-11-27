// ============================================================
// navi - Firestore reads and writes for basics (PLAN-basics.md 6).
// Same rule as repo.ts: writes are never awaited in the UI.
// ============================================================

import { collection, doc, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';
import type { BasicCard, BasicDay, BasicLesson, BasicState } from '@/types/navi';

const warn = (what: string) => (err: unknown) => console.warn(`[repo] ${what}`, err);
const userCol = (uid: string, name: string) => collection(getDb(), 'users', uid, name);

export type BasicCardDoc = BasicCard & { id: string };

export function watchBasicStates(uid: string, cb: (states: Map<string, BasicState>) => void): () => void {
  return onSnapshot(userCol(uid, 'basics'), (snap) => cb(new Map(snap.docs.map((d) => [d.id, d.data() as BasicState]))), warn('basics'));
}

export function watchBasicDay(uid: string, day: string, cb: (d: BasicDay | null) => void): () => void {
  return onSnapshot(doc(userCol(uid, 'basicDays'), day), (snap) => cb(snap.exists() ? (snap.data() as BasicDay) : null), warn('basic day'));
}

export function watchBasicCards(uid: string, day: string, cb: (cards: BasicCardDoc[]) => void): () => void {
  return onSnapshot(
    query(userCol(uid, 'basicCards'), where('forDay', '==', day)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as BasicCard) }))),
    warn('basic cards'),
  );
}

/** One lesson; null while missing (not written yet). */
export function watchBasicLesson(uid: string, conceptId: string, cb: (l: BasicLesson | null) => void): () => void {
  return onSnapshot(doc(userCol(uid, 'basicLessons'), conceptId), (snap) => cb(snap.exists() ? (snap.data() as BasicLesson) : null), warn('basic lesson'));
}

export function saveBasicState(uid: string, conceptId: string, s: BasicState): void {
  void setDoc(doc(userCol(uid, 'basics'), conceptId), s).catch(warn('save basic'));
}

/** Records the answer on a review card and the new state, plus prereqs to review next time (when stuck). */
export function answerBasicCard(
  uid: string,
  card: BasicCardDoc,
  answer: Pick<BasicCard, 'picked' | 'sure' | 'result' | 'answeredAt'>,
  state: BasicState,
  bump: { id: string; s: BasicState }[] = [],
): void {
  const db = getDb();
  const batch = writeBatch(db);
  batch.update(doc(userCol(uid, 'basicCards'), card.id), answer);
  batch.set(doc(userCol(uid, 'basics'), card.conceptId), state);
  for (const b of bump) batch.set(doc(userCol(uid, 'basics'), b.id), b.s);
  void batch.commit().catch(warn('answer basic'));
}

