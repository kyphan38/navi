// Prompts, JSON schemas and parsers for the three drill calls.
// Pure file (no Firebase): the root test suite imports it.

import { PLAIN_ENGLISH, SAFE_DATA } from '../style.ts';
import { CRITERIA, DRILLS, ROUNDS, kindRule, type AnswerKind, type Criterion, type DrillLevel, type DrillType } from './catalog.ts';

export type Profile = { role: string; years: number; context: string; focus: string };

export type Round = { prompt: string; kind: AnswerKind; options: string[]; hint: string; answer?: string; reveal?: string };

/** Hidden answer, stored in drillKeys. */
export type DrillKey = { truth: string; seniorPath: string; rubric: string; outline: string[] };

export type StartResult = DrillKey & { topic: string; clock: string; brief: string; round: Round };
export type AnswerResult = { reveal: string; round: Round };
export type Scores = Record<Criterion, number | null>;
export type FinishResult = {
  scores: Scores;
  debrief: string;
  seniorPath: string;
  whatIf: { question: string; answer: string }[];
  mistakes: { text: string; lesson: string }[];
  newTerms: string[];
};

const KINDS: readonly AnswerKind[] = ['choice', 'text', 'order', 'command', 'message'];

const ROUND_SCHEMA = {
  type: 'object',
  properties: {
    prompt: { type: 'string' },
    kind: { type: 'string', enum: KINDS },
    options: { type: 'array', items: { type: 'string' } },
    hint: { type: 'string' },
  },
  required: ['prompt', 'kind', 'options', 'hint'],
};

export const START_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    clock: { type: 'string' },
    brief: { type: 'string' },
    truth: { type: 'string' },
    seniorPath: { type: 'string' },
    rubric: { type: 'string' },
    outline: { type: 'array', items: { type: 'string' } },
    round: ROUND_SCHEMA,
  },
  required: ['topic', 'clock', 'brief', 'truth', 'seniorPath', 'rubric', 'outline', 'round'],
};

export const ANSWER_SCHEMA = {
  type: 'object',
  properties: { reveal: { type: 'string' }, round: ROUND_SCHEMA },
  required: ['reveal', 'round'],
};

const SCORE = { type: 'integer', minimum: -1, maximum: 3 };
export const FINISH_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: Object.fromEntries(CRITERIA.map((c) => [c, SCORE])),
      required: [...CRITERIA],
    },
    debrief: { type: 'string' },
    seniorPath: { type: 'string' },
    whatIf: {
      type: 'array',
      items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } }, required: ['question', 'answer'] },
    },
    mistakes: {
      type: 'array',
      items: { type: 'object', properties: { text: { type: 'string' }, lesson: { type: 'string' } }, required: ['text', 'lesson'] },
    },
    newTerms: { type: 'array', items: { type: 'string' } },
  },
  required: ['scores', 'debrief', 'seniorPath', 'whatIf', 'mistakes', 'newTerms'],
};

function aboutLearner(p: Profile): string {
  return `The learner is a ${p.role} with ${p.years} years of experience. They work on a ${p.context}. Their focus: ${p.focus}.`;
}

function roundRules(level: DrillLevel): string {
  return `Round rules:
- "prompt": what happens now and the question. 1-4 short sentences. Code goes in a fenced block.
- "kind": one of choice, text, order, command, message.
  choice = pick one option. order = rank the options. command = write a CLI command or query. message = write a short message to people.
- "options": 4 options for choice, 4-5 items for order, else [].
  Make wrong options look sensible (things a junior might really do). Do not mark the best one.
- ${kindRule(level)}`;
}

