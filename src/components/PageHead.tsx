import type { ReactNode } from 'react';

/** Page title: small lowercase mono with wide spacing, meta on the right (PLAN-navi.md 1b). */
export default function PageHead({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <header className="flex items-baseline justify-between gap-4">
      <h1 className="font-mono text-[13px] tracking-[0.12em] text-muted">{title}</h1>
      {meta && <span className="min-w-0 truncate font-mono text-[12px] text-faint tabular-nums">{meta}</span>}
    </header>
  );
}
