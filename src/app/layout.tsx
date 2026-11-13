import type { Metadata, Viewport } from 'next';

import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import { BG_DARK, BG_LIGHT, THEME_SCRIPT } from '@/lib/prefs';

// The tab title is always "navi". No page sets its own title.
export const metadata: Metadata = {
  title: 'navi',
  description: 'Grow one step a day',
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'navi', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BG_LIGHT },
    { media: '(prefers-color-scheme: dark)', color: BG_DARK },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // data-theme is set by THEME_SCRIPT before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
