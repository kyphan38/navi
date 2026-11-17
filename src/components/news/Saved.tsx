'use client';

import { useState } from 'react';

import { deleteSaved, markSavedRead, saveNews, type SavedDoc } from '@/lib/repo-career';
import type { NewsItem } from '@/types/navi';

/** "save" under a news item (V8): one optional line on what to take from it, then keep. */
export function SaveItem({ uid, item, saved }: { uid: string; item: NewsItem; saved: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  if (saved) return <span className="font-mono text-[11px] text-faint">saved</span>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="font-mono text-[11px] text-faint transition-colors hover:text-ink">
        save
      </button>
    );
  }
  const keep = () => {
    saveNews(uid, { title: item.title, url: item.url, source: item.source, why: item.why, note: note.trim().slice(0, 300) });
    setOpen(false);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        keep();
      }}
      className="mt-1 flex items-baseline gap-3"
    >
      <input
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="What you take from it (optional)"
        className="min-w-0 flex-1 border-b border-line bg-transparent pb-1 text-[14px] text-ink outline-none focus:border-line-strong"
      />
      <button type="submit" className="text-[14px] text-faint hover:text-ink">
        keep
      </button>
    </form>
  );
}

/** Saved news at the top of the news page, unread first. */
export function SavedList({ uid, items }: { uid: string; items: SavedDoc[] }) {
  const [showRead, setShowRead] = useState(false);
  if (items.length === 0) return null;
  const unread = items.filter((i) => i.readAt === null);
  const read = items.filter((i) => i.readAt !== null);
  const shown = showRead ? [...unread, ...read] : unread;
  return (
    <section className="mt-8 text-[15px]">
      <h2 className="mb-3 flex items-baseline gap-3 font-mono text-[12px] tracking-[0.12em] text-faint">
        saved
        {read.length > 0 && (
          <button type="button" onClick={() => setShowRead(!showRead)} className="tracking-normal hover:text-ink">
            {showRead ? 'hide read' : `${read.length} read`}
          </button>
        )}
      </h2>
      {shown.length === 0 && <p className="text-[14px] text-muted">All read.</p>}
      <ul className="space-y-4">
        {shown.map((i) => (
          <li key={i.id}>
            <p className="leading-snug">
              <a href={i.url} target="_blank" rel="noopener noreferrer" className={`${i.readAt ? 'text-muted' : 'text-ink'} transition-colors hover:text-muted`}>
                {i.title}
              </a>
              {i.source && <span className="ml-2 font-mono text-[11px] text-faint">{i.source}</span>}
            </p>
            {i.note && <p className="mt-0.5 text-[14px] text-ink">{i.note}</p>}
            <p className="mt-1 flex gap-4 font-mono text-[11px] text-faint">
              <button type="button" onClick={() => markSavedRead(uid, i.id, i.readAt === null)} className="hover:text-ink">
                {i.readAt === null ? 'read' : 'unread'}
              </button>
              <button type="button" onClick={() => deleteSaved(uid, i.id)} className="hover:text-ink">
                remove
              </button>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
