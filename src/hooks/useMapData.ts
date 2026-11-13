'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { useDrills } from '@/hooks/useDrills';
import { useLearning } from '@/hooks/useLearning';
import { addDays } from '@/lib/day';
import { defaultMilestones } from '@/lib/forecast';
import { aiError, tagSkills } from '@/lib/ai';
import { mondayOf } from '@/lib/plan';
import {
  addMilestones,
  seedSkills,
  setSkillLevel,
  watchDaysSince,
  watchMilestones,
  watchSkills,
  type DayDoc,
  type MilestoneDoc,
  type SkillDoc,
} from '@/lib/repo';
import { SKILL_CATALOG, derivedEvidence, levelOf } from '@/lib/skill-level';
import type { Evidence, SkillLevel } from '@/types/navi';

export type SkillView = SkillDoc & { all: Evidence[]; computed: SkillLevel; reachedAt: number | null };

/**
 * Data for the Map. First visit: creates the starter skills and milestones.
 * When the course or finished drills are not tagged with skills yet, asks the
 * server to tag them (once per page visit).
 */
export function useMapData() {
  const uid = useUid();
  const learning = useLearning();
  const drills = useDrills();
  const [skills, setSkills] = useState<SkillDoc[] | null>(null);
  const [milestones, setMilestones] = useState<MilestoneDoc[] | null>(null);
  const [days, setDays] = useState<DayDoc[] | null>(null);
  const [tagging, setTagging] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const tagTried = useRef(false);
  const seeded = useRef({ skills: false, milestones: false, course: '' });

  useEffect(() => watchSkills(uid, setSkills), [uid]);
  useEffect(() => watchMilestones(uid, setMilestones), [uid]);
  // 12 weeks of days for the bar chart.
  const since = learning.today ? addDays(mondayOf(learning.today), -77) : '';
  useEffect(() => (since ? watchDaysSince(uid, since, setDays) : undefined), [uid, since]);

  const { course, ready } = learning;

  // Seed once: skills, milestones, and a course milestone when a course is added later.
  useEffect(() => {
    if (skills && skills.length === 0 && !seeded.current.skills) {
      seeded.current.skills = true;
      seedSkills(uid, SKILL_CATALOG);
    }
  }, [skills, uid]);
  useEffect(() => {
    if (!milestones || !ready) return;
    if (milestones.length === 0 && !seeded.current.milestones) {
      seeded.current.milestones = true;
      addMilestones(uid, defaultMilestones(course ? { id: course.id, title: course.title } : null));
    } else if (course && milestones.length > 0 && !milestones.some((m) => m.courseId === course.id) && seeded.current.course !== course.id) {
      seeded.current.course = course.id;
      const [courseMs] = defaultMilestones({ id: course.id, title: course.title });
      addMilestones(uid, [{ ...courseMs, order: 0.5 }]);
    }
  }, [milestones, ready, course, uid]);

  // Tag once per visit when something is untagged and the skills exist.
  const needsTag = !!skills?.length && ((course && !course.taggedAt) || (drills ?? []).some((d) => d.status === 'done' && d.tagged !== true));
  useEffect(() => {
    if (!needsTag || tagTried.current) return;
    tagTried.current = true;
    setTagging(true);
    tagSkills()
      .catch((err) => setTagError(aiError(err)))
      .finally(() => setTagging(false));
  }, [needsTag]);

  const views = useMemo<SkillView[] | null>(() => {
    if (!skills) return null;
    const modules = course?.modules ?? [];
    return skills.map((s) => {
      const all = [...derivedEvidence(s.id, modules, drills ?? []), ...s.evidence];
      const { level, reachedAt } = levelOf(all);
      return { ...s, all, computed: level, reachedAt };
    });
  }, [skills, course, drills]);

  // Keep the cached level on the skill doc in step.
  useEffect(() => {
    for (const v of views ?? []) if (v.level !== v.computed) setSkillLevel(uid, v.id, v.computed);
  }, [views, uid]);

  return { learning, drills, skills: views, milestones, days, tagging, tagError };
}
