// ============================================================
// navi - Display options (per device, localStorage)
//
// The theme must exist BEFORE the first paint, so an inline script in <head>
// (THEME_SCRIPT) reads it instead of waiting for React.
// ============================================================

import { stringStore } from '@/lib/store';

export type Theme = 'system' | 'light' | 'dark';

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (raw: string): T | null =>
    (values as readonly string[]).includes(raw) ? (raw as T) : null;

export const themeStore = stringStore<Theme>('navi.theme', 'system', oneOf(['system', 'light', 'dark']));

/** Status bar color (theme-color) - matches --bg in globals.css. */
export const BG_LIGHT = '#fafafa';
export const BG_DARK = '#111111';

/** Applies the theme to <html>. Called when the user changes it in Settings. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', dark ? BG_DARK : BG_LIGHT));
}

/** Runs in <head> before the first paint, so dark mode never flashes white. Handwritten ES5. */
export const THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem('navi.theme');
if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);
}catch(e){}})();`;
