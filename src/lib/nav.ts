// Places in the rail, in order, and the pages each one holds. Pure, so tests can check hrefs.
// Six places since 2026-11-26: the old drill, interview, review, terms, news and ask pages
// keep their URLs and live under a place (links and the service worker stay valid).

export type Place = 'today' | 'practice' | 'learn' | 'map' | 'career' | 'settings';
export type SubPage = { label: string; href: string };

export const PLACES: readonly { place: Place; href: string; pages: readonly SubPage[] }[] = [
  { place: 'today', href: '/', pages: [] },
  {
    place: 'practice',
    href: '/drill/',
    pages: [
      { label: 'drill', href: '/drill/' },
      { label: 'interview', href: '/interview/' },
      { label: 'review', href: '/review/' },
      { label: 'basics', href: '/basics/' },
    ],
  },
  {
    place: 'learn',
    href: '/learn/',
    pages: [
      { label: 'learn', href: '/learn/' },
      { label: 'terms', href: '/terms/' },
      { label: 'news', href: '/news/' },
    ],
  },
  { place: 'map', href: '/map/', pages: [] },
  {
    place: 'career',
    href: '/career/',
    pages: [
      { label: 'career', href: '/career/' },
      { label: 'ask', href: '/ask/' },
    ],
  },
  { place: 'settings', href: '/settings/', pages: [] },
];

const slash = (p: string) => (p.endsWith('/') ? p : `${p}/`);

/** Which place a pathname belongs to ('/drill' and '/drill/' both count). */
export function placeOf(pathname: string): Place | null {
  const path = slash(pathname);
  if (path === '/') return 'today';
  return PLACES.find((p) => p.href !== '/' && [p.href, ...p.pages.map((s) => s.href)].some((h) => path.startsWith(h)))?.place ?? null;
}

/** The pages of the place a pathname is in, and which one is open; empty when the place has one page. */
export function subPagesOf(pathname: string): { pages: readonly SubPage[]; current: string | null } {
  const path = slash(pathname);
  const place = PLACES.find((p) => p.place === placeOf(path));
  const pages = place?.pages ?? [];
  return { pages, current: pages.find((s) => path.startsWith(s.href))?.href ?? null };
}
