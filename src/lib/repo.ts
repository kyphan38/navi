// ============================================================
// navi - Firestore reads and writes
//
// Writes are never awaited in the UI (legi rule): offline, the promise only
// settles when the network is back. Fire and forget, read state from snapshots.
// ============================================================

import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import { getDb } from '@/lib/firebase-client';
import { normalizeProfile } from '@/lib/profile';
import type { Profile } from '@/types/navi';

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
