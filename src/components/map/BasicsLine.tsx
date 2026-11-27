'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { CONCEPTS } from '@/lib/basics-catalog';
import { watchBasicStates } from '@/lib/repo-basics';
import type { BasicState } from '@/types/navi';

/** One quiet line on the Map: how far the foundations go. Not a skill level (PLAN-basics.md 0, rule 9). */
export default function BasicsLine() {
  const uid = useUid();
  const [states, setStates] = useState<Map<string, BasicState> | null>(null);
  useEffect(() => watchBasicStates(uid, setStates), [uid]);
  if (!states) return null;
  const started = CONCEPTS.filter((c) => states.get(c.id) && states.get(c.id)!.status !== 'reading').length;
  const learned = CONCEPTS.filter((c) => states.get(c.id)?.status === 'learned').length;
  return (
    <Link href="/basics/" className="group mt-3 flex items-baseline gap-3 font-mono text-[12px] text-faint">
      <span>basics</span>
      <span className="tabular-nums">
        {started}/{CONCEPTS.length} started · {learned} learned
      </span>
      <span className="transition-colors group-hover:text-ink">open</span>
    </Link>
  );
}
