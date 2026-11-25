'use client';

import { useUid } from '@/components/AuthGate';
import { updateMilestone, type MilestoneDoc } from '@/lib/repo';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

/** Milestones with dates, career ones with their checklist (PLAN-navi.md 9). */
export default function Milestones({ items, now }: { items: { m: MilestoneDoc; done: boolean; date: number | null }[]; now: number }) {
  const uid = useUid();
  return (
    <ul className="space-y-4 text-[15px]">
      {items.map(({ m, done, date }) => (
        <li key={m.id}>
          <p className="flex items-baseline justify-between gap-4">
            <span className={done ? 'text-faint' : 'text-ink'}>{m.title}</span>
            <span className="shrink-0 font-mono text-[12px] text-faint">
              {done ? 'done' : m.kind === 'career' ? `${m.checklist.filter((c) => c.done).length}/${m.checklist.length}` : date ? `~${dateFmt.format(date)}` : ''}
            </span>
          </p>
          {m.kind === 'career' && (
            <ul className="mt-1.5 space-y-0.5">
              {m.checklist.map((c, i) => (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={c.done}
                    onClick={() =>
                      updateMilestone(uid, m.id, { checklist: m.checklist.map((x, j) => (j === i ? { ...x, done: !x.done, at: x.done ? null : now } : x)) })
                    }
                    className="flex items-center gap-3 py-0.5 text-left text-[14px]"
                  >
                    <span className={`size-2.5 rounded-[2px] border ${c.done ? 'border-ink bg-ink' : 'border-line-strong'}`} aria-hidden />
                    <span className={c.done ? 'text-ink' : 'text-muted'}>{c.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
