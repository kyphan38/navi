import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AREAS as SERVER_AREAS, buildCardPrompt, buildQuizPrompt, fakeCards, fakeQuiz, parseCards, parseQuiz, termId as serverTermId } from '../functions/src/terms.ts';
import { parseFinish } from '../functions/src/drill/prompts.ts';
import { PLAIN_ENGLISH } from '../functions/src/style.ts';
import { INTERVALS, dueItems, review } from '@/lib/leitner';
import { AREAS, groupByArea, missingDrillTerms, reviewPatch, statusPatch, studyPrompt, termId } from '@/lib/terms';

const DAY = 86_400_000;

test('client and server agree on term ids and areas', () => {
  for (const n of ['Connection pool', '  connection   pool ', 'IAM role (AWS)', 'TLS/SSL', 'Café']) {
    assert.equal(termId(n), serverTermId(n));
  }
  assert.equal(termId('Connection pool'), termId('connection  POOL'));
  assert.deepEqual([...AREAS], [...SERVER_AREAS]);
});

test('review moves up a box when right and back to 1 when wrong', () => {
  assert.deepEqual(review(1, true, 0), { box: 2, nextReviewAt: INTERVALS[1] * DAY, learned: false });
  assert.deepEqual(review(4, false, 0), { box: 1, nextReviewAt: DAY, learned: false });
  assert.deepEqual(review(5, true, 0), { box: 5, nextReviewAt: null, learned: true });
});

test('dueItems keeps due items, oldest first, at most max', () => {
  const items = [{ nextReviewAt: 5 }, { nextReviewAt: null }, { nextReviewAt: 1 }, { nextReviewAt: 99 }];
  assert.deepEqual(dueItems(items, 10), [{ nextReviewAt: 1 }, { nextReviewAt: 5 }]);
  assert.equal(dueItems(items, 100, 1).length, 1);
});

test('statusPatch and reviewPatch follow the plan', () => {
  assert.deepEqual(statusPatch('learning', 0), { status: 'learning', box: 1, nextReviewAt: DAY });
  assert.deepEqual(statusPatch('known', 0), { status: 'known', box: 5, nextReviewAt: null });
  // A new term that passes a quiz starts review, it does not jump ahead.
  assert.deepEqual(reviewPatch({ status: 'new', box: 1 }, true, 0), { status: 'learning', box: 1, nextReviewAt: DAY });
  assert.deepEqual(reviewPatch({ status: 'learning', box: 5 }, true, 0), { status: 'known', box: 5, nextReviewAt: null });
  assert.deepEqual(reviewPatch({ status: 'learning', box: 3 }, false, 0), { status: 'learning', box: 1, nextReviewAt: DAY });
});

test('studyPrompt fills the term and the profile', () => {
  const p = studyPrompt('NAT Gateway', { role: 'DevOps engineer', years: 2, context: 'payment app on AWS' });
  assert.ok(p.startsWith('Teach me the term "NAT Gateway".'));
  assert.ok(p.includes('I am a DevOps engineer with 2 years of experience'));
  assert.ok(p.includes('A real example from payment app on AWS.'));
  assert.ok(p.includes('IELTS 6.0'));
});

test('groupByArea follows the area order and sorts names', () => {
  const g = groupByArea([
    { area: 'Other', name: 'b' },
    { area: 'Security', name: 'z' },
    { area: 'Security', name: 'a' },
  ]);
  assert.deepEqual(g.map((x) => x.area), ['Security', 'Other']);
  assert.deepEqual(g[0].terms.map((t) => t.name), ['a', 'z']);
});

test('missingDrillTerms skips saved terms and repeats', () => {
  const drills = [
    { id: 'd2', newTerms: ['Rollback', 'NAT Gateway'] },
    { id: 'd1', newTerms: ['rollback', 'Elastic IP'] },
  ];
  assert.deepEqual(missingDrillTerms(drills, new Set(['nat-gateway'])), [
    { name: 'Rollback', drillId: 'd2' },
    { name: 'Elastic IP', drillId: 'd1' },
  ]);
});

test('term prompts start with plain English rules', () => {
  assert.ok(buildCardPrompt(['NAT Gateway'], 'payment app').startsWith(PLAIN_ENGLISH));
  assert.ok(buildQuizPrompt('NAT Gateway', 'x', 'payment app').startsWith(PLAIN_ENGLISH));
});

test('parseCards drops unusable cards and fixes unknown areas', () => {
  const cards = parseCards(JSON.stringify({ cards: [{ name: 'NAT', area: 'Space', oneLine: 'An exit.' }, { name: '', area: 'Data', oneLine: 'x' }, { name: 'X', area: 'Data', oneLine: '' }] }));
  assert.deepEqual(cards, [{ name: 'NAT', area: 'Other', oneLine: 'An exit.' }]);
  assert.equal(parseCards(fakeCards(['a', 'b'])).length, 2);
});

test('parseQuiz keeps valid questions and rejects an empty quiz', () => {
  assert.equal(parseQuiz(fakeQuiz('NAT')).length, 3);
  const bad = { question: 'Q', options: ['a', 'b'], answer: 5, why: '' };
  assert.throws(() => parseQuiz(JSON.stringify({ questions: [bad] })));
});

test('parseFinish turns term items into cards, one per term', () => {
  const base = { scores: {}, debrief: 'd', seniorPath: '', whatIf: [], mistakes: [] };
  const res = parseFinish(
    JSON.stringify({ ...base, newTerms: [{ name: 'Rollback', area: 'Delivery', oneLine: 'Go back.' }, { name: 'rollback', area: 'Delivery', oneLine: 'Again.' }, 'NAT'] }),
    'incident',
  );
  assert.deepEqual(res.newTerms.map((t) => t.name), ['Rollback', 'NAT']);
});
