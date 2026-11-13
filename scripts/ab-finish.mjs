// ---------------------------------------------------------------------------
// navi - A/B the drill scoring call (PLAN-navi.md 5.3)
//
// Part 1: drillStart's prompt (writing a drill) on 3 topics.
// Part 2: drillFinish's prompt (scoring) on 5 sample drills.
// Each runs with every setup; answers go side by side to ab-finish.md (gitignored).
// AB_SETUPS picks setups by name, e.g. AB_SETUPS="flash low,argon".
//
//   npm --prefix functions run build
//   GEMINI_API_KEY=... node scripts/ab-finish.mjs
//
// The owner runs it: the key is never read by an agent (../SECRETS.md).
// After reading, set GEMINI_MODEL_FINISH / GEMINI_THINKING_FINISH in
// functions/.env only if one setup is clearly better.
// ---------------------------------------------------------------------------

import { writeFileSync } from 'node:fs';

import { fakeStart } from '../functions/lib/drill/fake.js';
import { FINISH_SCHEMA, START_SCHEMA, buildFinishPrompt, buildStartPrompt, parseFinish, parseStart } from '../functions/lib/drill/prompts.js';
import { generateText } from '../functions/lib/gemini.js';

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('Set GEMINI_API_KEY in the shell first.');
  process.exit(1);
}

const ALL_SETUPS = [
  { name: 'flash low', model: 'gemini-3.8-flash', thinking: 'low' },
  { name: 'flash medium', model: 'gemini-3.8-flash', thinking: 'medium' },
  { name: 'argon', model: 'gemini-4-argon', thinking: undefined },
  { name: 'hydrogen', model: 'gemini-4-hydrogen', thinking: undefined },
];
const pick = (process.env.AB_SETUPS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const SETUPS = pick.length ? ALL_SETUPS.filter((s) => pick.includes(s.name)) : ALL_SETUPS;

const profile = { role: 'DevOps engineer', years: 2, context: 'payment app on AWS at a bank', focus: 'cloud security and reliability' };

// Answers from weak to strong, so we can see if the scores follow.
const SAMPLES = [
  { type: 'incident', level: 'easy', answers: ['Restart all API pods', 'CPU of the load balancer', 'Wait for the batch to end'] },
  { type: 'incident', level: 'easy', answers: ['Roll back the 23:00 deploy now', 'DB connection pool usage', 'Roll back the config change'] },
  {
    type: 'incident',
    level: 'medium',
    answers: [
      'Open the dashboard and see where errors start',
      'Maybe the DB pool is too small after the deploy, or core banking is slow, or a retry storm.',
      'Payments: success rate 92%, looking at DB pool after 23:00 deploy. Next update in 15 min.',
      'Rollback done. Add an alert on pool usage and a config check in CI. Check for double payments.',
    ],
  },
  { type: 'security-review', level: 'easy', answers: ['The bucket has no tags', 'Make it private', 'Tell the teammate'] },
  {
    type: 'security-review',
    level: 'medium',
    answers: [
      '1. Principal * makes it public. 2. s3:* allows delete. 3. No encryption rule.',
      'Principal = one role ARN, Action = s3:GetObject, add aws:SecureTransport condition.',
      'Hi team, this policy makes payment reports public. I blocked the merge. Fix is ready for review.',
      'Add a Checkov rule in CI and turn on S3 Block Public Access for the account.',
    ],
  },
];

function sampleDrill(s) {
  const start = parseStart(fakeStart(s.type, s.level));
  const rounds = s.answers.map((answer, i) => ({ prompt: i === 0 ? start.round.prompt : `Round ${i + 1}`, kind: 'text', options: [], hint: '', answer }));
  return { start, rounds };
}

let out = '# Drill model A/B\n\n## Part 1: writing a drill\n\n';
const STARTS = [
  { type: 'incident', level: 'medium', topic: 'retry storm after a short outage' },
  { type: 'incident', level: 'easy', topic: 'TLS certificate expired on an internal endpoint' },
  { type: 'security-review', level: 'medium', topic: 'IAM role with wildcard actions' },
];
for (const [i, s] of STARTS.entries()) {
  out += `### Start ${i + 1}: ${s.type} ${s.level}, ${s.topic}\n\n`;
  for (const setup of SETUPS) {
    const t0 = Date.now();
    try {
      const text = await generateText(key, setup.model, buildStartPrompt(profile, s.type, s.level, s.topic), { jsonSchema: START_SCHEMA, thinking: setup.thinking, temperature: 0.9, timeoutMs: 120_000 });
      const r = parseStart(text);
      out += `#### ${setup.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)\n\nBrief: ${r.brief}\n\nRound 1 (${r.round.kind}): ${r.round.prompt}\nOptions: ${r.round.options.join(' | ')}\n\nTruth: ${r.truth}\n\nOutline: ${r.outline.join(' / ')}\n\n`;
    } catch (err) {
      out += `#### ${setup.name}\n\nFailed: ${err instanceof Error ? err.message : String(err)}\n\n`;
    }
    console.log(`start ${i + 1}, ${setup.name} done`);
  }
}
out += '## Part 2: scoring a drill\n\n';
for (const [i, s] of SAMPLES.entries()) {
  const { start, rounds } = sampleDrill(s);
  const prompt = buildFinishPrompt(profile, s.type, s.level, start.brief, start, rounds);
  out += `### Sample ${i + 1}: ${s.type} ${s.level}\n\nAnswers: ${s.answers.join(' / ')}\n\n`;
  for (const setup of SETUPS) {
    const t0 = Date.now();
    try {
      const text = await generateText(key, setup.model, prompt, { jsonSchema: FINISH_SCHEMA, thinking: setup.thinking, temperature: 0.4, timeoutMs: 120_000 });
      const res = parseFinish(text, s.type);
      out += `#### ${setup.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)\n\nScores: ${JSON.stringify(res.scores)}\n\n${res.debrief}\n\nMistakes: ${res.mistakes.map((m) => m.text).join(' | ')}\n\n`;
    } catch (err) {
      out += `#### ${setup.name}\n\nFailed: ${err instanceof Error ? err.message : String(err)}\n\n`;
    }
    console.log(`sample ${i + 1}, ${setup.name} done`);
  }
}
writeFileSync('ab-finish.md', out);
console.log('ab-finish.md written');
