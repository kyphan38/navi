'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { PLACES, placeOf } from '@/lib/nav';

/**
 * navi's nav (PLAN-navi.md 1b). Wide screens: a left rail of mono words on a
 * route line, the current place is a filled dot. Phones: one row of words that
 * scrolls sideways, the current place has a dot in front.
 */
export default function Rail() {
  const current = placeOf(usePathname());

  return (
    <>
      <nav
        aria-label="Main"
        className="sticky top-0 hidden h-dvh w-40 shrink-0 flex-col px-6 pt-[calc(env(safe-area-inset-top)+28px)] font-mono text-[13px] md:flex"
      >
        <span className="mb-6 pl-5 tracking-[0.12em] text-faint">navi</span>
        <ul className="route">
          {PLACES.map(({ place, href }) => {
            const on = place === current;
            return (
              <li key={place} className="relative">
                <span className="route-dot" data-on={on} aria-hidden />
                {on ? (
                  <span aria-current="page" className="block py-1.5 pl-5 text-ink">
                    {place}
                  </span>
                ) : (
                  <Link href={href} className="block py-1.5 pl-5 text-faint transition-colors hover:text-ink">
                    {place}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Main"
        className="sticky top-0 z-20 flex gap-5 overflow-x-auto bg-bg px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-2.5 font-mono text-[13px] [scrollbar-width:none] md:hidden"
      >
        {PLACES.map(({ place, href }) =>
          place === current ? (
            <span key={place} aria-current="page" className="flex shrink-0 items-center gap-1.5 text-ink">
              <span className="size-1.5 rounded-full bg-ink" aria-hidden />
              {place}
            </span>
          ) : (
            <Link key={place} href={href} className="shrink-0 text-faint hover:text-ink">
              {place}
            </Link>
          ),
        )}
      </nav>
    </>
  );
}
