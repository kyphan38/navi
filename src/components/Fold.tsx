'use client';

import { useState, type ReactNode } from 'react';

/** A quiet row that opens its content below: title, meta on the right, a small › turned when open. */
export default function Fold({ title, meta, children, strong = false }: { title: string; meta?: ReactNode; children: ReactNode; strong?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="group flex w-full items-baseline gap-3 py-1.5 text-left text-[15px]">
        <span className={`min-w-0 flex-1 truncate ${strong || open ? 'text-ink' : 'text-muted group-hover:text-ink'}`}>{title}</span>
        {meta !== undefined && <span className="shrink-0 font-mono text-[12px] text-faint tabular-nums">{meta}</span>}
        <span aria-hidden className={`inline-block shrink-0 font-mono text-[12px] text-faint transition-transform ${open ? 'rotate-90' : ''}`}>
          ›
        </span>
      </button>
      {open && <div className="mt-2 mb-4">{children}</div>}
    </div>
  );
}
