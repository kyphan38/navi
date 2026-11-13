'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};
// One value per minute, so the snapshot is stable between renders.
const minute = () => Math.floor(Date.now() / 60_000) * 60_000;

/** Current time rounded to the minute; 0 during the static build. */
export function useNow(): number {
  return useSyncExternalStore(noop, minute, () => 0);
}
