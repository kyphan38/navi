'use client';

import { useEffect, useState } from 'react';

/** Time a hard round should take. */
const ROUND_SECONDS = 5 * 60;

/**
 * Hard drills only: time left for this round, as plain numbers (DESIGN.md: no
 * blinking). Past zero it just says "over"; nothing is stopped.
 */
export default function RoundTimer() {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = ROUND_SECONDS - Math.floor((now - startedAt) / 1000);
  return (
    <span className="font-mono text-[12px] text-faint tabular-nums" aria-label="Time left for this round">
      {left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'over'}
    </span>
  );
}
