import type { SaveCtx } from '@/components/NewsView';
import { SaveItem } from '@/components/news/Saved';
import type { Community as CommunityData } from '@/types/navi';

const link = 'text-ink transition-colors hover:text-muted';
const meta = 'font-mono text-[11px] text-faint';
const label = 'mb-1.5 font-mono text-[11px] text-faint';

/**
 * Titles and links from Hacker News, Lobsters, daily.dev, three engineering news
 * feeds and new GitHub repos (no AI, so no "why" line). The score opens the
 * discussion: the comments are often the best part. Each link can be saved.
 */
export default function Community({ c, save }: { c: CommunityData; save: SaveCtx }) {
  if (!c.threads.length && !c.headlines.length && !c.repos.length) return null;
  return (
    <section>
      <h2 className="mb-3 font-mono text-[12px] tracking-[0.12em] text-faint">community</h2>
      {c.threads.length > 0 && <p className={label}>discussed this week</p>}
      <ul className="space-y-2.5">
        {c.threads.map((t) => (
          <li key={t.url} className="leading-snug">
            <a href={t.url} target="_blank" rel="noopener noreferrer" className={link}>
              {t.title}
            </a>
            {t.discuss ? (
              <a href={t.discuss} target="_blank" rel="noopener noreferrer" className={`ml-2 ${meta} hover:text-ink`}>
                {t.where} {t.score}
              </a>
            ) : (
              <span className={`ml-2 ${meta}`}>
                {t.where} {t.score}
              </span>
            )}
            <span className="ml-3">
              <SaveItem uid={save.uid} item={{ title: t.title, url: t.url, source: t.where, group: 'outside', why: '' }} saved={save.savedUrls.has(t.url)} />
            </span>
          </li>
        ))}
      </ul>
      {c.headlines.length > 0 && <p className={`mt-5 ${label}`}>engineering news</p>}
      <ul className="space-y-2.5">
        {c.headlines.map((h) => (
          <li key={h.url} className="leading-snug">
            <a href={h.url} target="_blank" rel="noopener noreferrer" className={link}>
              {h.title}
            </a>
            <span className={`ml-2 ${meta}`}>{h.site}</span>
            <span className="ml-3">
              <SaveItem uid={save.uid} item={{ title: h.title, url: h.url, source: h.site, group: 'outside', why: '' }} saved={save.savedUrls.has(h.url)} />
            </span>
          </li>
        ))}
      </ul>
      {c.repos.length > 0 && <p className={`mt-5 ${label}`}>new repos</p>}
      {c.repos.length > 0 && (
        <ul className="space-y-2">
          {c.repos.map((r) => (
            <li key={r.url} className="leading-snug">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className={`font-mono text-[14px] ${link}`}>
                {r.name}
              </a>
              <span className={`ml-2 ${meta}`}>{r.stars} stars</span>
              {r.description && <p className="mt-0.5 text-[14px] text-muted">{r.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
