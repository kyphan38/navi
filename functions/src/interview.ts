// Mock interview (V1): troubleshooting, system design, behavioral.
// 5 main questions, each with at most one follow-up; feedback at the end.
// Pure file: the root test suite imports it.

import { PLAIN_ENGLISH, SAFE_DATA } from './style.ts';
import type { Learner, Story } from './career.ts';

export const INTERVIEW_KINDS = ['troubleshooting', 'design', 'behavioral'] as const;
export type InterviewKind = (typeof INTERVIEW_KINDS)[number];
export const MAIN_QUESTIONS = 5;

export type Turn = { q: string; a: string | null; followUp: boolean };
export type QuestionFeedback = { score: number; note: string; better: string };
export type Feedback = { overall: string; questions: QuestionFeedback[]; practise: string[] };

export const isKind = (v: unknown): v is InterviewKind => typeof v === 'string' && (INTERVIEW_KINDS as readonly string[]).includes(v);

export const mainCount = (turns: Turn[]) => turns.filter((t) => !t.followUp).length;

/** True when the last main question has been answered (with its follow-up, if any). */
export function interviewOver(turns: Turn[]): boolean {
  return mainCount(turns) >= MAIN_QUESTIONS && turns.every((t) => t.a !== null);
}

/** A follow-up may come only right after an answered main question. */
export function followUpAllowed(turns: Turn[]): boolean {
  const last = turns[turns.length - 1];
  return !!last && !last.followUp && last.a !== null;
}

const KIND_TEXT: Record<InterviewKind, string> = {
  troubleshooting:
    'Troubleshooting: give a short production problem (symptom, a few numbers) and ask how they would find and fix it. Probe for order of checks, safety and who to tell. Sometimes use an SRE angle: an SLO burning fast, a noisy alert, a retry storm.',
  design:
    'System design for infrastructure: ask them to design or change part of a system (for example, a payment API across two regions, a CI/CD pipeline, secrets handling, SLOs and alerts for a service, a safe release process). Probe for trade-offs, failure modes, security and cost.',
  behavioral:
    'Behavioral: ask "Tell me about a time when..." questions (conflict, a mistake, pressure, saying no, learning fast). Expect STAR answers: situation, task, action, result.',
};

function transcript(turns: Turn[]): string {
  return turns.map((t, i) => `${t.followUp ? 'Follow-up' : `Q${turns.slice(0, i + 1).filter((x) => !x.followUp).length}`}: ${t.q}\nAnswer: ${t.a ?? '(none yet)'}`).join('\n\n');
}

function storiesText(stories: Story[]): string {
  if (stories.length === 0) return '';
  return `\nThe learner's saved STAR stories (titles and one line each):\n${stories.map((s) => `- ${s.title}: ${s.situation}`).join('\n')}\n`;
}

export const TURN_SCHEMA = {
  type: 'object',
  properties: { question: { type: 'string' }, followUp: { type: 'boolean' } },
  required: ['question', 'followUp'],
};

export function buildTurnPrompt(p: Learner, kind: InterviewKind, turns: Turn[], stories: Story[]): string {
  const asked = mainCount(turns);
  const canFollow = followUpAllowed(turns);
  return `${PLAIN_ENGLISH}
${SAFE_DATA}

You are a fair, friendly interviewer for a ${p.role} role (mid to senior) at a bank. The candidate has ${p.years} years of experience on a ${p.context}.
${KIND_TEXT[kind]}
${kind === 'behavioral' ? storiesText(stories) : ''}
Main questions asked so far: ${asked} of ${MAIN_QUESTIONS}.
${turns.length ? `Interview so far:\n${transcript(turns)}\n` : 'This is the first question.'}

Write the next question. ${
    canFollow
      ? 'If the last answer was vague, missed something important or begs a deeper question, ask ONE short follow-up and set "followUp": true. Otherwise ask the next main question with "followUp": false.'
      : 'Ask the next main question with "followUp": false.'
  }
Keep each question to 1-3 sentences. Do not repeat earlier questions. Do not give feedback yet.

Return JSON: "question", "followUp".`;
}

export function parseTurn(text: string, turns: Turn[]): { question: string; followUp: boolean } {
  const d = JSON.parse(text) as Record<string, unknown>;
  const question = typeof d.question === 'string' ? d.question.trim().slice(0, 1200) : '';
  if (!question) throw new Error('No question');
  return { question, followUp: d.followUp === true && followUpAllowed(turns) };
}

export const FEEDBACK_SCHEMA = {
  type: 'object',
  properties: {
    overall: { type: 'string' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { score: { type: 'integer' }, note: { type: 'string' }, better: { type: 'string' } },
        required: ['score', 'note', 'better'],
      },
    },
    practise: { type: 'array', items: { type: 'string' } },
  },
  required: ['overall', 'questions', 'practise'],
};

export function buildFeedbackPrompt(p: Learner, kind: InterviewKind, turns: Turn[], stories: Story[]): string {
  return `${PLAIN_ENGLISH}

You interviewed a ${p.role} (${p.years} years, ${p.context}) for a mid to senior role at a bank.
${KIND_TEXT[kind]}
${kind === 'behavioral' ? storiesText(stories) : ''}
The interview:
${transcript(turns)}

Give honest, kind feedback. For each MAIN question (${MAIN_QUESTIONS}, in order; count its follow-up with it):
- "score": 0-3 (0 missing, 1 weak, 2 good, 3 strong).
- "note": one sentence on what was good or missing.
- "better": a better answer in 3-6 short sentences${kind === 'behavioral' ? ', in STAR form; name a saved story that fits if there is one' : ''}.
Then "overall": 2-3 sentences, and "practise": 2-3 concrete things to practise next.

Return JSON: "overall", "questions", "practise".`;
}

export function parseFeedback(text: string): Feedback {
  const d = JSON.parse(text) as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const questions = (Array.isArray(d.questions) ? d.questions : [])
    .map((q) => {
      const r = (q ?? {}) as Record<string, unknown>;
      const score = Number.isInteger(r.score) ? Math.min(3, Math.max(0, r.score as number)) : 0;
      return { score, note: s(r.note, 500), better: s(r.better, 2000) };
    })
    .slice(0, MAIN_QUESTIONS);
  const overall = s(d.overall, 1000);
  if (!overall || questions.length === 0) throw new Error('Missing feedback');
  const practise = (Array.isArray(d.practise) ? d.practise : []).map((x) => s(x, 300)).filter(Boolean).slice(0, 3);
  return { overall, questions, practise };
}

export const fakeTurn = (turns: Turn[]) =>
  JSON.stringify({ question: `Question ${mainCount(turns) + 1}: an API returns 5xx for 2% of calls. What do you check first?`, followUp: false });

export const fakeFeedback = () =>
  JSON.stringify({
    overall: 'Clear and calm answers. Say the impact earlier.',
    questions: Array.from({ length: MAIN_QUESTIONS }, () => ({ score: 2, note: 'Good order of checks.', better: 'Check the error rate by endpoint first, then recent changes.' })),
    practise: ['Say who is affected in the first sentence.', 'Name one metric for each step.'],
  });
