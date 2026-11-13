import type { ReactNode } from 'react';

import Prose from '@/components/Prose';
import { clockAt } from '@/lib/drills';
import type { DrillDoc } from '@/lib/repo';

/** One line of the incident log: fake clock on the left, content on the right. */
function LogRow({ clock, children, className = '' }: { clock: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-4 ${className}`}>
      <span className="w-11 shrink-0 pt-[3px] font-mono text-[12px] text-faint tabular-nums">{clock}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** The brief and every round so far, as an incident log (PLAN-navi.md 1b). */
export function DrillLog({ drill, upTo }: { drill: DrillDoc; upTo?: number }) {
  const rounds = upTo === undefined ? drill.rounds : drill.rounds.slice(0, upTo);
  return (
    <div className="space-y-6 text-[15px] leading-relaxed">
      <LogRow clock={clockAt(drill.clock, 0)}>
        <Prose text={drill.brief} className="text-ink" />
      </LogRow>
      {rounds.map((r, i) => (
        <div key={i} className="space-y-3">
          <LogRow clock={clockAt(drill.clock, i + 1)}>
            <Prose text={r.prompt} className="text-ink" />
          </LogRow>
          {r.answer && (
            <LogRow clock="">
              <div className="flex gap-3">
                <span className="shrink-0 pt-[3px] font-mono text-[12px] text-faint">you</span>
                <p className="min-w-0 whitespace-pre-wrap font-medium text-ink [overflow-wrap:anywhere]">{r.answer}</p>
              </div>
            </LogRow>
          )}
          {r.reveal && (
            <LogRow clock="">
              <p className="border-l border-line-strong pl-3 text-muted">{r.reveal}</p>
            </LogRow>
          )}
        </div>
      ))}
    </div>
  );
}
