'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { patchDay, type DayDoc } from '@/lib/repo';

/** After studying: one line about today and how sure you feel (1-5). */
export default function DayNote({ day, doc }: { day: string; doc: DayDoc }) {
  const uid = useUid();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="mt-3 space-y-2">
      <input
        value={note ?? doc.note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          // Keep the typed text on screen; the snapshot catches up a moment later.
          if (note !== null && note.trim() !== doc.note) patchDay(uid, day, { note: note.trim().slice(0, 500) });
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        maxLength={500}
        placeholder="one line about today"
        aria-label="Note about today"
        className="w-full border-b border-line bg-transparent pb-1 text-[15px] text-ink placeholder:text-faint focus:border-line-strong"
      />
      <div className="flex items-baseline gap-3 font-mono text-[12px]" role="radiogroup" aria-label="How sure do you feel">
        <span className="text-faint">sure</span>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={doc.confidence === n}
            onClick={() => patchDay(uid, day, { confidence: doc.confidence === n ? null : n })}
            className={doc.confidence === n ? 'text-ink' : 'text-faint hover:text-muted'}
          >
            {n}
          </button>
        ))}
        <span className="ml-auto text-faint tabular-nums">{doc.minutes}m today</span>
      </div>
    </div>
  );
}
