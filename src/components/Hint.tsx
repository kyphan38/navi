'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { hintStage } from '@/lib/hint';
import { hintCounts, hintsOnStore } from '@/lib/hint-store';

const noop = () => () => {};

/**
 * A fading hint (PLAN-guide G3). Wide screens: a margin note to the right of the
 * column. Its parent must not be positioned: it uses its own spot in the flow
 * for the top and the column (position: relative) for the left.
 * Narrow screens: one line under where it sits.
 */
export default function Hint({ id, full, short }: { id: string; full: string; short: string }) {
  const counts = useSyncExternalStore(hintCounts.subscribe, hintCounts.get, hintCounts.getServer);
  const on = useSyncExternalStore(hintsOnStore.subscribe, hintsOnStore.get, hintsOnStore.getServer) === 'on';
  // Nothing in the static HTML: counts live on the device, so a gone hint must not flash.
  const isServer = !useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    if (on) hintCounts.bump(id);
  }, [id, on]);

  // Before this load's bump, show the view it is about to count.
  const view = (counts[id] ?? 0) + (hintCounts.seen(id) ? 0 : 1);
  const stage = hintStage(view, on);
  if (isServer || stage === 'gone') return null;

  return (
    <p className="fade-in mt-3 border-l border-line-strong pl-3 text-[12px] leading-relaxed text-faint xl:absolute xl:left-full xl:mt-0 xl:-ml-4 xl:w-52">
      {stage === 'full' ? full : short}
    </p>
  );
}
