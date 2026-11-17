// Career tools: drill from an Ask (V7), STAR story draft (V2), module exam
// questions (V4), brag doc (V3), target role needs (V10).
// Pure file: the root test suite imports it.

import { DRILLS, isDrillType, type DrillType } from './drill/catalog.ts';
import { PLAIN_ENGLISH, SAFE_DATA } from './style.ts';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown, max: number, len: number) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : []);

export type Learner = { role: string; years: number; context: string; focus: string };
const about = (p: Learner) => `The learner is a ${p.role} with ${p.years} years of experience, working on a ${p.context}. Their focus: ${p.focus}.`;

// ------------------------------------------------------------------ V7: Ask -> drill type

export const PICK_SCHEMA = {
  type: 'object',
  properties: { type: { type: 'string' }, topic: { type: 'string' } },
  required: ['type', 'topic'],
};

export function buildPickPrompt(question: string): string {
  const types = (Object.keys(DRILLS) as DrillType[]).map((t) => `- ${t}: ${DRILLS[t].brief}`).join('\n');
  return `${PLAIN_ENGLISH}

A learner asked a senior about this real problem at work:
"""
${question}
"""

Pick the ONE drill type below that trains the skill this problem needs most, and a short topic (2-5 words).
${types}

Return JSON: "type" (one of the names above), "topic".`;
}

export function parsePick(text: string): { type: DrillType; topic: string } {
  const d = JSON.parse(text) as Record<string, unknown>;
  if (!isDrillType(d.type)) throw new Error('Unknown type');
  return { type: d.type, topic: str(d.topic, 200) };
}

export const fakePick = () => JSON.stringify({ type: 'tradeoff', topic: 'Release review wait' });

// ------------------------------------------------------------------ V2: STAR story draft

export type Story = { title: string; situation: string; task: string; action: string; result: string };

export const STORY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    situation: { type: 'string' },
    task: { type: 'string' },
    action: { type: 'string' },
    result: { type: 'string' },
  },
  required: ['title', 'situation', 'task', 'action', 'result'],
};

/** `source`: a finished drill (brief, answers, debrief) or a "used at work" note. */
export function buildStoryPrompt(p: Learner, kind: 'drill' | 'work', source: string): string {
  return `${PLAIN_ENGLISH}
${SAFE_DATA}

${about(p)}
Turn this ${kind === 'drill' ? 'practice drill they finished' : 'note about something they did at work'} into a STAR story
they can tell in a 1:1 or a job interview. Use only what is in the source. Do not invent numbers or results;
where the source has no result, write what they learned instead. Keep each part 1-3 short sentences, in the first person.

Source:
"""
${source}
"""

Return JSON: "title" (3-7 words), "situation", "task", "action", "result".`;
}

export function parseStory(text: string): Story {
  const d = JSON.parse(text) as Record<string, unknown>;
  const s = {
    title: str(d.title, 120),
    situation: str(d.situation, 1000),
    task: str(d.task, 1000),
    action: str(d.action, 1500),
    result: str(d.result, 1000),
  };
  if (!s.title || !s.situation || !s.action) throw new Error('Missing parts');
  return s;
}

export const fakeStory = () =>
  JSON.stringify({
    title: 'Fixed slow release reviews',
    situation: 'Releases waited two days for a manual review.',
    task: 'I had to cut the wait without losing safety.',
    action: 'I listed the checks that never changed and turned three of them into CI jobs.',
    result: 'I learned to automate the boring checks first and keep people for risky changes.',
  });

// ------------------------------------------------------------------ V4: module exam questions

export type ExamQuestion = { question: string; options: string[]; answers: number[]; why: string };
export const EXAM_QUESTIONS = 5;

export const EXAM_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          answers: { type: 'array', items: { type: 'integer' } },
          why: { type: 'string' },
        },
        required: ['question', 'options', 'answers', 'why'],
      },
    },
  },
  required: ['questions'],
};

export function buildExamPrompt(course: { title: string; goal: string }, module: { section: string; title: string; doneWhen: string }): string {
  return `${PLAIN_ENGLISH}

Write ${EXAM_QUESTIONS} practice questions in the style of the real exam for this course.
Course: ${course.title}. Goal: ${course.goal}.
Module: ${module.section} - ${module.title}. ${module.doneWhen ? `Done when: ${module.doneWhen}.` : ''}

Rules:
- Scenario questions like the real exam ("A company needs ... What should they do?"), about this module only.
- 4 options each. Most questions have 1 right answer; at most 2 questions have 2 right answers and say "Choose two".
- "answers": the 0-based indexes of the right options.
- "why": 2-3 sentences: why the right answer is right and the most tempting wrong one is wrong.

Return JSON: "questions".`;
}

