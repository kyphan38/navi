'use client';

import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { watchMistakes, type MistakeDoc } from '@/lib/repo';

/** Saved mistakes from drills, newest first; null while loading. */
export function useMistakes(): MistakeDoc[] | null {
  const uid = useUid();
  const [items, setItems] = useState<MistakeDoc[] | null>(null);
  useEffect(() => watchMistakes(uid, setItems), [uid]);
  return items;
}
