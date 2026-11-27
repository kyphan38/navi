// Basics (PLAN-basics.md 2-3): prompts, schemas and parsers for lessons and questions.
// Pure file: the root test suite imports it.

import { PLAIN_ENGLISH } from '../style.ts';
import type { Concept } from './catalog.ts';

export type Kind = 'predict' | 'myth';
export type Gloss = { term: string; meaning: string };
export type Question = {
  kind: Kind;
  prompt: string;
  options: string[];
  answer: number;
  why: string[];
  rule: string;
  seeIt: string;
  glossary: Gloss[];
  setup: string;
};
export type Lesson = {
  problem: string;
  how: string[];
  picture: string;
  seeIt: string;
  mistake: string;
  atWork: string;
  readMore: string;
  glossary: Gloss[];
  check: Question;
};

const GLOSS = { type: 'array', items: { type: 'object', properties: { term: { type: 'string' }, meaning: { type: 'string' } }, required: ['term', 'meaning'] } };
const QUESTION = {
  type: 'object',
  properties: {
    prompt: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    answer: { type: 'integer' },
    why: { type: 'array', items: { type: 'string' } },
    rule: { type: 'string' },
    seeIt: { type: 'string' },
    glossary: GLOSS,
    setup: { type: 'string' },
  },
  required: ['prompt', 'options', 'answer', 'why', 'rule', 'seeIt', 'glossary', 'setup'],
};
export const QUESTION_SCHEMA = QUESTION;
export const LESSON_SCHEMA = {
  type: 'object',
  properties: {
    problem: { type: 'string' },
    how: { type: 'array', items: { type: 'string' } },
    picture: { type: 'string' },
    seeIt: { type: 'string' },
    mistake: { type: 'string' },
    atWork: { type: 'string' },
    readMore: { type: 'string' },
    glossary: GLOSS,
    check: QUESTION,
  },
  required: ['problem', 'how', 'picture', 'seeIt', 'mistake', 'atWork', 'readMore', 'glossary', 'check'],
};

/** Rules every question follows (PLAN-basics.md 3). Tests check they are in the prompts. */
export const QUESTION_RULES = `Question rules:
- The prompt is at most 35 words, in simple English.
- Use only technical words from this concept and the ones the learner already knows (listed). Every other hard word
  must be in "glossary" with a one-sentence meaning (at most 5; common words never go there).
- Avoid flag names and product names unless the concept is about them.
- Wrong options must be things a junior engineer would really think, not silly ones.
- "why": exactly 3 short lines, a cause-and-effect chain. "rule": one rule of thumb. "seeIt": one command to see it on Linux.
- "setup": 2-3 sentences of background so someone who does not understand the prompt can answer it.`;

function kindText(kind: Kind): string {
  return kind === 'predict'
    ? 'Kind "predict": a short real situation, then "What happens first?" (or next). 4 options, exactly one right. "answer" is its index (0-3).'
    : 'Kind "myth": 3 statements about the concept that all sound right; exactly one is subtly wrong. The prompt asks "Which one is wrong?". "options" are the 3 statements, "answer" is the index of the wrong one (0-2).';
}

function levelText(level: 1 | 2 | 3): string {
  if (level === 1) return 'Level 1 (easy): ask only what the lesson teaches, in its own words.';
  if (level === 2) return 'Level 2: a real situation at work; one step of thinking.';
  return 'Level 3: a real situation with one misleading detail; it may link to a concept the learner already knows.';
}

const known = (names: string[]) => (names.length ? names.join(', ') : 'nothing yet');

export function buildLessonPrompt(c: Concept, knownNames: string[], role: string, note = ''): string {
  return `${PLAIN_ENGLISH}

You teach computer and network foundations to a ${role} whose basics are still weak. They read this on a phone at lunch.
Teach one concept so it is really understood, not only named. Be correct: this is a foundation they will build on.
Concept: ${c.name}.
What the lesson must make clear: ${c.focus}
The learner already knows: ${known(knownNames)}. Do not use other technical words without explaining them.
${note ? `The last version had a problem the learner noted: "${note}". Fix it.\n` : ''}
Return JSON:
- "problem": 2-3 sentences: what problem this solves, why it exists.
- "how": 4-6 short steps, in order, like a diagram in words.
- "picture": 1-2 sentences: an everyday comparison that makes it click.
- "seeIt": ONLY a fenced code block, nothing outside it. Inside: 1-2 commands to try on Linux or macOS, each on its
  own line starting with "$ ", then a short sample output. Put the opening and closing \`\`\` on their own lines.
- "mistake": 1-2 sentences: a common wrong belief and the truth.
- "atWork": 1-2 sentences: where a DevOps engineer meets this (an incident, a config, a review).
- "readMore": one trusted source by name and chapter or section (for example "OSTEP, chapter 13" or "man 7 signal"). No URL.
- "glossary": at most 6 truly hard words in the lesson that are NOT already explained in brackets, each with a
  one-sentence meaning. Common words (program, memory, computer) never go here.
- "check": one question right after the lesson. ${kindText('predict')} ${levelText(1)}

${QUESTION_RULES}`;
}

