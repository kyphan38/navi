'use client';

import { useRef } from 'react';

import { useUid } from '@/components/AuthGate';
import { useNow } from '@/hooks/useNow';
import { tickModules } from '@/lib/plan';
import { dayData, tickDay, updateCourse, type CourseDoc, type DayDoc } from '@/lib/repo';
import type { CourseModule } from '@/types/navi';

/**
 * Ticks a module: marks it in its course and adds its minutes to today.
 * A course stores modules as one array, so a second quick tick could be
 * built on an old snapshot and undo the first. Ticks not yet seen in the
 * snapshot are kept here and applied on top. With several courses (V6) the
 * module's own course is found by id.
 */
export function useTick(courses: CourseDoc[], today: string, todayDoc: DayDoc | null) {
  const uid = useUid();
  const now = useNow();
  const pending = useRef(new Map<string, number | null>());

  return (m: CourseModule, done: boolean) => {
    const course = courses.find((c) => c.modules.some((x) => x.id === m.id));
    if (!course || !today) return;
    let modules = course.modules;
    for (const [id, doneAt] of pending.current) {
      const inSnap = modules.find((x) => x.id === id);
      if (!inSnap) continue; // another course's module
      // Already in the snapshot: forget it.
      if ((inSnap.doneAt !== null) === (doneAt !== null)) pending.current.delete(id);
      else modules = tickModules(modules, id, doneAt !== null, doneAt ?? now);
    }
    modules = tickModules(modules, m.id, done, now);
    pending.current.set(m.id, done ? now : null);
    updateCourse(uid, course.id, { modules });
    tickDay(uid, today, dayData(todayDoc), m, done, now);
  };
}
