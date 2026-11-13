'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useUid } from '@/components/AuthGate';
import { useProfile } from '@/hooks/useProfile';
import { addDays, dayOf } from '@/lib/day';
import { minutesPerWeek, mondayOf, weekOf, weeklyBudget } from '@/lib/plan';
import { watchCourses, watchDaysSince, watchWeeks, type CourseDoc, type DayDoc, type WeekDoc } from '@/lib/repo';

const noop = () => () => {};

/**
 * Everything the course plan needs: today, the active course, all weeks, the
 * last 5 weeks of days, and the weekly budget. `ready` is false while loading.
 */
export function useLearning() {
  const uid = useUid();
  const profile = useProfile();
  const today = useSyncExternalStore(noop, () => dayOf(Date.now()), () => '');
  const [courses, setCourses] = useState<CourseDoc[] | null>(null);
  const [weeks, setWeeks] = useState<WeekDoc[] | null>(null);
  const [days, setDays] = useState<DayDoc[] | null>(null);

  useEffect(() => watchCourses(uid, setCourses), [uid]);
  useEffect(() => watchWeeks(uid, setWeeks), [uid]);
  // 4 full weeks before this one, for the budget.
  const since = today ? addDays(mondayOf(today), -28) : '';
  useEffect(() => (since ? watchDaysSince(uid, since, setDays) : undefined), [uid, since]);

  return useMemo(() => {
    const course = courses?.find((c) => c.status !== 'done') ?? null;
    const weekId = today ? weekOf(today) : '';
    const week = weeks?.find((w) => w.id === weekId) ?? null;
    const budget =
      today && weeks && days
        ? weeklyBudget(today, new Set(weeks.map((w) => w.id)), minutesPerWeek(days), profile.hoursPerWeek)
        : { minutes: profile.hoursPerWeek * 60, real: false };
    const todayDoc = days?.find((d) => d.id === today) ?? null;
    return {
      ready: !!today && courses !== null && weeks !== null && days !== null,
      today,
      course,
      weekId,
      week,
      weeks: weeks ?? [],
      days: days ?? [],
      todayDoc,
      budget,
      profile,
    };
  }, [courses, weeks, days, today, profile]);
}
