'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { aiError, startDrill } from '@/lib/ai';
import type { DrillLevel, DrillType } from '@/types/navi';

/** Starts a drill on the server, then opens it. */
export function useStartDrill() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (type: DrillType, level: DrillLevel) => {
    setBusy(true);
    setError(null);
    try {
      const { id } = await startDrill({ type, level });
      router.push(`/drill/play/?id=${id}`);
    } catch (err) {
      setError(aiError(err));
      setBusy(false);
    }
  };

  return { start, busy, error };
}