export function buildStartPrompt(p: Profile, type: DrillType, level: DrillLevel, topic: string): string {
  const spec = DRILLS[type];
  return `${PLAIN_ENGLISH}
${SAFE_DATA}

You run a practice drill that trains a junior engineer to think like a senior engineer.
${aboutLearner(p)}

Drill type: ${type}. ${spec.brief}
Level: ${level}. Total rounds: ${ROUNDS[level]}.
Topic: ${topic}.

First decide the hidden story, then write round 1. The learner never sees the hidden parts.

Return JSON:
- "topic": a short name for the topic (2-5 words).
- "clock": the start time of the drill as HH:MM (24h), for example "02:04".
- "brief": what the learner sees first. 3-6 short sentences: the context, the alert or the snippet, a few numbers.
- "truth": HIDDEN. The real cause and how the story moves forward, step by step. Every later round must match it.
- "seniorPath": HIDDEN. The steps a good senior engineer takes, in order, with one short reason each.
- "rubric": HIDDEN. For each of ${spec.criteria.join(', ')}: what a full score needs.
- "outline": HIDDEN. ${ROUNDS[level]} short lines, one per round: what the round asks and its kind.
- "round": round 1.

${roundRules(level)}`;
}

function transcript(brief: string, rounds: Round[]): string {
  return [
    `Brief: ${brief}`,
    ...rounds.map(
      (r, i) =>
        `Round ${i + 1} (${r.kind}): ${r.prompt}${r.options.length ? `\nOptions: ${r.options.map((o, j) => `${j + 1}. ${o}`).join(' | ')}` : ''}\nLearner: ${r.answer ?? '(no answer)'}${r.reveal ? `\nThen: ${r.reveal}` : ''}`,
    ),
  ].join('\n\n');
}

export function buildAnswerPrompt(p: Profile, type: DrillType, level: DrillLevel, brief: string, key: DrillKey, rounds: Round[]): string {
  const next = rounds.length + 1;
  return `${PLAIN_ENGLISH}
${SAFE_DATA}

You run a practice drill (${type}, level ${level}). ${aboutLearner(p)}

HIDDEN story (never say it out loud): ${key.truth}
HIDDEN round plan: ${key.outline.map((o, i) => `${i + 1}. ${o}`).join(' ')}

So far:
${transcript(brief, rounds)}

The learner just answered round ${rounds.length}. Return JSON:
- "reveal": what happens because of their answer, 1-3 short sentences. Stay true to the hidden story.
  If the answer was risky, show the real effect. Do not grade it and do not give the cause away.
  Only show the result of what the learner did. Never take a new action for them (no "You roll back...").
  The next round asks them what to do.
- "round": round ${next} of ${ROUNDS[level]}, following the plan but reacting to what the learner did.

${roundRules(level)}`;
}

export function buildFinishPrompt(p: Profile, type: DrillType, level: DrillLevel, brief: string, key: DrillKey, rounds: Round[]): string {
  const used = DRILLS[type].criteria;
  const unused = CRITERIA.filter((c) => !(used as readonly Criterion[]).includes(c));
  return `${PLAIN_ENGLISH}

You coach a junior engineer after a practice drill (${type}, level ${level}). ${aboutLearner(p)}
Be kind but honest. Praise what was good, then say clearly what to fix.

HIDDEN story: ${key.truth}
Senior path: ${key.seniorPath}
Rubric: ${key.rubric}

The drill:
${transcript(brief, rounds)}

Return JSON:
- "scores": 0-3 for each of ${used.join(', ')}. 0 = missed, 1 = weak, 2 = good, 3 = like a senior.${unused.length ? ` Use -1 for ${unused.join(', ')} (not used in this drill).` : ''}
  triage = thought about customer impact and how bad it is first.
  hypothesis = made guesses about the cause and checked them, did not guess at random.
  safety = avoided risky steps; for payments, checked for double charges or lost transactions.
  comms = told the right people at the right time, clearly.
  prevention = suggested how to stop it from happening again.
- "debrief": 4-8 short sentences. Start with the real cause in one sentence. Then what went well, then the most important thing to fix.
- "seniorPath": the senior steps as a numbered list, one line each, with a short reason.
- "whatIf": 2 items. A "What if...?" twist on this drill and a short answer (2-3 sentences).
- "mistakes": 0-3 items. Each: "text" = what the learner did wrong (1 sentence), "lesson" = what to do instead (1 sentence).
- "newTerms": 2-6 technical terms from this drill that are worth learning (just the term, like "connection pool").`;
}

