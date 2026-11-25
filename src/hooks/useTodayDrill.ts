'use client';

import { useSyncExternalStore } from 'react';

import { useDrills } from '@/hooks/useDrills';
import { useFocusTopics } from '@/hooks/useFocusTopics';
import { useLearning } from '@/hooks/useLearning';
import { useMistakes } from '@/hooks/useMistakes';
import { useNow } from '@/hooks/useNow';
import { useTrack } from '@/hooks/useTrack';
import { dayOf } from '@/lib/day';
import { todayDrill, topicForDay } from '@/lib/drills';
import { redoPick } from '@/lib/redo';
import { pillarIds, trackDrillPick } from '@/lib/track';
import type { DrillLevel, DrillType } from '@/types/navi';

const noop = () => () => {};

/**
 * Today's drill and redo, shared by Today and the drill page. Topic priority:
 * track > target role > course (PLAN-track.md 5).
 */
export function useTodayDrill() {
  // Read on the client only: the static build has no "today".
  const day = useSyncExternalStore(noop, () => dayOf(Date.now()), () => '');
  const drills = useDrills();
  const mistakes = useMistakes();
  const now = useNow();
  const track = useTrack();
  const learning = useLearning();
  const focus = useFocusTopics();

  const pick = day && drills ? todayDrill(day, drills) : null;
  const pillar = drills && mistakes ? pillarIds(track.needIds, drills, mistakes) : null;
  // A low-score drill from two weeks ago, to try again (V5); the track's pillar first.
  const redo = drills && now && pick?.state !== 'active' ? redoPick(drills, now, pillar?.drills) : null;
  // A running track changes tech days only.
  const trackPick =
    pick?.state === 'todo' && track.active && drills ? trackDrillPick(day, track.active.track, track.needIds, track.skills, drills, pick) : null;
  const topic = trackPick?.topic ?? (day ? topicForDay(day, learning.week?.plan.drillTopics ?? [], focus) : undefined);
  const next: { type: DrillType; level: DrillLevel; topic?: string; skillId?: string } | null =
    pick?.state === 'todo' ? { type: trackPick?.type ?? pick.type, level: trackPick?.level ?? pick.level, topic, skillId: trackPick?.skillId } : null;

  return { day, drills, mistakes, now, learning, pick, redo, next, area: trackPick && track.active ? track.active.track.area : null };
}
