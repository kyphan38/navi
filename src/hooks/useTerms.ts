'use client';

import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { watchTerms, type TermDoc } from '@/lib/repo';

/** All saved terms; null while loading. */
export function useTerms(): TermDoc[] | null {
  const uid = useUid();
  const [terms, setTerms] = useState<TermDoc[] | null>(null);
  useEffect(() => watchTerms(uid, setTerms), [uid]);
  return terms;
}
