'use client';

import { useState } from 'react';

import Glossed from '@/components/basics/Glossed';
import Prose from '@/components/Prose';
import Waiting from '@/components/Waiting';
import { aiError, basicsRewrite } from '@/lib/ai';
import { asCodeBlock } from '@/lib/basics';
import type { BasicLesson } from '@/types/navi';

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 font-mono text-[11px] tracking-[0.1em] text-faint">{title}</h3>
      {children}
    </section>
  );
}

/** A lesson in its fixed parts (PLAN-basics.md 2). Hard words can be tapped. "looks wrong" rewrites it. */
export default function LessonView({ conceptId, lesson }: { conceptId: string; lesson: BasicLesson }) {
  const g = lesson.glossary;
  const [wrong, setWrong] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <article className="space-y-5 text-[15px] leading-relaxed text-ink">
      <Part title="problem">
        <Glossed text={lesson.problem} glossary={g} />
      </Part>
      <Part title="how it works">
        <ol className="space-y-1.5">
          {lesson.how.map((h, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-[12px] text-faint">{i + 1}.</span>
              <Glossed text={h} glossary={g} className="min-w-0" />
            </li>
          ))}
        </ol>
      </Part>
      {lesson.picture && (
        <Part title="picture it">
          <Glossed text={lesson.picture} glossary={g} className="text-muted" />
        </Part>
      )}
      {lesson.seeIt && (
        <Part title="see it yourself">
          <Prose text={asCodeBlock(lesson.seeIt)} />
        </Part>
      )}
      {lesson.mistake && (
        <Part title="common mistake">
          <Glossed text={lesson.mistake} glossary={g} />
        </Part>
      )}
      {lesson.atWork && (
        <Part title="at work">
          <Glossed text={lesson.atWork} glossary={g} />
        </Part>
      )}
      <p className="flex flex-wrap items-baseline gap-x-4 font-mono text-[12px] text-faint">
        {lesson.readMore && <span>read more · {lesson.readMore}</span>}
        {busy ? (
          <Waiting word="rewriting" />
        ) : wrong === null ? (
          <button type="button" onClick={() => setWrong('')} className="hover:text-ink">
            looks wrong
          </button>
        ) : null}
      </p>
      {wrong !== null && !busy && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await basicsRewrite({ conceptId, note: wrong.trim() });
              setWrong(null);
            } catch (err) {
              setError(aiError(err));
            } finally {
              setBusy(false);
            }
          }}
          className="flex items-baseline gap-3"
        >
          <input
            autoFocus
            value={wrong}
            onChange={(e) => setWrong(e.target.value)}
            maxLength={300}
            placeholder="What looks wrong (optional)"
            className="min-w-0 flex-1 border-b border-line bg-transparent pb-1 text-[14px] text-ink placeholder:text-faint focus:border-line-strong"
          />
          <button type="submit" className="font-mono text-[12px] text-faint hover:text-ink">
            rewrite
          </button>
          <button type="button" onClick={() => setWrong(null)} className="font-mono text-[12px] text-faint hover:text-ink">
            cancel
          </button>
        </form>
      )}
      {error && <p className="text-[14px] text-muted">{error}</p>}
    </article>
  );
}
