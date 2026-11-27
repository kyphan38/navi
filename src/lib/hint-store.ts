// ============================================================
// navi - Hint view counts and the on/off switch (per device, localStorage)
// ============================================================

import { bumpHint, parseHintCounts, type HintCounts } from '@/lib/hint';
import { stringStore } from '@/lib/store';

const KEY = 'navi.hints';
const EMPTY: HintCounts = {};
const listeners = new Set<() => void>();
let cache: HintCounts | null = null;

function read(): HintCounts {
  if (cache) return cache;
  try {
    cache = parseHintCounts(localStorage.getItem(KEY));
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: HintCounts): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode: counts live for this visit only.
  }
  listeners.forEach((fn) => fn());
}

// Each hint counts once per page load, however often it renders.
const seenThisLoad = new Set<string>();

export const hintCounts = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get: read,
  getServer: () => EMPTY,
  seen: (id: string) => seenThisLoad.has(id),
  bump(id: string) {
    if (seenThisLoad.has(id)) return;
    seenThisLoad.add(id);
    const next = bumpHint(read(), id);
    if (next !== read()) write(next);
  },
  reset() {
    seenThisLoad.clear();
    write(EMPTY);
  },
};

export const hintsOnStore = stringStore<'on' | 'off'>('navi.hints.on', 'on', (raw) => (raw === 'on' || raw === 'off' ? raw : null));
