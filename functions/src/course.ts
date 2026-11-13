// Course split (P3): pasted table of contents -> modules. Pure file: the root test suite imports it.

import { PLAIN_ENGLISH } from './style.ts';

export type ModuleKind = 'lesson' | 'demo' | 'quiz' | 'exam';
export type SplitModule = { section: string; title: string; minutes: number; kind: ModuleKind; doneWhen: string };

const KINDS: readonly ModuleKind[] = ['lesson', 'demo', 'quiz', 'exam'];

/** Max characters of pasted text, about 600 lessons. */
export const MAX_TOC = 80_000;
/** Chunk size per model call; long courses run in parallel parts. */
export const CHUNK = 10_000;

export const SPLIT_SCHEMA = {
  type: 'object',
  properties: {
    modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string' },
          title: { type: 'string' },
          minutes: { type: 'integer' },
          kind: { type: 'string', enum: [...KINDS] },
          doneWhen: { type: 'string' },
        },
        required: ['section', 'title', 'minutes', 'kind', 'doneWhen'],
      },
    },
  },
  required: ['modules'],
};

/**
 * Splits text at line breaks into parts of at most `size` chars. Each part also
 * gets the last 3 lines before it, so the model can tell which section it starts in.
 */
export function chunkToc(text: string, size = CHUNK): string[] {
  const lines = text.split('\n');
  const parts: string[] = [];
  let cur: string[] = [];
  let len = 0;
  for (const line of lines) {
    if (len + line.length + 1 > size && cur.length) {
      parts.push(cur.join('\n'));
      const tail = cur.slice(-3).map((l) => `(before) ${l}`);
      cur = [...tail];
      len = tail.join('\n').length;
    }
    cur.push(line);
    len += line.length + 1;
  }
  if (cur.some((l) => l.trim())) parts.push(cur.join('\n'));
  return parts;
}

export function buildSplitPrompt(toc: string, part: number, parts: number): string {
  return `${PLAIN_ENGLISH}

Below is ${parts > 1 ? `part ${part} of ${parts} of ` : ''}the table of contents of an online course, pasted by the learner.
Turn every lesson into one item, in the same order. Skip headers that are not lessons, ads and empty lines.
Lines marked "(before)" belong to the previous part: use them only to know the section, never as items.

Return JSON {"modules": [...]}. Each item:
- "section": the chapter or section the lesson belongs to. If this part starts in the middle of a section, use that section name.
- "title": the lesson title as written, without numbers or durations in front.
- "minutes": the duration in whole minutes if the text gives one (for example "12:34" = 13, "1h 5m" = 65). If not, guess: lesson 10, demo 20, quiz 10, exam 60.
- "kind": "demo" for hands-on lessons (DEMO, lab, hands-on), "quiz" for quizzes, "exam" for practice exams, else "lesson".
- "doneWhen": one small, checkable output that proves the learner understood it, 15 words or less.
  Examples: "Write 5 lines: when Deny wins over Allow." "Draw the VPC with 2 subnets." "Score 80% or more."

Table of contents:
${toc}`;
}

const int = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export function parseSplit(text: string): SplitModule[] {
  const d = JSON.parse(text) as { modules?: unknown };
  if (!Array.isArray(d.modules)) throw new Error('No modules');
  return d.modules
    .map((raw): SplitModule | null => {
      const r = (raw ?? {}) as Record<string, unknown>;
      const title = str(r.title, 300);
      if (!title) return null;
      const kind = KINDS.includes(r.kind as ModuleKind) ? (r.kind as ModuleKind) : 'lesson';
      return {
        section: str(r.section, 200) || 'Course',
        title,
        minutes: int(r.minutes, 1, 600, kind === 'demo' ? 20 : 10),
        kind,
        doneWhen: str(r.doneWhen, 200),
      };
    })
    .filter((m): m is SplitModule => m !== null);
}

/** Canned answer for the emulator without a key: one module per non-empty line. */
export function fakeSplit(toc: string): string {
  let section = 'Course';
  const modules: SplitModule[] = [];
  for (const line of toc.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('(before)'))) {
    if (/^(section|chapter|module)\b/i.test(line)) {
      section = line;
      continue;
    }
    const demo = /demo|lab/i.test(line);
    modules.push({ section, title: line, minutes: demo ? 20 : 10, kind: demo ? 'demo' : 'lesson', doneWhen: 'Write 3 lines about what you learned.' });
  }
  return JSON.stringify({ modules });
}
