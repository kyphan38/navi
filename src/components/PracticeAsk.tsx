'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Waiting from '@/components/Waiting';
import { aiError, drillFromAsk } from '@/lib/ai';

/** "practice this" (V7): a drill built on this real problem; the AI picks the type, at the highest open level. */
export default function PracticeAsk({ askId }: { askId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (busy) return <Waiting word="writing a drill" />;
  return (
    <span className="inline-flex items-baseline gap-3">
      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const { id } = await drillFromAsk({ askId });
            router.push(`/drill/play/?id=${id}`);
          } catch (err) {
            setError(aiError(err));
            setBusy(false);
          }
        }}
        className="font-mono text-[12px] text-faint hover:text-ink"
      >
        practice this
      </button>
      {error && <span className="text-[13px] text-muted">{error}</span>}
    </span>
  );
}
