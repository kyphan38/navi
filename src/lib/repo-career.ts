// ============================================================
// navi - Firestore reads and writes for the career tools:
// stories (V2), saved news (V8), target role (V10), interviews (V1).
// Same rule as repo.ts: writes are never awaited in the UI.
// ============================================================

import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';
import type { Interview, Saved, Story, TargetRole } from '@/types/navi';

const warn = (what: string) => (err: unknown) => console.warn(`[repo] ${what}`, err);

// ------------------------------------------------------------------ stories

export type StoryDoc = Story & { id: string };
const storiesCol = (uid: string) => collection(getDb(), 'users', uid, 'stories');

export function watchStories(uid: string, cb: (items: StoryDoc[]) => void): () => void {
  return onSnapshot(
    query(storiesCol(uid), orderBy('updatedAt', 'desc'), limit(100)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Story) }))),
    warn('stories'),
  );
}

/** New story when `id` is null. Returns the id. */
export function saveStory(uid: string, id: string | null, s: Omit<Story, 'createdAt' | 'updatedAt'>, createdAt: number | null): string {
  const ref = id ? doc(storiesCol(uid), id) : doc(storiesCol(uid));
  const now = Date.now();
  void setDoc(ref, { ...s, createdAt: createdAt ?? now, updatedAt: now }).catch(warn('save story'));
  return ref.id;
}

export function deleteStory(uid: string, id: string): void {
  void deleteDoc(doc(storiesCol(uid), id)).catch(warn('delete story'));
}

// ------------------------------------------------------------------ saved news

export type SavedDoc = Saved & { id: string };
const savedCol = (uid: string) => collection(getDb(), 'users', uid, 'saved');

export function watchSaved(uid: string, cb: (items: SavedDoc[]) => void): () => void {
  return onSnapshot(
    query(savedCol(uid), orderBy('createdAt', 'desc'), limit(100)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Saved) }))),
    warn('saved'),
  );
}

export function saveNews(uid: string, item: Omit<Saved, 'readAt' | 'createdAt'>): void {
  void setDoc(doc(savedCol(uid)), { ...item, readAt: null, createdAt: Date.now() }).catch(warn('save news'));
}

export function markSavedRead(uid: string, id: string, read: boolean): void {
  void updateDoc(doc(savedCol(uid), id), { readAt: read ? Date.now() : null }).catch(warn('mark read'));
}

export function deleteSaved(uid: string, id: string): void {
  void deleteDoc(doc(savedCol(uid), id)).catch(warn('delete saved'));
}

// ------------------------------------------------------------------ target role

const roleRef = (uid: string) => doc(getDb(), 'users', uid, 'meta', 'role');

export function watchRole(uid: string, cb: (role: TargetRole | null) => void): () => void {
  return onSnapshot(roleRef(uid), (snap) => cb(snap.exists() ? (snap.data() as TargetRole) : null), warn('role'));
}

export function saveRole(uid: string, title: string, needs: TargetRole['needs'], createdAt: number | null): void {
  const now = Date.now();
  void setDoc(roleRef(uid), { title, needs, createdAt: createdAt ?? now, updatedAt: now }).catch(warn('save role'));
}

export function deleteRole(uid: string): void {
  void deleteDoc(roleRef(uid)).catch(warn('delete role'));
}

// ------------------------------------------------------------------ interviews

export type InterviewDoc = Interview & { id: string };

export function watchInterviews(uid: string, cb: (items: InterviewDoc[]) => void): () => void {
  return onSnapshot(
    query(collection(getDb(), 'users', uid, 'interviews'), orderBy('createdAt', 'desc'), limit(30)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Interview) }))),
    warn('interviews'),
  );
}

export function deleteInterview(uid: string, id: string): void {
  void deleteDoc(doc(getDb(), 'users', uid, 'interviews', id)).catch(warn('delete interview'));
}
