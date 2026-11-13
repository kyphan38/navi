'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import { useUid } from '@/components/AuthGate';
import PageHead from '@/components/PageHead';
import { useAuth } from '@/contexts/AuthContext';
import { applyTheme, themeStore, type Theme } from '@/lib/prefs';
import { DEFAULT_PROFILE, PROFILE_LIMITS } from '@/lib/profile';
import { saveProfile, watchProfile } from '@/lib/repo';
import type { Profile } from '@/types/navi';

type Field = keyof Profile;

const FIELDS: readonly { key: Field; label: string; num?: readonly [number, number] }[] = [
  { key: 'role', label: 'role' },
  { key: 'years', label: 'years', num: PROFILE_LIMITS.years },
  { key: 'context', label: 'work' },
  { key: 'focus', label: 'focus' },
  { key: 'hoursPerWeek', label: 'hours a week', num: PROFILE_LIMITS.hours },
];

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <span className="shrink-0 text-muted">{label}</span>
      {children}
    </div>
  );
}

export default function SettingsView() {
  const uid = useUid();
  const { user, signOut } = useAuth();
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.getServer);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [pending, setPending] = useState(false);
  // Text being typed; saved on blur. Keys not in here show the stored value.
  const [draft, setDraft] = useState<Partial<Record<Field, string>>>({});

  useEffect(
    () =>
      watchProfile(uid, (p, isPending) => {
        setProfile(p);
        setPending(isPending);
      }),
    [uid],
  );

  const commit = (key: Field) => {
    const raw = draft[key];
    if (raw === undefined) return;
    const field = FIELDS.find((f) => f.key === key);
    const value = field?.num ? Number(raw) : raw;
    saveProfile(uid, { ...profile, [key]: value });
    setDraft((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
  };

  const pickTheme = (t: Theme) => {
    themeStore.set(t);
    applyTheme(t);
  };

  return (
    <main className="column">
      <PageHead title="settings" meta={pending ? 'saving' : undefined} />

      <section className="mt-10 text-[15px]">
        <SectionTitle>profile</SectionTitle>
        {FIELDS.map(({ key, label, num }) => (
          <label key={key} className="flex items-baseline gap-6 py-2.5">
            <span className="w-28 shrink-0 text-muted">{label}</span>
            <input
              value={draft[key] ?? String(profile[key])}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              onBlur={() => commit(key)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              inputMode={num ? 'numeric' : 'text'}
              maxLength={num ? 2 : PROFILE_LIMITS.text}
              className="min-w-0 flex-1 border-b border-line bg-transparent pb-1 text-[16px] text-ink transition-colors focus:border-line-strong"
            />
          </label>
        ))}
      </section>

      <section className="mt-10 text-[15px]">
        <SectionTitle>display</SectionTitle>
        <Row label="theme">
          <div className="flex gap-4" role="radiogroup" aria-label="Theme">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={t === theme}
                onClick={() => pickTheme(t)}
                className={t === theme ? 'text-ink' : 'text-faint hover:text-muted'}
              >
                {t}
              </button>
            ))}
          </div>
        </Row>
      </section>

      <section className="mt-10 text-[15px]">
        <SectionTitle>account</SectionTitle>
        <Row label={user?.email ?? ''}>
          <button type="button" onClick={signOut} className="text-faint hover:text-ink">
            sign out
          </button>
        </Row>
      </section>
    </main>
  );
}
