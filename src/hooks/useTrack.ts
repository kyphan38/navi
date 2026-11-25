'use client';

import { useEffect, useMemo, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { watchMilestones, watchSkills, type MilestoneDoc, type SkillDoc } from '@/lib/repo';
import type { TrackSkill } from '@/lib/track';
import type { Track } from '@/types/navi';

export type ActiveTrack = MilestoneDoc & { track: Track };

/**
 * The running track (at most one) and the skills with their cached level, for
 * Today and Review. The Map keeps the cached level in step with the evidence.
 */
export function useTrack(): { active: ActiveTrack | null; needIds: string[]; skills: TrackSkill[]; ready: boolean } {
  const uid = useUid();
  const [milestones, setMilestones] = useState<MilestoneDoc[] | null>(null);
  const [skillDocs, setSkillDocs] = useState<SkillDoc[] | null>(null);
  useEffect(() => watchMilestones(uid, setMilestones), [uid]);
  useEffect(() => watchSkills(uid, setSkillDocs), [uid]);
  return useMemo(() => {
    const active = (milestones ?? []).find((m): m is ActiveTrack => m.kind === 'track' && m.doneAt === null && !!m.track) ?? null;
    const skills = (skillDocs ?? []).map((s) => ({ id: s.id, name: s.name, area: s.area, level: s.level }));
    return { active, needIds: active?.needs.map((n) => n.skillId) ?? [], skills, ready: milestones !== null && skillDocs !== null };
  }, [milestones, skillDocs]);
}
