// ============================================================
// navi - Track (PLAN-track.md): one pillar, a rung (mid or senior), a soft
// 4-week end date. Pure: no React, no Firestore.
//
// Closing rules use only what the learner can practise (drills and mistakes).
// Level 3/4 ("used at work", "teach") never block a close; the summary shows
// them as work-verified.
// ============================================================

import { parseDay } from '@/lib/day';
import { dayNumber, doneOfType, groupOf, openLevels, scorePercent } from '@/lib/drills';
import type { Drill, DrillLevel, DrillType, Mistake, SkillLevel, Track, TrackRung, TrackSnapshot, TrackSummary } from '@/types/navi';

const DAY = 86_400_000;
/** Drills older than this do not count toward a rung. */
export const WINDOW_DAYS = 60;
export const TRACK_DAYS = 28;
export const MAX_NEEDS = 5;
const PASS = 70;
/** Drill types that show senior judgment (trade-offs, chains of failure, real incidents). */
export const SENIOR_TYPES: readonly DrillType[] = ['tradeoff', 'failure-mode', 'war-room', 'incident'];

type D = Drill & { id: string };
type M = Mistake & { id: string };
export type TrackSkill = { id: string; name: string; area: string; level: SkillLevel };
export type Check = { label: string; done: boolean; detail: string };

/** Done drills that train at least one of the skills, done in [from, to]. */
function drillsFor(ids: Set<string>, drills: D[], from: number, to = Infinity): D[] {
  return drills.filter((d) => d.status === 'done' && d.doneAt !== null && d.doneAt >= from && d.doneAt <= to && d.skillIds.some((s) => ids.has(s)));
}

/** Mistakes of the pillar: tagged with one of the skills, or from one of its drills. */
function mistakesFor(ids: Set<string>, drills: D[], mistakes: M[]): M[] {
  const drillIds = new Set(drills.filter((d) => d.skillIds.some((s) => ids.has(s))).map((d) => d.id));
  return mistakes.filter((m) => (m.skillId !== null && ids.has(m.skillId)) || drillIds.has(m.drillId));
}

const pct = (d: D) => scorePercent(d.score) ?? 0;

