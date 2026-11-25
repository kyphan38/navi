'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Waiting from '@/components/Waiting';
import { aiError, drillFromAsk, drillFromPostmortem } from '@/lib/ai';

/** "practice this": starts a drill on the server, then opens it. */
function PracticeButton({ start }: { start: () => Promise<{ id: string }> }) {
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
            const { id } = await start();
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

/** V7: a drill built on this real problem; the AI picks the type, at the highest open level. */
export default function PracticeAsk({ askId }: { askId: string }) {
  return <PracticeButton start={() => drillFromAsk({ askId })} />;
}

/** The postmortem of the week, replayed as an incident drill at the highest open level. */
export function PracticePostmortem({ weekId }: { weekId: string }) {
  return <PracticeButton start={() => drillFromPostmortem({ weekId })} />;
}
