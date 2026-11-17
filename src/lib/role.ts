// navi - Skills against a target role (V10): what is missing, which evidence is thin,
// what to learn next. Pure.

import type { Evidence, SkillLevel } from '@/types/navi';

export type RoleSkill = { id: string; name: string; computed: SkillLevel; all: Evidence[] };
export type Gap = { id: string; name: string; need: number; have: number; gap: number; thin: boolean };

/**
 * One row per needed skill. `thin`: the level stands on a single piece of evidence,
 * or on practice only (no "used at work" or "explain" yet) when the role needs level 3+.
 */
export function roleGaps(needs: { skillId: string; level: number }[], skills: RoleSkill[]): Gap[] {
  const byId = new Map(skills.map((s) => [s.id, s]));
  return needs
    .map((n) => {
      const s = byId.get(n.skillId);
      const have = s?.computed ?? 0;
      const ev = s?.all ?? [];
      const real = ev.some((e) => e.kind === 'work' || e.kind === 'explain');
      const thin = have > 0 && (ev.length <= 1 || (n.level >= 3 && !real));
      return { id: n.skillId, name: s?.name ?? n.skillId, need: n.level, have, gap: Math.max(0, n.level - have), thin };
    })
    .sort((a, b) => b.gap - a.gap || Number(b.thin) - Number(a.thin) || a.name.localeCompare(b.name));
}

/** The 3 skills to work on next: biggest gaps first, then thin evidence. */
export function learnNext(gaps: Gap[]): Gap[] {
  return gaps.filter((g) => g.gap > 0 || g.thin).slice(0, 3);
}

/** Share of the needed levels already reached, 0-100. */
export function roleReadiness(gaps: Gap[]): number {
  const need = gaps.reduce((s, g) => s + g.need, 0);
  if (need === 0) return 0;
  const have = gaps.reduce((s, g) => s + Math.min(g.have, g.need), 0);
  return Math.round((100 * have) / need);
}