export function buildQuestionPrompt(c: Concept, kind: Kind, level: 1 | 2 | 3, knownNames: string[], role: string): string {
  return `${PLAIN_ENGLISH}

You write one review question for a ${role} who learned this concept some days ago. It must check real understanding,
not memory of the lesson words. Be correct.
Concept: ${c.name}. What matters: ${c.focus}
The learner already knows: ${known(knownNames)}.
${kindText(kind)}
${levelText(level)}

Return JSON: "prompt", "options", "answer", "why", "rule", "seeIt", "glossary", "setup".

${QUESTION_RULES}`;
}

// ---------------------------------------------------------------- parsers

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown, max: number, len: number) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : []);
function need(s: string, name: string): string {
  if (!s) throw new Error(`Missing ${name}`);
  return s;
}

function parseGloss(v: unknown): Gloss[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  return v
    .map((g) => (g ?? {}) as Record<string, unknown>)
    .map((g) => ({ term: str(g.term, 60), meaning: str(g.meaning, 300) }))
    .filter((g) => g.term && g.meaning && !seen.has(g.term.toLowerCase()) && (seen.add(g.term.toLowerCase()), true))
    .slice(0, 12);
}

export function parseQuestionData(raw: unknown, kind: Kind): Question {
  const d = (raw ?? {}) as Record<string, unknown>;
  const options = list(d.options, kind === 'predict' ? 4 : 3, 300);
  const want = kind === 'predict' ? 4 : 3;
  if (options.length !== want) throw new Error(`Need ${want} options`);
  const answer = typeof d.answer === 'number' && Number.isInteger(d.answer) ? d.answer : -1;
  if (answer < 0 || answer >= options.length) throw new Error('Bad answer index');
  const why = list(d.why, 4, 300);
  if (why.length < 2) throw new Error('Missing why');
  return {
    kind,
    prompt: need(str(d.prompt, 600), 'prompt'),
    options,
    answer,
    why,
    rule: str(d.rule, 300),
    seeIt: str(d.seeIt, 600),
    glossary: parseGloss(d.glossary),
    setup: need(str(d.setup, 800), 'setup'),
  };
}

export function parseQuestion(text: string, kind: Kind): Question {
  return parseQuestionData(JSON.parse(text), kind);
}

export function parseLesson(text: string): Lesson {
  const d = JSON.parse(text) as Record<string, unknown>;
  const how = list(d.how, 8, 400);
  if (how.length < 3) throw new Error('Missing steps');
  return {
    problem: need(str(d.problem, 800), 'problem'),
    how,
    picture: str(d.picture, 500),
    seeIt: str(d.seeIt, 1200),
    mistake: str(d.mistake, 500),
    atWork: str(d.atWork, 500),
    readMore: str(d.readMore, 200),
    glossary: parseGloss(d.glossary),
    check: parseQuestionData(d.check, 'predict'),
  };
}

// ---------------------------------------------------------------- fakes (emulator without a key)

const fakeQ = (kind: Kind, name: string): Question & Record<string, unknown> => ({
  kind,
  prompt:
    kind === 'predict'
      ? `A service starts using ${name} in a wrong way under heavy load. What happens first?`
      : `Which statement about ${name} is wrong?`,
  options: kind === 'predict' ? ['It slows down a little', 'The kernel steps in and stops it', 'Nothing changes', 'The disk fills up'] : ['Statement A is true', 'Statement B sounds right but is wrong', 'Statement C is true'],
  answer: 1,
  why: ['First this happens.', 'Because of that, the next thing breaks.', 'So you see this symptom.'],
  rule: 'Check the limits before you raise the load.',
  seeIt: 'ps aux | head',
  glossary: [{ term: 'kernel', meaning: 'The core of the operating system that controls the hardware.' }],
  setup: 'Programs ask the operating system for resources. When a limit is reached, the system acts.',
});

export function fakeLesson(name: string): string {
  return JSON.stringify({
    problem: `${name} exists because programs need a safe way to share one computer.`,
    how: ['Step one happens.', 'Then the kernel does step two.', 'Then the program sees the result.', 'At the end, the resource is freed.'],
    picture: 'It is like a ticket number at a counter.',
    seeIt: '```\nps -ef | head -3\nUID  PID  PPID CMD\nroot   1     0 /sbin/init\n```',
    mistake: 'Many people think it is free. It is not: it has a cost.',
    atWork: 'You meet it when a pod restarts with exit code 137.',
    readMore: 'OSTEP, chapter 4',
    glossary: [{ term: 'kernel', meaning: 'The core of the operating system that controls the hardware.' }],
    check: fakeQ('predict', name),
  });
}

export function fakeQuestion(kind: Kind, name: string): string {
  return JSON.stringify(fakeQ(kind, name));
}
