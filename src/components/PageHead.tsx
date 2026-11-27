'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { subPagesOf } from '@/lib/nav';

/**
 * Page title: small lowercase mono with wide spacing, meta on the right (PLAN-navi.md 1b).
 * In a place with several pages (practice, learn, career) the title is the row of
 * those pages, the open one in ink.
 */
export default function PageHead({ title, meta }: { title: string; meta?: ReactNode }) {
  const { pages, current } = subPagesOf(usePathname());
  return (
    <header className="flex items-baseline justify-between gap-4">
      {pages.length && current ? (
        <>
          {/* Phones only: the rail lists these pages on wide screens. */}
          <nav aria-label="Pages here" className="flex gap-4 font-mono text-[13px] tracking-[0.12em] md:hidden">
            {pages.map((p) =>
              p.href === current ? (
                <h1 key={p.href} aria-current="page" className="text-ink">
                  {p.label}
                </h1>
              ) : (
                <Link key={p.href} href={p.href} className="text-faint transition-colors hover:text-ink">
                  {p.label}
                </Link>
              ),
            )}
          </nav>
          <h1 className="hidden font-mono text-[13px] tracking-[0.12em] text-ink md:block">
            {pages.find((p) => p.href === current)?.label}
          </h1>
        </>
      ) : (
        <h1 className="font-mono text-[13px] tracking-[0.12em] text-muted">{title}</h1>
      )}
      {meta && <span className="min-w-0 truncate font-mono text-[12px] text-faint tabular-nums">{meta}</span>}
    </header>
  );
}
