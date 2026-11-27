// ============================================================
// navi - Fading hints (PLAN-guide G3)
//
// A hint shows its full line the first 3 times a page opens, then one or two
// words, then nothing. No close button: it simply fades out as you learn.
// ============================================================

export type HintStage = 'full' | 'short' | 'gone';

export const FULL_UNTIL = 3;
export const SHORT_UNTIL = 6;

/** Stage for the n-th view (1 = first time). */
export function hintStage(view: number, enabled = true): HintStage {
  if (!enabled) return 'gone';
  if (view <= FULL_UNTIL) return 'full';
  if (view <= SHORT_UNTIL) return 'short';
  return 'gone';
}

export type HintCounts = Readonly<Record<string, number>>;

/** Reads the saved counts; anything broken counts as never seen. */
export function parseHintCounts(raw: string | null): HintCounts {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
    }
    return out;
  } catch {
    return {};
  }
}

/** One more view of a hint. Stops counting once it is gone. */
export function bumpHint(counts: HintCounts, id: string): HintCounts {
  const n = counts[id] ?? 0;
  if (n > SHORT_UNTIL) return counts;
  return { ...counts, [id]: n + 1 };
}
