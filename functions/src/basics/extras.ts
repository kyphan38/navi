// Basics Phase 2 (PLAN-basics.md 10): explain it back (weekly) and the weekend lab.
// Pure file: the root test suite imports it.

import { PLAIN_ENGLISH } from '../style.ts';
import type { Concept } from './catalog.ts';

// ---------------------------------------------------------------- explain it back

export type ExplainGrade = { pass: boolean; good: string; missing: string[]; better: string };

export const EXPLAIN_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    good: { type: 'string' },
    missing: { type: 'array', items: { type: 'string' } },
    better: { type: 'string' },
  },
  required: ['pass', 'good', 'missing', 'better'],
};

export function buildExplainPrompt(c: Concept, text: string): string {
  return `${PLAIN_ENGLISH}

A learner explains a foundation concept in their own words, to check that they really understand it.
Concept: ${c.name}. What matters: ${c.focus}

Their explanation:
"""
${text}
"""

Grade it kindly but honestly. Pass when the core idea and how it works are right, even with simple words or small gaps.
Do not pass when the core idea is wrong or missing.
Return JSON:
- "pass": true or false.
- "good": one sentence on what they got right.
- "missing": 0-3 short items: what is wrong or missing, most important first.
- "better": a better explanation in 3-4 short sentences, in simple words.`;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function parseExplain(text: string): ExplainGrade {
  const d = JSON.parse(text) as Record<string, unknown>;
  if (typeof d.pass !== 'boolean') throw new Error('Missing pass');
  const better = str(d.better, 1200);
  if (!better) throw new Error('Missing better');
  return {
    pass: d.pass,
    good: str(d.good, 400),
    missing: Array.isArray(d.missing) ? d.missing.map((m) => str(m, 300)).filter(Boolean).slice(0, 3) : [],
    better,
  };
}

export const fakeExplain = () =>
  JSON.stringify({ pass: true, good: 'You named the main idea.', missing: ['Say what happens when the limit is reached.'], better: 'A short better version.' });

// ---------------------------------------------------------------- weekend lab

export type LabStep = { do: string; command: string; expect: string };
export type Lab = { title: string; goal: string; needs: string; steps: LabStep[]; cleanup: string; learn: string };

export const LAB_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    goal: { type: 'string' },
    needs: { type: 'string' },
    steps: {
      type: 'array',
      items: { type: 'object', properties: { do: { type: 'string' }, command: { type: 'string' }, expect: { type: 'string' } }, required: ['do', 'command', 'expect'] },
    },
    cleanup: { type: 'string' },
    learn: { type: 'string' },
  },
  required: ['title', 'goal', 'needs', 'steps', 'cleanup', 'learn'],
};

export function buildLabPrompt(c: Concept, role: string): string {
  return `${PLAIN_ENGLISH}

Write a hands-on lab of about 15 minutes for a ${role} who learned this concept and now wants to see it for real.
Concept: ${c.name}. What matters: ${c.focus}

Rules:
- It runs on a laptop with Docker (a throwaway container, for example "docker run --rm -it ubuntu bash") or plain Linux.
  Never touch real servers, cloud accounts or company systems. Nothing needs sudo on the host.
- 4-7 steps. Each step: "do" (one short sentence), "command" (the exact command, or "" when none), "expect" (what they
  should see, so they can tell it worked).
- Make the concept visible: cause it, watch it, then explain it with one command.
Return JSON:
- "title": 3-6 words.
- "goal": one sentence: what they will see with their own eyes.
- "needs": what they need (for example "Docker on your laptop").
- "steps": the steps.
- "cleanup": the command(s) to remove what the lab made.
- "learn": 2 sentences: what this shows about the concept.`;
}

export function parseLab(text: string): Lab {
  const d = JSON.parse(text) as Record<string, unknown>;
  const steps = (Array.isArray(d.steps) ? d.steps : [])
    .map((x) => (x ?? {}) as Record<string, unknown>)
    .map((x) => ({ do: str(x.do, 300), command: str(x.command, 400), expect: str(x.expect, 300) }))
    .filter((x) => x.do)
    .slice(0, 8);
  if (steps.length < 3) throw new Error('Need steps');
  const title = str(d.title, 80);
  if (!title) throw new Error('Missing title');
  return { title, goal: str(d.goal, 300), needs: str(d.needs, 200), steps, cleanup: str(d.cleanup, 300), learn: str(d.learn, 500) };
}

export const fakeLab = () =>
  JSON.stringify({
    title: 'See a process from inside',
    goal: 'You will see your own process and its parent.',
    needs: 'Docker on your laptop',
    steps: [
      { do: 'Start a throwaway Linux box.', command: 'docker run --rm -it ubuntu bash', expect: 'A root prompt.' },
      { do: 'List the processes.', command: 'ps -ef', expect: 'bash with PID 1.' },
      { do: 'Start a child.', command: 'sleep 100 &', expect: 'A job number and a PID.' },
    ],
    cleanup: 'exit',
    learn: 'Every program you run is a process with a PID. The shell is the parent of what it starts.',
  });
