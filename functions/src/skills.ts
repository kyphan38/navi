// Skill tagging and "Explain it back" (P4). Pure file: the root test suite imports it.

import { PLAIN_ENGLISH } from './style.ts';

export type SkillRef = { id: string; name: string };
export type TagItem = { id: string; text: string };
export type Turn = { question: string; answer?: string };

/** Questions in one "Explain it back" before it is graded. */
export const EXPLAIN_TURNS = 3;

export const TAG_SCHEMA = {
  type: 'object',
  properties: {
    tags: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } } },
        required: ['id', 'skills'],
      },
    },
  },
  required: ['tags'],
};

export function buildTagPrompt(items: TagItem[], skills: SkillRef[]): string {
  return `${PLAIN_ENGLISH}

Match each learning item to the skills it trains. Use only skill ids from this list:
${skills.map((s) => `- ${s.id}: ${s.name}`).join('\n')}

Items (id: text):
${items.map((i) => `- ${i.id}: ${i.text}`).join('\n')}

Return JSON {"tags": [...]} with one entry per item: "id" (the item id) and "skills" (0-3 skill ids, most related first).
Use an empty list when no skill fits, for example an intro or a course overview.`;
}

/** Item id -> known skill ids (max 3). Items the model skipped get []. */
export function parseTags(text: string, itemIds: string[], skillIds: Set<string>): Map<string, string[]> {
  const d = JSON.parse(text) as { tags?: unknown };
  if (!Array.isArray(d.tags)) throw new Error('No tags');
  const out = new Map(itemIds.map((id) => [id, [] as string[]]));
  for (const raw of d.tags) {
    const r = (raw ?? {}) as { id?: unknown; skills?: unknown };
    if (typeof r.id !== 'string' || !out.has(r.id)) continue;
    const ids = Array.isArray(r.skills) ? r.skills.filter((s): s is string => typeof s === 'string' && skillIds.has(s)) : [];
    out.set(r.id, [...new Set(ids)].slice(0, 3));
  }
  return out;
}

export const QUESTION_SCHEMA = { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] };
export const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    feedback: { type: 'string' },
    gaps: { type: 'array', items: { type: 'string' } },
  },
  required: ['pass', 'feedback', 'gaps'],
};

function talk(turns: Turn[]): string {
  return turns.map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer ?? '(no answer yet)'}`).join('\n\n');
}

export function buildQuestionPrompt(skill: string, context: string, turns: Turn[]): string {
  return `${PLAIN_ENGLISH}

Role play. You are a new junior engineer on a team that runs a ${context}.
A teammate will teach you "${skill}". Ask one honest question a junior would ask.
${turns.length ? `So far:\n${talk(turns)}\n\nAsk question ${turns.length + 1} of ${EXPLAIN_TURNS}. Build on their last answer: ask "why", "what if" or "how do I check it".` : `This is question 1 of ${EXPLAIN_TURNS}: ask what it is and why it matters for your system.`}
One or two short sentences. Return JSON {"question": "..."}.`;
}

export function buildGradePrompt(skill: string, context: string, turns: Turn[]): string {
  return `${PLAIN_ENGLISH}

A learner explained "${skill}" to a junior engineer on a ${context}. Here is the talk:

${talk(turns)}

Decide if the learner could teach this skill. Pass when the answers are correct, clear and practical,
with no big mistake. Small gaps are fine for a pass. Be strict about wrong facts.

Return JSON:
- "pass": true or false.
- "feedback": 2-4 short sentences to the learner: what was good, what to fix.
- "gaps": 0-3 short items, each one thing that was missing or wrong.`;
}

export function parseQuestion(text: string): string {
  const q = (JSON.parse(text) as { question?: unknown }).question;
  if (typeof q !== 'string' || !q.trim()) throw new Error('No question');
  return q.trim().slice(0, 500);
}

export function parseGrade(text: string): { pass: boolean; feedback: string; gaps: string[] } {
  const d = JSON.parse(text) as { pass?: unknown; feedback?: unknown; gaps?: unknown };
  if (typeof d.pass !== 'boolean' || typeof d.feedback !== 'string') throw new Error('Bad grade');
  const gaps = Array.isArray(d.gaps) ? d.gaps.filter((g): g is string => typeof g === 'string' && !!g.trim()).map((g) => g.trim().slice(0, 300)) : [];
  return { pass: d.pass, feedback: d.feedback.trim().slice(0, 1200), gaps: gaps.slice(0, 3) };
}

/** Learner turns: at most EXPLAIN_TURNS, every answered one non-empty and short. */
export function cleanTurns(raw: unknown): Turn[] {
  if (!Array.isArray(raw) || raw.length > EXPLAIN_TURNS) throw new Error('Bad turns');
  return raw.map((t) => {
    const r = (t ?? {}) as { question?: unknown; answer?: unknown };
    if (typeof r.question !== 'string' || !r.question.trim()) throw new Error('Bad question');
    const answer = typeof r.answer === 'string' ? r.answer.normalize('NFC').trim().slice(0, 3000) : undefined;
    return { question: r.question.slice(0, 500), ...(answer ? { answer } : {}) };
  });
}

// ---------------------------------------------------------------- fakes (emulator, no key)

export function fakeTags(items: TagItem[], skills: SkillRef[]): string {
  return JSON.stringify({ tags: items.map((i, n) => ({ id: i.id, skills: skills.length ? [skills[n % skills.length].id] : [] })) });
}
export function fakeQuestion(n: number): string {
  return JSON.stringify({ question: ['What is it, and why do we need it?', 'What happens if we get it wrong?', 'How do I check it is set up right?'][n] ?? 'Anything else?' });
}
export function fakeGrade(): string {
  return JSON.stringify({ pass: true, feedback: 'Clear and correct. You gave a real example.', gaps: [] });
}
