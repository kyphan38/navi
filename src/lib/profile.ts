// Profile helpers with no React or Firestore, so `node --test` can cover them.

import type { Profile } from '@/types/navi';

export const DEFAULT_PROFILE: Profile = {
  role: 'DevOps engineer',
  years: 2,
  context: 'payment app on AWS at a bank',
  focus: 'cloud security and reliability for payments',
  hoursPerWeek: 5,
};

/** Limits shared with firestore.rules.template (validProfile). */
export const PROFILE_LIMITS = { text: 200, years: [0, 50], hours: [1, 40] } as const;

const clampInt = (n: unknown, [lo, hi]: readonly [number, number], fallback: number) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(hi, Math.max(lo, v));
};

const cleanText = (s: unknown, fallback: string) => {
  const v = typeof s === 'string' ? s.normalize('NFC').trim().slice(0, PROFILE_LIMITS.text) : '';
  return v || fallback;
};

/** Any stored or typed value -> a profile the rules accept. Missing parts use the defaults. */
export function normalizeProfile(raw: Partial<Record<keyof Profile, unknown>> | null | undefined): Profile {
  const d = DEFAULT_PROFILE;
  return {
    role: cleanText(raw?.role, d.role),
    years: clampInt(raw?.years, PROFILE_LIMITS.years, d.years),
    context: cleanText(raw?.context, d.context),
    focus: cleanText(raw?.focus, d.focus),
    hoursPerWeek: clampInt(raw?.hoursPerWeek, PROFILE_LIMITS.hours, d.hoursPerWeek),
  };
}
