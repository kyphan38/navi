'use client';

import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { watchSkills, type SkillDoc } from '@/lib/repo';
import { watchRole } from '@/lib/repo-career';
import { focusSkills } from '@/lib/role';
import type { TargetRole } from '@/types/navi';

/** Skill names the target role still needs more of; drill topics on Today. */
export function useFocusTopics(): string[] {
  const uid = useUid();
  const [role, setRole] = useState<TargetRole | null>(null);
  const [skills, setSkills] = useState<SkillDoc[]>([]);
  useEffect(() => watchRole(uid, setRole), [uid]);
  useEffect(() => watchSkills(uid, setSkills), [uid]);
  return role ? focusSkills(role.needs, skills) : [];
}
