import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isAllowed } from '../functions/src/access.ts';
import { DRILLS } from '../functions/src/drill/catalog.ts';
import { fakeAnswer, fakeFinish, fakeStart } from '../functions/src/drill/fake.ts';
import {
  buildAnswerPrompt,
  buildFinishPrompt,
  buildStartPrompt,
  cleanAnswer,
  parseAnswer,
  parseFinish,
  parseRound,
  parseStart,
  stepsOnLines,
} from '../functions/src/drill/prompts.ts';
import { PLAIN_ENGLISH } from '../functions/src/style.ts';
import { DRILL_TYPES } from '@/lib/drills';

const profile = { role: 'DevOps engineer', years: 2, context: 'payment app on AWS', focus: 'security' };
const key = { truth: 'pool too small', seniorPath: '1. look', rubric: 'r', outline: ['a', 'b', 'c'] };

test('isAllowed needs the same verified email', () => {
  assert.equal(isAllowed({ email: 'A@x.com', email_verified: true }, 'a@x.com'), true);
  assert.equal(isAllowed({ email: 'a@x.com', email_verified: false }, 'a@x.com'), false);
  assert.equal(isAllowed({ email: 'b@x.com', email_verified: true }, 'a@x.com'), false);
  assert.equal(isAllowed(undefined, 'a@x.com'), false);
});

test('every prompt starts with the plain English rules', () => {
  const rounds = [{ prompt: 'p', kind: 'choice' as const, options: ['a', 'b'], hint: '', answer: 'a' }];
  for (const p of [
    buildStartPrompt(profile, 'incident', 'easy', 'pool'),
    buildAnswerPrompt(profile, 'incident', 'easy', 'brief', key, rounds),
    buildFinishPrompt(profile, 'incident', 'easy', 'brief', key, rounds),
  ]) {
    assert.ok(p.startsWith(PLAIN_ENGLISH), 'prompt must start with PLAIN_ENGLISH');
  }
});

test('the client offers only types and levels the server runs', () => {
  for (const t of DRILL_TYPES) {
    assert.ok(t.type in DRILLS, `${t.type} missing on the server`);
    assert.deepEqual([...t.levels], [...DRILLS[t.type as keyof typeof DRILLS].levels]);
  }
});

test('fake answers pass the real parsers', () => {
  for (const type of ['incident', 'security-review'] as const) {
    for (const level of ['easy', 'medium'] as const) {
      const s = parseStart(fakeStart(type, level));
      assert.ok(s.brief && s.truth && s.round.prompt);
      for (let n = 1; n <= 3; n++) assert.ok(parseAnswer(fakeAnswer(n, level)).round.prompt);
    }
    assert.ok(parseFinish(fakeFinish(), type).debrief);
  }
});

test('parseRound turns a choice with too few options into free text', () => {
  assert.deepEqual(parseRound({ prompt: 'Q', kind: 'choice', options: ['only one'], hint: '' }), {
    prompt: 'Q',
    kind: 'text',
    options: [],
    hint: '',
  });
  assert.throws(() => parseRound({ prompt: '', kind: 'text', options: [], hint: '' }));
});

test('parseStart fixes a bad clock and rejects a missing truth', () => {
  const ok = JSON.parse(fakeStart('incident', 'easy'));
  assert.equal(parseStart(JSON.stringify({ ...ok, clock: '25:99' })).clock, '09:00');
  assert.throws(() => parseStart(JSON.stringify({ ...ok, truth: '' })));
  assert.throws(() => parseStart('not json'));
});

test('parseFinish nulls criteria the type does not use and clamps bad scores', () => {
  const raw = JSON.parse(fakeFinish());
  raw.scores = { triage: 9, hypothesis: 2, safety: 1, comms: 3, prevention: -1 };
  const res = parseFinish(JSON.stringify(raw), 'security-review');
  assert.equal(res.scores.comms, null);
  assert.equal(res.scores.triage, 0);
  assert.equal(res.scores.prevention, 0);
  assert.equal(res.scores.hypothesis, 2);
});

test('cleanAnswer trims and rejects empty or huge answers', () => {
  assert.equal(cleanAnswer('  roll back  '), 'roll back');
  assert.throws(() => cleanAnswer('   '));
  assert.throws(() => cleanAnswer('x'.repeat(3001)));
  assert.throws(() => cleanAnswer(42));
});

test('stepsOnLines puts each numbered step on its own line', () => {
  assert.equal(stepsOnLines('1. Look first. 2. Roll back 2.13.9 now. 3. Tell people.'), '1. Look first.\n2. Roll back 2.13.9 now.\n3. Tell people.');
  assert.equal(stepsOnLines('1. a\n2. b'), '1. a\n2. b');
});

test('parseRound keeps multi with 3+ options, else asks for free text', () => {
  assert.deepEqual(parseRound({ prompt: 'Pick all that apply.', kind: 'multi', options: ['a', 'b', 'c', 'd', 'e'], hint: '' }).kind, 'multi');
  assert.deepEqual(parseRound({ prompt: 'Q', kind: 'multi', options: ['a', 'b'], hint: '' }), { prompt: 'Q', kind: 'text', options: [], hint: '' });
});

test('round rules offer multi and push for automatic guards', () => {
  const p = buildStartPrompt(profile, 'security-review', 'medium', 'S3');
  assert.ok(p.includes('multi = pick ALL that apply'));
  assert.ok(p.includes('a CI check on the pull request'));
});

test('parseFinish keeps the automate advice, empty when not given', () => {
  assert.ok(parseFinish(fakeFinish(), 'incident').automate.includes('CI check'));
  const raw = JSON.parse(fakeFinish());
  delete raw.automate;
  assert.equal(parseFinish(JSON.stringify(raw), 'feedback').automate, '');
});

test('parseFinish keeps up to 3 even-better ideas', () => {
  assert.equal(parseFinish(fakeFinish(), 'incident').evenBetter.length, 2);
  const raw = JSON.parse(fakeFinish());
  raw.evenBetter = ['a', '', 'b', 'c', 'd'];
  assert.deepEqual(parseFinish(JSON.stringify(raw), 'incident').evenBetter, ['a', 'b', 'c']);
});

test('finish prompt asks for even-better ideas even at full score', () => {
  const rounds = [{ prompt: 'p', kind: 'text' as const, options: [], hint: '', answer: 'a' }];
  assert.ok(buildFinishPrompt(profile, 'incident', 'easy', 'b', key, rounds).includes('ALWAYS, even when every score is 3'));
});
