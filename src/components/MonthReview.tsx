'use client';

import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { hm } from '@/lib/plan';
import { watchMonths, type MonthDoc } from '@/lib/repo';

function List({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <p className="font-mono text-[12px] text-faint">{label}</p>
      <ul className="mt-1 space-y-1">
        {items.map((t) => (
          <li key={t} className="text-[15px] text-muted">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Monthly review written by the monthlyReview function on the 1st. Hidden until the first one exists. */
export default function MonthReview() {
  const uid = useUid();
  const [months, setMonths] = useState<MonthDoc[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => watchMonths(uid, setMonths), [uid]);

  const m = months[Math.min(index, months.length - 1)];
  if (!m) return null;
  const older = index < months.length - 1;
  const newer = index > 0;

  return (
    <section className="mt-12 text-[15px]">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-mono text-[12px] tracking-[0.12em] text-faint">month · {m.id}</h2>
        {months.length > 1 && (
          <div className="flex gap-4 font-mono text-[12px]">
            <button type="button" disabled={!older} onClick={() => setIndex(index + 1)} className="text-faint hover:text-ink disabled:opacity-30">
              older
            </button>
            <button type="button" disabled={!newer} onClick={() => setIndex(index - 1)} className="text-faint hover:text-ink disabled:opacity-30">
              newer
            </button>
          </div>
        )}
      </div>
      <p className="text-ink">{m.summary}</p>
      <p className="mt-1 font-mono text-[12px] text-faint">
        {hm(m.stats.minutes)} · {m.stats.drillsDone} drills · {m.stats.modulesDone} modules · {m.stats.termsAdded} terms
      </p>
      <List label="got better" items={m.progress} />
      <List label="avoiding" items={m.avoiding} />
      <List label="next month" items={m.next} />
    </section>
  );
}