export function parseExam(text: string): ExamQuestion[] {
  const d = JSON.parse(text) as { questions?: unknown };
  const qs = Array.isArray(d.questions) ? d.questions : [];
  const out = qs
    .map((q) => {
      const r = (q ?? {}) as Record<string, unknown>;
      const options = list(r.options, 5, 300);
      const answers = Array.isArray(r.answers)
        ? [...new Set(r.answers.filter((a): a is number => Number.isInteger(a) && a >= 0 && a < options.length))].sort()
        : [];
      return { question: str(r.question, 800), options, answers, why: str(r.why, 800) };
    })
    .filter((q) => q.question && q.options.length >= 3 && q.answers.length >= 1 && q.answers.length < q.options.length)
    .slice(0, EXAM_QUESTIONS);
  if (out.length < 3) throw new Error('Too few questions');
  return out;
}

export const fakeExam = () =>
  JSON.stringify({
    questions: Array.from({ length: EXAM_QUESTIONS }, (_, i) => ({
      question: `Practice question ${i + 1}: which control stops this risk?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answers: [i % 4],
      why: 'Because it blocks the risk before it starts.',
    })),
  });

// ------------------------------------------------------------------ V3: brag doc

export function buildBragPrompt(p: Learner, quarter: string, facts: string): string {
  return `${PLAIN_ENGLISH}

${about(p)}
Write a short "brag doc" for their performance review: what they did in ${quarter}.
Use ONLY the facts below. Do not invent numbers, projects or praise. If a part has no facts, leave it out.

Facts:
"""
${facts}
"""

Write Markdown, at most one page:
- "## Summary": 2-3 sentences.
- "## Skills that grew": bullets, each with its evidence.
- "## Learning": courses and modules, hours.
- "## Practice": drills and what they show.
- "## Stories": one line per STAR story title, if any.
- "## Next quarter": 2-3 bullets from the gaps the facts show.
Plain text in Markdown, no tables.`;
}

export const fakeBrag = () => '## Summary\nA steady quarter of learning.\n\n## Next quarter\n- Keep going.';

// ------------------------------------------------------------------ V10: target role needs

export type RoleNeed = { skillId: string; level: number };

export const ROLE_SCHEMA = {
  type: 'object',
  properties: {
    needs: {
      type: 'array',
      items: { type: 'object', properties: { skillId: { type: 'string' }, level: { type: 'integer' } }, required: ['skillId', 'level'] },
    },
  },
  required: ['needs'],
};

/** `skills`: the app's skill catalog (id, name, area). Levels: 1 learned, 2 practised, 3 used at work, 4 can teach. */
export function buildRolePrompt(p: Learner, role: string, skills: { id: string; name: string; area: string }[]): string {
  return `${PLAIN_ENGLISH}

${about(p)}
Their target role: "${role}".
From the skills below, pick the ones this role really needs (usually 8-15) and the level each needs:
1 = learned it, 2 = practised it, 3 = uses it at work, 4 = can teach it.
Be realistic for this role at a bank, not a wish list.

Skills (id: name, area):
${skills.map((s) => `- ${s.id}: ${s.name} (${s.area})`).join('\n')}

Return JSON: "needs": a list of { "skillId", "level" }, using only ids from the list.`;
}

export function parseRole(text: string, ids: ReadonlySet<string>): RoleNeed[] {
  const d = JSON.parse(text) as { needs?: unknown };
  const seen = new Set<string>();
  const needs = (Array.isArray(d.needs) ? d.needs : [])
    .map((n) => (n ?? {}) as Record<string, unknown>)
    .filter((n) => typeof n.skillId === 'string' && ids.has(n.skillId) && Number.isInteger(n.level))
    .map((n) => ({ skillId: n.skillId as string, level: Math.min(4, Math.max(1, n.level as number)) }))
    .filter((n) => (seen.has(n.skillId) ? false : (seen.add(n.skillId), true)))
    .slice(0, 27);
  if (needs.length === 0) throw new Error('No needs');
  return needs;
}

export const fakeRole = (ids: string[]) => JSON.stringify({ needs: ids.slice(0, 8).map((skillId, i) => ({ skillId, level: 2 + (i % 2) })) });
