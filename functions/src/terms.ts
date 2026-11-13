// Term cards and term quizzes (P2). Pure file: the root test suite imports it.

import { PLAIN_ENGLISH } from './style.ts';

/** Fixed areas, so the Terms tab groups the same way every time. */
export const AREAS = [
  'Security',
  'Networking',
  'Reliability',
  'Cloud',
  'Payments',
  'Data',
  'Delivery',
  'AI',
  'Communication',
  'Other',
] as const;
export type Area = (typeof AREAS)[number];

export type TermCard = { name: string; area: Area; oneLine: string };
export type QuizQuestion = { question: string; options: string[]; answer: number; why: string };

/** Doc id for a term: lowercase words joined by '-', so "Connection pool" and "connection  pool" are one term. */
export function termId(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Term name as typed: trimmed, spaces collapsed, at most 120 chars. */
export function cleanTermName(raw: unknown): string {
  return typeof raw === 'string' ? raw.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 120) : '';
}

export const TERM_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    area: { type: 'string', enum: [...AREAS] },
    oneLine: { type: 'string' },
  },
  required: ['name', 'area', 'oneLine'],
};

/** How to write one term card; shared by termCard and drillFinish. */
export const TERM_CARD_RULES = `"name": the term as people usually write it (keep the case, like "IAM role" or "connection pool").
"area": one of ${AREAS.join(', ')}.
"oneLine": what it is, in one plain sentence of 20 words or less. No jargon inside the sentence.`;

export const CARDS_SCHEMA = { type: 'object', properties: { cards: { type: 'array', items: TERM_ITEM_SCHEMA } }, required: ['cards'] };

export function buildCardPrompt(names: string[], context: string): string {
  return `${PLAIN_ENGLISH}

Write a short card for each technical term below. The learner works on a ${context}.
Terms:
${names.map((n) => `- ${n}`).join('\n')}

Return JSON {"cards": [...]}, one card per term, same order. Each card:
${TERM_CARD_RULES}`;
}

/** One card from model output; null when it is not usable. */
export function parseCard(raw: unknown): TermCard | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const name = cleanTermName(r.name);
  const oneLine = typeof r.oneLine === 'string' ? r.oneLine.trim().slice(0, 400) : '';
  if (!name || !termId(name) || !oneLine) return null;
  const area = (AREAS as readonly string[]).includes(r.area as string) ? (r.area as Area) : 'Other';
  return { name, area, oneLine };
}

export function parseCards(text: string): TermCard[] {
  const d = JSON.parse(text) as { cards?: unknown };
  if (!Array.isArray(d.cards)) throw new Error('No cards');
  return d.cards.map(parseCard).filter((c): c is TermCard => c !== null);
}

export const QUIZ_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          answer: { type: 'integer' },
          why: { type: 'string' },
        },
        required: ['question', 'options', 'answer', 'why'],
      },
    },
  },
  required: ['questions'],
};

export function buildQuizPrompt(name: string, oneLine: string, context: string): string {
  return `${PLAIN_ENGLISH}

Write a quick quiz about the term "${name}" (${oneLine}). The learner works on a ${context}.

Return JSON {"questions": [...]} with exactly 3 questions:
1. What it is.
2. When or why to use it, in a real situation from ${context}.
3. A common mistake or a risk.
Each question: "question" (1-2 short sentences), "options" (4 short options, only one correct,
wrong ones must look sensible), "answer" (index 0-3 of the correct option), "why" (1-2 sentences:
why the answer is right).
Put the correct answer at a different index in each question.`;
}

export function parseQuiz(text: string): QuizQuestion[] {
  const d = JSON.parse(text) as { questions?: unknown };
  if (!Array.isArray(d.questions)) throw new Error('No questions');
  const out = d.questions
    .map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      const options = Array.isArray(r.options) ? r.options.map((o) => (typeof o === 'string' ? o.trim().slice(0, 300) : '')).filter(Boolean) : [];
      const answer = typeof r.answer === 'number' ? r.answer : -1;
      const question = typeof r.question === 'string' ? r.question.trim().slice(0, 600) : '';
      if (!question || options.length < 2 || answer < 0 || answer >= options.length) return null;
      return { question, options: options.slice(0, 4), answer, why: typeof r.why === 'string' ? r.why.trim().slice(0, 600) : '' };
    })
    .filter((q): q is QuizQuestion => q !== null && q.answer < q.options.length)
    .slice(0, 3);
  if (!out.length) throw new Error('No usable questions');
  return out;
}

// ---------------------------------------------------------------- fakes (emulator, no key)

export function fakeCards(names: string[]): string {
  return JSON.stringify({ cards: names.map((name) => ({ name, area: 'Reliability', oneLine: `A short plain meaning of ${name}.` })) });
}

export function fakeQuiz(name: string): string {
  const q = (question: string, answer: number) => ({
    question,
    options: ['A safe first step', 'A risky shortcut', 'Something unrelated', 'A slow manual fix'],
    answer,
    why: 'The safe step keeps payments working while you learn more.',
  });
  return JSON.stringify({ questions: [q(`What is ${name}?`, 0), q(`When do you use ${name}?`, 2), q(`What is a common mistake with ${name}?`, 1)] });
}
