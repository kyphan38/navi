import type { MilestoneDoc } from '@/lib/repo';

export type RouteStop = { m: MilestoneDoc; done: boolean; date: number | null; rough: boolean; checklist: string | null };

const dateFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

/** Splits a title into at most 2 lines of about `width` characters. */
function lines(text: string, width = 16): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(' ')) {
    if (cur && (cur + ' ' + w).length > width) {
      out.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out.length > 2 ? [out[0], `${out.slice(1).join(' ').slice(0, width - 1)}…`] : out;
}

function meta(s: RouteStop): string {
  if (s.done) return 'done';
  if (s.checklist) return s.checklist;
  return s.date ? `~${dateFmt.format(s.date)}${s.rough ? ' rough' : ''}` : '';
}

/**
 * The roadmap (PLAN-navi.md 9.1a). Wide: one line from associate to senior,
 * solid up to "you", dashed after. Narrow: the same stops as a vertical route.
 */
export default function MapRoute({ stops }: { stops: RouteStop[] }) {
  const youAt = stops.filter((s) => s.done).length; // stops before "you" are done
  const W = 640;
  const left = 40;
  const right = W - 40;
  const nodes = stops.length + 2; // you + stops + senior
  const x = (i: number) => left + ((right - left) * i) / (nodes - 1);
  // Order on the line: done stops, you, open stops, senior.
  const order = [...stops.filter((s) => s.done), null, ...stops.filter((s) => !s.done)];
  const youX = x(youAt);
  const y = 40;

  return (
    <>
      <svg viewBox={`0 0 ${W} 132`} className="hidden w-full sm:block" role="img" aria-label="Roadmap from associate to senior">
        <line x1={left - 30} y1={y} x2={youX} y2={y} stroke="var(--ink)" strokeWidth="1.5" />
        <line x1={youX} y1={y} x2={right + 30} y2={y} stroke="var(--line-strong)" strokeWidth="1.5" strokeDasharray="4 5" />
        <text x={left - 30} y={y - 14} fontSize="11" fill="var(--faint)" fontFamily="var(--font-mono)">associate</text>
        <text x={right + 30} y={y - 14} fontSize="11" fill="var(--faint)" fontFamily="var(--font-mono)" textAnchor="end">senior</text>
        {order.map((s, i) => {
          const cx = x(i);
          if (!s) {
            return (
              <g key="you">
                <circle cx={cx} cy={y} r="6" fill="var(--ink)" />
                <text x={cx} y={y + 24} fontSize="12" fill="var(--ink)" textAnchor="middle" fontFamily="var(--font-mono)">you</text>
              </g>
            );
          }
          return (
            <g key={s.m.id}>
              <circle cx={cx} cy={y} r="5" fill={s.done ? 'var(--ink)' : 'var(--bg)'} stroke={s.done ? 'var(--ink)' : 'var(--faint)'} strokeWidth="1.5" />
              {lines(s.m.title).map((l, j) => (
                <text key={j} x={cx} y={y + 24 + j * 15} fontSize="12" fill={s.done ? 'var(--faint)' : 'var(--ink)'} textAnchor="middle">
                  {l}
                </text>
              ))}
              <text x={cx} y={y + 24 + lines(s.m.title).length * 15 + 2} fontSize="11" fill="var(--faint)" textAnchor="middle" fontFamily="var(--font-mono)">
                {meta(s)}
              </text>
            </g>
          );
        })}
        <circle cx={right + 30} cy={y} r="3" fill="var(--faint)" />
      </svg>

      <ul className="route sm:hidden">
        <li className="relative py-1.5 pl-6 font-mono text-[12px] text-faint">
          <span className="route-dot" data-on aria-hidden />
          associate
        </li>
        {order.map((s) =>
          s ? (
            <li key={s.m.id} className="relative py-1.5 pl-6 text-[15px]">
              <span className="route-dot" data-on={s.done} aria-hidden />
              <span className={s.done ? 'text-faint' : 'text-ink'}>{s.m.title}</span>
              <span className="ml-2 font-mono text-[12px] text-faint">{meta(s)}</span>
            </li>
          ) : (
            <li key="you" className="relative py-1.5 pl-6 font-mono text-[12px] text-ink">
              <span className="route-dot" data-on style={{ width: 9, height: 9, marginTop: -4.5, left: -1 }} aria-hidden />
              you
            </li>
          ),
        )}
        <li className="relative py-1.5 pl-6 font-mono text-[12px] text-faint">
          <span className="route-dot" aria-hidden />
          senior
        </li>
      </ul>
    </>
  );
}
