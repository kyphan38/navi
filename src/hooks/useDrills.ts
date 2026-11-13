'use client';

import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { watchDrills, type DrillDoc } from '@/lib/repo';

/** Newest drills, newest first; null while loading. */
export function useDrills(): DrillDoc[] | null {
  const uid = useUid();
  const [drills, setDrills] = useState<DrillDoc[] | null>(null);
  useEffect(() => watchDrills(uid, setDrills), [uid]);
  return drills;
}