function average(drills: D[]): number | null {
  const scores = drills.map((d) => scorePercent(d.score)).filter((x): x is number => x !== null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

/** The checks for a rung (PLAN-track.md 4). Senior includes every mid check. */
export function rungChecks(rung: TrackRung, needIds: string[], skills: TrackSkill[], drills: D[], mistakes: M[], now: number): { checks: Check[]; met: boolean } {
  const ids = new Set(needIds);
  const recent = drillsFor(ids, drills, now - WINDOW_DAYS * DAY);
  const atDo = needIds.filter((id) => (skills.find((s) => s.id === id)?.level ?? 0) >= 2).length;
  const medium = recent.filter((d) => d.level !== 'easy' && pct(d) >= PASS).length;
  const due = mistakesFor(ids, drills, mistakes).filter((m) => m.nextReviewAt !== null && m.nextReviewAt <= now).length;
  const checks: Check[] = [
    { label: 'skills at "do"', done: needIds.length > 0 && atDo === needIds.length, detail: `${atDo}/${needIds.length}` },
    { label: 'medium drills at 70%+', done: medium >= 3, detail: `${Math.min(medium, 3)}/3` },
    { label: 'no mistakes due', done: due === 0, detail: due ? `${due} due` : '0' },
  ];
  if (rung === 'senior') {
    const hard = recent.filter((d) => d.level === 'hard' && pct(d) >= PASS);
    checks.push(
      { label: 'hard drills at 70%+', done: hard.length >= 2, detail: `${Math.min(hard.length, 2)}/2` },
      {
        label: 'a hard trade-off, failure or incident',
        done: hard.some((d) => SENIOR_TYPES.includes(d.type)),
        detail: hard.some((d) => SENIOR_TYPES.includes(d.type)) ? '1/1' : '0/1',
      },
    );
  }
  return { checks, met: checks.every((c) => c.done) };
}

/** Skills a new track starts with: the pillar's lowest levels first, at most 5. */
export function defaultNeeds(area: string, skills: TrackSkill[]): string[] {
  return skills
    .filter((s) => s.area === area)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .slice(0, MAX_NEEDS)
    .map((s) => s.id);
}

/** What the track starts from; the summary compares against it. */
export function snapshot(needIds: string[], skills: TrackSkill[], drills: D[], mistakes: M[], now: number): TrackSnapshot {
  const ids = new Set(needIds);
  const levels: Record<string, SkillLevel> = {};
  for (const id of needIds) levels[id] = skills.find((s) => s.id === id)?.level ?? 0;
  return {
    levels,
    drillAvg: average(drillsFor(ids, drills, now - WINDOW_DAYS * DAY, now)),
    openMistakeIds: mistakesFor(ids, drills, mistakes)
      .filter((m) => m.nextReviewAt !== null)
      .map((m) => m.id)
      .slice(0, 50),
  };
}

/** A new track: 28 days, baseline taken now. */
export function newTrack(area: string, rung: TrackRung, needIds: string[], skills: TrackSkill[], drills: D[], mistakes: M[], now: number): Track {
  return { area, rung, startedAt: now, endBy: now + TRACK_DAYS * DAY, baseline: snapshot(needIds, skills, drills, mistakes, now), summary: null };
}

/** Days into the track (1-based) and days past the end (0 when not late). */
export function trackDays(t: Pick<Track, 'startedAt' | 'endBy'>, now: number): { day: number; total: number; late: number } {
  return {
    day: Math.max(1, Math.ceil((now - t.startedAt) / DAY)),
    total: Math.round((t.endBy - t.startedAt) / DAY),
    late: now > t.endBy ? Math.ceil((now - t.endBy) / DAY) : 0,
  };
}

/** Before and after, fixed when the learner closes the track (PLAN-track.md 6). */
export function trackSummary(t: Track, needIds: string[], skills: TrackSkill[], drills: D[], mistakes: M[], now: number): TrackSummary {
  const ids = new Set(needIds);
  const during = drillsFor(ids, drills, t.startedAt, now);
  const byId = new Map(drills.map((d) => [d.id, d]));
  const pillarMistakes = mistakesFor(ids, drills, mistakes);
  const stillOpen = new Map(mistakes.map((m) => [m.id, m.nextReviewAt]));
  const redo = drills
    .filter((d) => d.status === 'done' && d.redoOf && d.doneAt !== null && d.doneAt >= t.startedAt && d.doneAt <= now)
    .flatMap((d) => {
      const old = byId.get(d.redoOf!);
      const inPillar = d.skillIds.some((s) => ids.has(s)) || !!old?.skillIds.some((s) => ids.has(s));
      return old && inPillar ? [{ topic: d.topic, before: pct(old), after: pct(d) }] : [];
    });
  return {
    met: rungChecks(t.rung, needIds, skills, drills, mistakes, now).met,
    days: Math.max(1, Math.ceil((now - t.startedAt) / DAY)),
    late: now > t.endBy,
    levels: needIds.map((id) => {
      const s = skills.find((x) => x.id === id);
      const after = s?.level ?? 0;
      return { skillId: id, name: s?.name ?? id, before: t.baseline.levels[id] ?? 0, after, workVerified: after >= 3 };
    }),
    drillAvg: { before: t.baseline.drillAvg, after: average(during) },
    drills: {
      easy: during.filter((d) => d.level === 'easy').length,
      medium: during.filter((d) => d.level === 'medium').length,
      hard: during.filter((d) => d.level === 'hard').length,
    },
    mistakesFixed: t.baseline.openMistakeIds.filter((id) => stillOpen.has(id) && stillOpen.get(id) === null).length,
    mistakesNew: pillarMistakes.filter((m) => m.createdAt >= t.startedAt).length,
    redo: redo.slice(0, 10),
  };
}

/**
 * Today's drill while a track runs (PLAN-track.md 5). Only tech days change;
 * ai, comms, business and writing days stay as they are. null = keep `base`.
 */
export function trackDrillPick(
  day: string,
  t: Pick<Track, 'rung'>,
  needIds: string[],
  skills: TrackSkill[],
  drills: D[],
  base: { type: DrillType },
): { type: DrillType; level: DrillLevel; topic: string; skillId: string } | null {
  if (groupOf(base.type) !== 'tech' || needIds.length === 0) return null;
  const n = dayNumber(day);
  const isSunday = parseDay(day).getDay() === 0;
  let type: DrillType;
  if (isSunday) type = Math.floor(n / 7) % 2 === 0 ? 'war-room' : 'incident';
  else type = t.rung === 'senior' ? SENIOR_TYPES[Math.floor(n / 2) % SENIOR_TYPES.length] : base.type;

  const open = openLevels(doneOfType(drills, type));
  const level: DrillLevel = t.rung === 'mid' && !isSunday ? (open.includes('medium') ? 'medium' : 'easy') : open[open.length - 1];

  // Skills below "do" first; inside a group, the one with the fewest drills.
  const count = (id: string) => drills.filter((x) => x.status === 'done' && x.skillIds.includes(id)).length;
  const own = needIds.map((id) => skills.find((s) => s.id === id)).filter((s): s is TrackSkill => !!s);
  const low = own.filter((s) => s.level < 2);
  const pool = (low.length ? low : own).sort((a, b) => count(a.id) - count(b.id) || a.name.localeCompare(b.name));
  if (!pool.length) return null;
  const skill = pool[n % pool.length];
  return { type, level, topic: skill.name, skillId: skill.id };
}

/** Ids of drills and mistakes in the track's pillar, to put them first in redo and review. */
export function pillarIds(needIds: string[], drills: D[], mistakes: M[]): { drills: Set<string>; mistakes: Set<string> } {
  const ids = new Set(needIds);
  return {
    drills: new Set(drills.filter((d) => d.skillIds.some((s) => ids.has(s))).map((d) => d.id)),
    mistakes: new Set(mistakesFor(ids, drills, mistakes).map((m) => m.id)),
  };
}
