'use client';

import { useState } from 'react';

import { addTerms } from '@/lib/ai';
import { markTerms, splitCode } from '@/lib/basics';
import type { Gloss } from '@/types/navi';

/**
 * Text with hard words dotted-underlined. Tapping one shows its meaning right
 * below (written ahead, so no wait) and offers "save term" (to Terms).
 */
export default function Glossed({ text, glossary, className = '' }: { text: string; glossary: readonly Gloss[]; className?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const parts = splitCode(text).flatMap((c) =>
    c.code
      ? [{ text: c.text, term: null, code: true }]
      : markTerms(
          c.text,
          glossary.map((g) => g.term),
        ).map((m) => ({ ...m, code: false })),
  );
  const meaning = open ? glossary.find((g) => g.term === open)?.meaning : null;
  return (
    <div className={className}>
      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
        {parts.map((p, i) =>
          p.code ? (
            <code key={i} className="rounded-[3px] bg-surface-2 px-1 font-mono text-[0.9em]">
              {p.text}
            </code>
          ) : p.term ? (
            <button
              key={i}
              type="button"
              onClick={() => setOpen(open === p.term ? null : p.term)}
              className="underline decoration-dotted decoration-1 underline-offset-4 hover:text-ink"
              aria-expanded={open === p.term}
            >
              {p.text}
            </button>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </p>
      {open && meaning && (
        <p className="mt-1.5 border-l border-line-strong pl-3 text-[14px] text-muted">
          <span className="font-mono text-[12px] text-faint">{open}</span> {meaning}
          {saved.has(open) ? (
            <span className="ml-2 font-mono text-[11px] text-faint">saved</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                // Fire and forget: the Terms page shows the card when it is written.
                void addTerms({ names: [open], source: 'manual' }).catch(() => {});
                setSaved(new Set([...saved, open]));
              }}
              className="ml-2 font-mono text-[11px] text-faint hover:text-ink"
            >
              save term
            </button>
          )}
        </p>
      )}
    </div>
  );
}
