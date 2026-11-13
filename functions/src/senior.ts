// "Ask a senior" (P6). Pure file: the root test suite imports it.

import { PLAIN_ENGLISH } from './style.ts';

/**
 * Signs of real company data in a question. The learner works at a bank:
 * internal names and numbers must never leave their machine. Returns what was found.
 */
export function findInternalData(text: string): string[] {
  const found: string[] = [];
  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(text)) found.push('an IP address');
  if (/arn:aws[a-z-]*:[a-z0-9-]*:[a-z0-9-]*:\d{12}:/i.test(text)) found.push('an ARN with an account id');
  else if (/(?<![\d.])\d{12}(?![\d.])/.test(text)) found.push('a 12-digit account id');
  if (/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/.test(text)) found.push('an access key');
  if (/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:internal|local|corp|lan|intra)\b/i.test(text)) found.push('an internal host name');
  if (/\bip-\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}\b/i.test(text)) found.push('a server host name');
  if (/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(text)) found.push('an email address');
  return found;
}

export type SeniorAnswer = {
  restate: string;
  questions: string[];
  impact: string;
  options: { name: string; pros: string; cons: string }[];
  recommend: string;
  tellWho: string;
  firstSteps: string[];
};

export const SENIOR_SCHEMA = {
  type: 'object',
  properties: {
    restate: { type: 'string' },
    questions: { type: 'array', items: { type: 'string' } },
    impact: { type: 'string' },
    options: {
      type: 'array',
      items: { type: 'object', properties: { name: { type: 'string' }, pros: { type: 'string' }, cons: { type: 'string' } }, required: ['name', 'pros', 'cons'] },
    },
    recommend: { type: 'string' },
    tellWho: { type: 'string' },
    firstSteps: { type: 'array', items: { type: 'string' } },
  },
  required: ['restate', 'questions', 'impact', 'options', 'recommend', 'tellWho', 'firstSteps'],
};

export function buildSeniorPrompt(question: string, role: string, years: number, context: string): string {
  return `${PLAIN_ENGLISH}

You are a kind senior engineer. A ${role} with ${years} years of experience, who works on a ${context},
asks you about a real problem at work. Show HOW a senior thinks, not only the answer.

Their problem:
"""
${question}
"""

Return JSON:
- "restate": the real problem in 1-2 sentences (often not what was asked first).
- "questions": 2-4 questions a senior would ask before acting.
- "impact": who and what is affected (customers, money, rules, the team) and how urgent, 2-3 sentences.
- "options": 2-3 options, each with "name", "pros", "cons" (one sentence each).
- "recommend": what you would do and why, 2-3 sentences.
- "tellWho": who to tell, when, and what to say in one line.
- "firstSteps": 3-5 small first steps for today.`;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown, max: number, len: number) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : []);

export function parseSenior(text: string): SeniorAnswer {
  const d = JSON.parse(text) as Record<string, unknown>;
  const restate = str(d.restate, 600);
  const recommend = str(d.recommend, 1000);
  if (!restate || !recommend) throw new Error('Missing parts');
  const options = Array.isArray(d.options)
    ? d.options
        .map((o) => {
          const r = (o ?? {}) as Record<string, unknown>;
          return { name: str(r.name, 200), pros: str(r.pros, 400), cons: str(r.cons, 400) };
        })
        .filter((o) => o.name)
        .slice(0, 3)
    : [];
  return {
    restate,
    questions: list(d.questions, 4, 300),
    impact: str(d.impact, 800),
    options,
    recommend,
    tellWho: str(d.tellWho, 500),
    firstSteps: list(d.firstSteps, 5, 300),
  };
}

export function fakeSenior(): string {
  return JSON.stringify({
    restate: 'The real problem is that releases wait on a slow manual review.',
    questions: ['How many releases wait each week?', 'Which part of the review takes longest?'],
    impact: 'Customers get fixes later. The team loses about a day each week.',
    options: [
      { name: 'Automate checks', pros: 'Fast and repeatable.', cons: 'Takes a week to build.' },
      { name: 'Add a second reviewer', pros: 'Quick to start.', cons: 'Costs people time.' },
    ],
    recommend: 'Automate the easy checks first, keep a human for risky changes.',
    tellWho: 'Tell your lead this week: "I can cut review time by half with two small changes."',
    firstSteps: ['Measure the wait time for 5 releases.', 'List the checks that are the same every time.', 'Draft one automated check.'],
  });
}
