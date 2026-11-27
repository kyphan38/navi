'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useReviewDue } from '@/hooks/useReviewDue';
import { PLACES, placeOf, subPagesOf, type Place } from '@/lib/nav';

/**
 * navi's nav (PLAN-navi.md 1b, PLAN-guide G1).
 * Wide screens: a left rail on the surface. Each place with several pages is a
 * small heading over its pages; every page is a mono word on a route line, the
 * open one a filled dot on a soft fill. Settings sits at the bottom.
 * Phones: one row of place words, the current one with a dot in front.
 */
export default function Rail() {
  const pathname = usePathname();
  const current = placeOf(pathname);
  const { current: currentPage } = subPagesOf(pathname);
  const due = useReviewDue();
  const counts: Record<string, string | undefined> = { '/review/': due ? `${due} due` : undefined };

  const groups = PLACES.filter((p) => p.place !== 'settings');

  return (
    <>
      <nav
        aria-label="Main"
        className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-surface px-3 pt-[calc(env(safe-area-inset-top)+24px)] pb-4 font-mono text-[13px] md:flex"
      >
        <span className="mb-5 px-2.5 tracking-[0.12em] text-ink">navi</span>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {groups.map(({ place, href, pages }) => (
            <div key={place}>
              {pages.length > 0 && <p className="mb-1 px-2.5 text-[11px] tracking-[0.06em] text-faint">{place}</p>}
              <ul className="route rail-route">
                {(pages.length ? pages : [{ label: place, href }]).map((p) => (
                  <RailRow
                    key={p.href}
                    href={p.href}
                    label={p.label}
                    on={pages.length ? p.href === currentPage : place === current}
                    count={counts[p.href]}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-line pt-2">
          <PlainRow href="/settings/" label="settings" on={current === 'settings'} />
        </div>
      </nav>

      <nav
        aria-label="Main"
        className="sticky top-0 z-20 flex gap-3 overflow-x-auto bg-bg px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-2.5 font-mono text-[12px] [scrollbar-width:none] md:hidden"
      >
        {PLACES.map(({ place, href }) => (
          <PhoneWord key={place} place={place} href={href} on={place === current} />
        ))}
      </nav>
    </>
  );
}

function RailRow({ href, label, on, count }: { href: string; label: string; on: boolean; count?: string }) {
  const inner = (
    <>
      {label}
      {count && <span className={`ml-auto text-[11px] tabular-nums ${on ? 'text-muted' : 'text-faint'}`}>{count}</span>}
    </>
  );
  return (
    <li className="relative">
      <span className="route-dot" data-on={on} style={{ left: '10px' }} aria-hidden />
      {on ? (
        <span aria-current="page" className="flex items-baseline rounded-md bg-surface-2 py-1.5 pr-2.5 pl-7 text-ink">
          {inner}
        </span>
      ) : (
        <Link href={href} className="flex items-baseline rounded-md py-1.5 pr-2.5 pl-7 text-muted transition-colors hover:bg-surface-2 hover:text-ink">
          {inner}
        </Link>
      )}
    </li>
  );
}

function PlainRow({ href, label, on }: { href: string; label: string; on: boolean }) {
  return on ? (
    <span aria-current="page" className="block rounded-md bg-surface-2 px-2.5 py-1.5 text-ink">
      {label}
    </span>
  ) : (
    <Link href={href} className="block rounded-md px-2.5 py-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-ink">
      {label}
    </Link>
  );
}

function PhoneWord({ place, href, on }: { place: Place; href: string; on: boolean }) {
  return on ? (
    <span aria-current="page" className="flex shrink-0 items-center gap-1.5 text-ink">
      <span className="size-1.5 rounded-full bg-ink" aria-hidden />
      {place}
    </span>
  ) : (
    <Link href={href} className="shrink-0 text-faint hover:text-ink">
      {place}
    </Link>
  );
}
