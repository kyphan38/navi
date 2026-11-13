// Places in the rail, in order. Pure, so tests can check hrefs.

export type Place = 'today' | 'drill' | 'learn' | 'terms' | 'map' | 'ask' | 'news' | 'settings';

export const PLACES: readonly { place: Place; href: string }[] = [
  { place: 'today', href: '/' },
  { place: 'drill', href: '/drill/' },
  { place: 'learn', href: '/learn/' },
  { place: 'terms', href: '/terms/' },
  { place: 'map', href: '/map/' },
  { place: 'ask', href: '/ask/' },
  { place: 'news', href: '/news/' },
  { place: 'settings', href: '/settings/' },
];

/** Which place a pathname belongs to ('/drill' and '/drill/' both count). */
export function placeOf(pathname: string): Place | null {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (path === '/') return 'today';
  return PLACES.find((p) => p.href !== '/' && path.startsWith(p.href))?.place ?? null;
}
