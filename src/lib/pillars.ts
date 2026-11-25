// navi - The five DevOps/Platform pillars a Track can focus on (PLAN-track.md 2). Pure.

import { SKILL_CATALOG } from '@/lib/skill-level';

export const PILLARS = [
  'Linux & networking',
  'Containers & Kubernetes',
  'IaC & CI/CD',
  'Observability & reliability',
  'Cloud & security',
] as const;
export type Pillar = (typeof PILLARS)[number];

/** Kept for later, never pushed into today's drill topics. */
export const PARKED_AREAS: readonly string[] = ['AI infra'];

/** Skill areas used before the pillars (2026-11-25). */
const OLD_AREAS = new Set(['Security', 'Networking', 'Reliability', 'Delivery', 'Platform']);

export function isPillar(area: string): area is Pillar {
  return (PILLARS as readonly string[]).includes(area);
}

/**
 * Starter skills still in an old area, with the pillar they move to.
 * Skills the learner added, or moved by hand to another area, are left alone.
 */
export function pillarMigration(skills: readonly { id: string; area: string }[]): { id: string; area: string }[] {
  const target = new Map(SKILL_CATALOG.map((s) => [s.id, s.area]));
  return skills.flatMap((s) => {
    const to = target.get(s.id);
    return to && to !== s.area && OLD_AREAS.has(s.area) ? [{ id: s.id, area: to }] : [];
  });
}
