// ============================================================
// navi - Firestore reads and writes
//
// Writes are never awaited in the UI (legi rule): offline, the promise only
// settles when the network is back. Fire and forget, read state from snapshots.
// ============================================================

import { arrayRemove, arrayUnion, collection, deleteDoc, doc, documentId, increment, limit, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';
import { normalizeProfile } from '@/lib/profile';
import type { Course, Day, Drill, Profile, Term, Week } from '@/types/navi';

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

// ------------------------------------------------------------------ courses, weeks, days (P3)

export type CourseDoc = Course & { id: string };
const coursesCol = (uid: string) => collection(getDb(), 'users', uid, 'courses');

export function watchCourses(uid: string, cb: (courses: CourseDoc[]) => void): () => void {
  return onSnapshot(
    query(coursesCol(uid), orderBy('createdAt', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Course) }))),
    (err) => console.warn('[repo] courses', err),
  );
}

/** Creates a course; returns its id at once (the write syncs later). */
export function addCourse(uid: string, c: Omit<Course, 'createdAt' | 'updatedAt'>): string {
  const ref = doc(coursesCol(uid));
  const now = Date.now();
  void setDoc(ref, { ...c, createdAt: now, updatedAt: now }).catch((err) => console.warn('[repo] add course', err));
  return ref.id;
}

export function updateCourse(uid: string, id: string, patch: Partial<Pick<Course, 'modules' | 'deadline' | 'status'>>): void {
  void updateDoc(doc(coursesCol(uid), id), { ...patch, updatedAt: Date.now() }).catch((err) => console.warn('[repo] update course', err));
}

export function deleteCourse(uid: string, id: string): void {
  void deleteDoc(doc(coursesCol(uid), id)).catch((err) => console.warn('[repo] delete course', err));
}

export type WeekDoc = Week & { id: string };
const weeksCol = (uid: string) => collection(getDb(), 'users', uid, 'weeks');

/** All planned weeks (one small doc per week). */
export function watchWeeks(uid: string, cb: (weeks: WeekDoc[]) => void): () => void {
  return onSnapshot(
    weeksCol(uid),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Week) }))),
    (err) => console.warn('[repo] weeks', err),
  );
}

export function saveWeek(uid: string, id: string, w: Week): void {
  void setDoc(doc(weeksCol(uid), id), w).catch((err) => console.warn('[repo] save week', err));
}

export function updateWeek(uid: string, id: string, patch: Partial<Pick<Week, 'review' | 'minutesDone'>>): void {
  void updateDoc(doc(weeksCol(uid), id), { ...patch, updatedAt: Date.now() }).catch((err) => console.warn('[repo] update week', err));
}

export type DayDoc = Day & { id: string };
const daysCol = (uid: string) => collection(getDb(), 'users', uid, 'days');

/** Day docs from `since` (a day id) on. */
export function watchDaysSince(uid: string, since: string, cb: (days: DayDoc[]) => void): () => void {
  return onSnapshot(
    query(daysCol(uid), where(documentId(), '>=', since)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Day) }))),
    (err) => console.warn('[repo] days', err),
  );
}

export function saveDay(uid: string, id: string, d: Day): void {
  void setDoc(doc(daysCol(uid), id), d).catch((err) => console.warn('[repo] save day', err));
}

/** A day doc without its id, ready to save (the rules allow only the Day fields). */
export function dayData(d: DayDoc | null): Day | null {
  return d ? { moduleIds: d.moduleIds, drillId: d.drillId, minutes: d.minutes, note: d.note, confidence: d.confidence, updatedAt: d.updatedAt } : null;
}

/** Changes only the given fields, so two quick saves (note, then confidence) never undo each other. */
export function patchDay(uid: string, id: string, patch: Partial<Pick<Day, 'note' | 'confidence' | 'drillId'>>): void {
  void updateDoc(doc(daysCol(uid), id), { ...patch, updatedAt: Date.now() }).catch((err) => console.warn('[repo] patch day', err));
}

/** Adds or removes one module and its minutes on today, with server-side increments. */
export function tickDay(uid: string, id: string, existing: Day | null, m: { id: string; minutes: number }, done: boolean, now: number): void {
  if (!existing) {
    if (!done) return;
    // Merge with increments: a second quick tick before the snapshot arrives must add, not replace.
    // The note and confidence are empty this early in the day.
    void setDoc(
      doc(daysCol(uid), id),
      { moduleIds: arrayUnion(m.id), drillId: null, minutes: increment(m.minutes), note: '', confidence: null, updatedAt: now },
      { merge: true },
    ).catch((err) => console.warn('[repo] tick day', err));
    return;
  }
  if (existing.moduleIds.includes(m.id) === done) return;
  void updateDoc(doc(daysCol(uid), id), {
    moduleIds: done ? arrayUnion(m.id) : arrayRemove(m.id),
    // Never below 0: take away at most what is there.
    minutes: increment(done ? m.minutes : -Math.min(m.minutes, existing.minutes)),
    updatedAt: now,
  }).catch((err) => console.warn('[repo] tick day', err));
}