// ------------------------------------------------------------------ parsers

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function need(v: string, what: string): string {
  if (!v) throw new Error(`Missing ${what}`);
  return v;
}

export function parseRound(raw: unknown): Round {
  const r = (raw ?? {}) as Record<string, unknown>;
  const kind = KINDS.includes(r.kind as AnswerKind) ? (r.kind as AnswerKind) : 'text';
  const options = Array.isArray(r.options) ? r.options.map((o) => str(o, 400)).filter(Boolean).slice(0, 6) : [];
  // A choice or order round with too few options cannot be answered; ask for free text instead.
  const fixedKind = (kind === 'choice' || kind === 'order') && options.length < 2 ? 'text' : kind;
  return {
    prompt: need(str(r.prompt, 4000), 'round prompt'),
    kind: fixedKind,
    options: fixedKind === 'choice' || fixedKind === 'order' ? options : [],
    hint: str(r.hint, 400),
  };
}

function parseJson(text: string): Record<string, unknown> {
  const v = JSON.parse(text) as unknown;
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Not an object');
  return v as Record<string, unknown>;
}

export function parseStart(text: string): StartResult {
  const d = parseJson(text);
  const clock = str(d.clock, 5);
  return {
    topic: need(str(d.topic, 200), 'topic'),
    clock: /^([01]\d|2[0-3]):[0-5]\d$/.test(clock) ? clock : '09:00',
    brief: need(str(d.brief, 8000), 'brief'),
    truth: need(str(d.truth, 4000), 'truth'),
    seniorPath: str(d.seniorPath, 4000),
    rubric: str(d.rubric, 4000),
    outline: Array.isArray(d.outline) ? d.outline.map((o) => str(o, 300)).filter(Boolean).slice(0, 8) : [],
    round: parseRound(d.round),
  };
}

export function parseAnswer(text: string): AnswerResult {
  const d = parseJson(text);
  return { reveal: need(str(d.reveal, 2000), 'reveal'), round: parseRound(d.round) };
}

/** "1. a 2. b 3. c" on one line -> one step per line. */
export function stepsOnLines(text: string): string {
  if (text.includes('\n')) return text;
  return text.replace(/\s+(?=\d{1,2}\.\s)/g, '\n');
}

export function parseFinish(text: string, type: DrillType): FinishResult {
  const d = parseJson(text);
  const used = DRILLS[type].criteria as readonly Criterion[];
  const rawScores = (d.scores ?? {}) as Record<string, unknown>;
  const scores = Object.fromEntries(
    CRITERIA.map((c) => {
      const n = rawScores[c];
      if (!used.includes(c)) return [c, null];
      return [c, typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0];
    }),
  ) as Scores;
  const pairs = <T>(v: unknown, map: (o: Record<string, unknown>) => T | null, max: number): T[] =>
    Array.isArray(v) ? v.map((o) => map((o ?? {}) as Record<string, unknown>)).filter((x): x is T => x !== null).slice(0, max) : [];
  return {
    scores,
    debrief: need(str(d.debrief, 6000), 'debrief'),
    seniorPath: stepsOnLines(str(d.seniorPath, 4000)),
    whatIf: pairs(d.whatIf, (o) => (str(o.question, 400) ? { question: str(o.question, 400), answer: str(o.answer, 1000) } : null), 3),
    mistakes: pairs(d.mistakes, (o) => (str(o.text, 1000) ? { text: str(o.text, 1000), lesson: str(o.lesson, 1000) } : null), 3),
    newTerms: [...new Set((Array.isArray(d.newTerms) ? d.newTerms : []).map((t) => str(t, 120)).filter(Boolean))].slice(0, 8),
  };
}

/** Learner input: trimmed, NFC, not empty, not huge. */
export function cleanAnswer(raw: unknown): string {
  const v = typeof raw === 'string' ? raw.normalize('NFC').trim() : '';
  if (!v) throw new Error('Empty answer');
  if (v.length > 3000) throw new Error('Answer too long');
  return v;
}
