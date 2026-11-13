'use client';

import { useSyncExternalStore } from 'react';

import PageHead from '@/components/PageHead';
import { dayOf, parseDay } from '@/lib/day';

const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const noop = () => () => {};

export default function TodayView() {
  // Read on the client only: the static build has no "today".
  const day = useSyncExternalStore(noop, () => dayOf(Date.now()), () => '');
  return (
    <main className="column">
      <PageHead title="today" meta={day ? fmt.format(parseDay(day)) : undefined} />
    </main>
  );
}
