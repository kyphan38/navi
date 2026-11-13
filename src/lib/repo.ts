// ============================================================
// navi - Firestore reads and writes
//
// Writes are never awaited in the UI (legi rule): offline, the promise only
// settles when the network is back. Fire and forget, read state from snapshots.
// ============================================================

import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';
import { normalizeProfile } from '@/lib/profile';
import type { Drill, Profile, Term } from '@/types/navi';

const profileRef = (uid: string) => doc(getDb(), 'users', uid, 'meta', 'profile');

/** Calls back with the profile (defaults until one is saved). Returns unsubscribe. */
export function watchProfile(uid: string, cb: (p: Profile, pending: boolean) => void): () => void {
  return onSnapshot(
    profileRef(uid),
    { includeMetadataChanges: true },
    (snap) => cb(normalizeProfile(snap.data()), snap.metadata.hasPendingWrites),
    (err) => console.warn('[repo] profile', err),
  );
}

export function saveProfile(uid: string, p: Profile): void {
  void setDoc(profileRef(uid), normalizeProfile(p)).catch((err) => console.warn('[repo] save profile', err));
}

// ------------------------------------------------------------------ drills

const drillsCol = (uid: string) => collection(getDb(), 'users', uid, 'drills');

export type DrillDoc = Drill & { id: string };

/** Newest 60 drills, newest first. */
export function watchDrills(uid: string, cb: (drills: DrillDoc[]) => void): () => void {
  return onSnapshot(
    query(drillsCol(uid), orderBy('startedAt', 'desc'), limit(60)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Drill) }))),
    (err) => console.warn('[repo] drills', err),
  );
}

/** One drill; `null` when it does not exist (yet). */
export function watchDrill(uid: string, id: string, cb: (drill: DrillDoc | null) => void): () => void {
  return onSnapshot(
    doc(drillsCol(uid), id),
    (snap) => cb(snap.exists() ? { id: snap.id, ...(snap.data() as Drill) } : null),
    (err) => console.warn('[repo] drill', err),
  );
}

export function dropDrill(uid: string, id: string): void {
  void updateDoc(doc(drillsCol(uid), id), { status: 'dropped' }).catch((err) => console.warn('[repo] drop drill', err));
}

/** Mistakes saved from one drill. */
export function watchMistakesFor(uid: string, drillId: string, cb: (items: { text: string; lesson: string }[]) => void): () => void {
  return onSnapshot(
    query(collection(getDb(), 'users', uid, 'mistakes'), where('drillId', '==', drillId)),
    (snap) => cb(snap.docs.map((d) => d.data() as { text: string; lesson: string })),
    (err) => console.warn('[repo] mistakes', err),
  );
}

// ------------------------------------------------------------------ terms

export type TermDoc = Term & { id: string };

const termsCol = (uid: string) => collection(getDb(), 'users', uid, 'terms');

export function watchTerms(uid: string, cb: (terms: TermDoc[]) => void): () => void {
  return onSnapshot(
    termsCol(uid),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Term) }))),
    (err) => console.warn('[repo] terms', err),
  );
}

/** Partial update; the rules check the whole doc, so only known fields go in. */
export function updateTerm(uid: string, id: string, patch: Partial<Pick<Term, 'status' | 'checklist' | 'box' | 'nextReviewAt'>>): void {
  void updateDoc(doc(termsCol(uid), id), { ...patch, updatedAt: Date.now() }).catch((err) => console.warn('[repo] update term', err));
}

export function deleteTerm(uid: string, id: string): void {
  void deleteDoc(doc(termsCol(uid), id)).catch((err) => console.warn('[repo] delete term', err));
}
