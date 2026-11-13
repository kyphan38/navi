import type { MetadataRoute } from 'next';

import { BG_LIGHT } from '@/lib/prefs';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'navi',
    short_name: 'navi',
    description: 'Grow one step a day',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: BG_LIGHT,
    theme_color: BG_LIGHT,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
