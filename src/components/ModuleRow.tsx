import type { CourseModule } from '@/types/navi';

import { hm } from '@/lib/plan';

/** One course module: a tick box, the title, its kind and minutes, and "done when" under it. */
export default function ModuleRow({
  m,
  onToggle,
  showDoneWhen = false,
}: {
  m: CourseModule;
  onToggle: (done: boolean) => void;
  showDoneWhen?: boolean;
}) {
  const done = m.doneAt !== null;
  return (
    <div className="py-1.5">
      <button type="button" role="checkbox" aria-checked={done} onClick={() => onToggle(!done)} className="group flex w-full items-baseline gap-3 text-left">
        <span className={`relative top-[1px] size-2.5 shrink-0 rounded-[2px] border transition-colors ${done ? 'border-ink bg-ink' : 'border-line-strong group-hover:border-faint'}`} aria-hidden />
        <span className={`min-w-0 flex-1 [overflow-wrap:anywhere] ${done ? 'text-faint' : 'text-ink'}`}>{m.title}</span>
        {m.kind !== 'lesson' && <span className="shrink-0 font-mono text-[11px] text-faint">{m.kind}</span>}
        <span className="shrink-0 font-mono text-[12px] text-faint tabular-nums">{hm(m.minutes)}</span>
      </button>
      {showDoneWhen && m.doneWhen && !done && <p className="mt-0.5 pl-[22px] text-[13px] text-faint">{m.doneWhen}</p>}
    </div>
  );
}
