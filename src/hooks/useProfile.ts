'use client';

import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { DEFAULT_PROFILE } from '@/lib/profile';
import { watchProfile } from '@/lib/repo';
import type { Profile } from '@/types/navi';

/** The profile (defaults until loaded or saved). */
export function useProfile(): Profile {
  const uid = useUid();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  useEffect(() => watchProfile(uid, (p) => setProfile(p)), [uid]);
  return profile;
}
