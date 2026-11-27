import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CONCEPTS as SERVER, DECKS as SERVER_DECKS } from '../functions/src/basics/catalog.ts';
import { deckStuck, levelFor, nextConcept, nextKind, pickSession, type StateLite } from '../functions/src/basics/pick.ts';
import { CONCEPTS, DECKS } from '@/lib/basics-catalog';
import { afterCheck, afterReview, markTerms, opened, prereqsToBump } from '@/lib/basics';
import type { BasicState } from '@/types/navi';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 27, 5);
const st = (status: StateLite['status'], extra: Partial<StateLite> = {}): StateLite => ({ status, box: 1, nextReviewAt: null, lastKind: null, stuckAt: [], ...extra });

test('client catalog matches the server catalog', () => {
  assert.deepEqual(DECKS, SERVER_DECKS);
  assert.deepEqual(
    CONCEPTS.map((c) => [c.id, c.deck, c.name, [...c.prereqs]]),
    SERVER.map((c) => [c.id, c.deck, c.name, [...c.prereqs]]),
  );
});

test('catalog: unique ids, prereqs exist and come earlier (no loops)', () => {
  const seen = new Set<string>();
  for (const c of SERVER) {
    assert.ok(!seen.has(c.id), c.id);
    for (const p of c.prereqs) assert.ok(seen.has(p), `${c.id} needs ${p} first`);
    assert.ok(c.focus.length > 20, c.id);
    seen.add(c.id);
  }
  assert.equal(SERVER.length, 24);
});

test('nextConcept: deck order, catalog order, prereqs must be started', () => {
  assert.equal(nextConcept(new Map()), 'process');
  const s = new Map([['process', st('learning')]]);
  assert.equal(nextConcept(s), 'syscall');
  // A concept only being read does not open the ones after it.
  assert.equal(nextConcept(new Map([['process', st('reading')]])), 'ip-subnet');
  const allLinux = new Map(SERVER.filter((c) => c.deck === 'linux').map((c) => [c.id, st('learning')]));
  assert.equal(nextConcept(allLinux), 'ip-subnet');
  const all = new Map(SERVER.map((c) => [c.id, st('learned')]));
  assert.equal(nextConcept(all), null);
});

test('pickSession: up to 2 due reviews oldest first, an open lesson first, a spare after next', () => {
  const s = new Map<string, StateLite>([
    ['process', st('learning', { nextReviewAt: NOW - 3 * DAY })],
    ['syscall', st('learning', { nextReviewAt: NOW - DAY })],
    ['thread', st('learning', { nextReviewAt: NOW - 2 * DAY })],
    ['virtual-memory', st('learning', { nextReviewAt: NOW + DAY })],
    ['stack-heap', st('learned')],
  ]);
  const p = pickSession(s, NOW);
  assert.deepEqual(p.reviews, ['process', 'thread']);
  assert.equal(p.next, 'file-descriptor');
  assert.equal(p.spare, 'permissions');
  s.set('signals', st('reading'));
  assert.equal(pickSession(s, NOW).next, 'signals');
  s.set('not-a-concept', st('learning', { nextReviewAt: NOW - 9 * DAY }));
  assert.ok(!pickSession(s, NOW).reviews.includes('not-a-concept'));
});

test('levelFor, nextKind and deckStuck', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(levelFor), [1, 2, 2, 3, 3]);
  assert.equal(nextKind(null), 'predict');
  assert.equal(nextKind('predict'), 'myth');
  assert.equal(nextKind('myth'), 'predict');
  const s = new Map([
    ['process', st('learning', { stuckAt: [NOW - DAY] })],
    ['tcp-close', st('learning', { stuckAt: [NOW - DAY] })],
  ]);
  assert.equal(deckStuck('linux', s, NOW), false);
  s.set('thread', st('learning', { stuckAt: [NOW - 2 * DAY, NOW - 9 * DAY] }));
  assert.equal(deckStuck('linux', s, NOW), true);
});

const base = (): BasicState => opened('linux', NOW);

test('afterCheck: into review in box 1 either way; wrong while sure is a blind spot', () => {
  const right = afterCheck(base(), true, true, NOW);
  assert.equal(right.status, 'learning');
  assert.equal(right.nextReviewAt, NOW + DAY);
  assert.equal(right.blindSpots, 0);
  assert.equal(afterCheck(base(), false, true, NOW).blindSpots, 1);
  assert.equal(afterCheck(base(), false, false, NOW).blindSpots, 0);
});

test('afterReview: Leitner up or back to 1, learned after box 5, stuck keeps the box', () => {
  const s = { ...afterCheck(base(), true, false, NOW), box: 2 as const };
  const up = afterReview(s, 'right', false, 'predict', NOW);
  assert.equal(up.box, 3);
  assert.equal(up.lastKind, 'predict');
  const down = afterReview(s, 'wrong', true, 'myth', NOW);
  assert.equal(down.box, 1);
  assert.equal(down.blindSpots, 1);
  const stuck = afterReview(s, 'stuck', false, 'myth', NOW);
  assert.equal(stuck.box, 2);
  assert.equal(stuck.stuck, 1);
  assert.deepEqual(stuck.stuckAt, [NOW]);
  assert.equal(stuck.nextReviewAt, NOW + DAY);
  const done = afterReview({ ...s, box: 5 }, 'right', false, 'predict', NOW);
  assert.equal(done.status, 'learned');
  assert.equal(done.nextReviewAt, null);
});

test('prereqsToBump: only prereqs still in review', () => {
  const states = new Map<string, BasicState>([
    ['page-cache', { ...afterCheck(base(), true, false, NOW) }],
    ['stack-heap', { ...afterCheck(base(), true, false, NOW), status: 'learned' }],
  ]);
  assert.deepEqual(prereqsToBump('oom-killer', states), ['page-cache']);
  assert.deepEqual(prereqsToBump('process', states), []);
});

test('markTerms: whole words (plural ok), longest first, any case, first time only', () => {
  const parts = markTerms('The heap limit and the Heaps, then the heap again; a stopwatch', ['heap', 'heap limit', 'stop']);
  assert.deepEqual(
    parts.map((p) => [p.text, p.term]),
    [
      ['The ', null],
      ['heap limit', 'heap limit'],
      [' and the ', null],
      ['Heaps', 'heap'],
      [', then the heap again; a stopwatch', null],
    ],
  );
  assert.deepEqual(markTerms('plain', []), [{ text: 'plain', term: null }]);
});

test('lesson and question prompts start with plain English and carry the question rules', async () => {
  const { PLAIN_ENGLISH } = await import('../functions/src/style.ts');
  const { QUESTION_RULES, buildLessonPrompt, buildQuestionPrompt } = await import('../functions/src/basics/prompts.ts');
  const c = SERVER[0];
  for (const p of [buildLessonPrompt(c, [], 'DevOps engineer'), buildQuestionPrompt(c, 'myth', 2, ['Threads vs processes'], 'SRE')]) {
    assert.ok(p.startsWith(PLAIN_ENGLISH));
    assert.ok(p.includes(QUESTION_RULES));
    assert.ok(p.includes(c.focus));
  }
  assert.match(buildLessonPrompt(c, [], 'x', 'step 3 is wrong'), /step 3 is wrong/);
  assert.match(buildQuestionPrompt(c, 'myth', 3, [], 'x'), /Which one is wrong/);
});

test('fakes pass the parsers; parsers reject bad answers', async () => {
  const { fakeLesson, fakeQuestion, parseLesson, parseQuestion } = await import('../functions/src/basics/prompts.ts');
  const l = parseLesson(fakeLesson('Processes'));
  assert.ok(l.how.length >= 3 && l.check.options.length === 4 && l.glossary.length === 1);
  assert.equal(parseQuestion(fakeQuestion('myth', 'X'), 'myth').options.length, 3);
  const bad = JSON.parse(fakeQuestion('predict', 'X'));
  assert.throws(() => parseQuestion(JSON.stringify({ ...bad, answer: 7 }), 'predict'));
  assert.throws(() => parseQuestion(JSON.stringify({ ...bad, options: ['a', 'b'] }), 'predict'));
  assert.throws(() => parseQuestion(JSON.stringify({ ...bad, setup: '' }), 'predict'));
});

test('vnDay uses Vietnam time', async () => {
  const { vnDay } = await import('../functions/src/basics/pick.ts');
  assert.equal(vnDay(Date.UTC(2026, 10, 26, 18)), '2026-11-27'); // 01:00 in Vietnam
  assert.equal(vnDay(Date.UTC(2026, 10, 26, 16)), '2026-11-26'); // 23:00 in Vietnam
});

test('sessionSteps: lesson first, then cards that exist, then "one more"; done flags', async () => {
  const { sessionSteps, nextReviewIn } = await import('@/lib/basics');
  const day = { next: 'syscall', reviews: ['process', 'thread'] };
  const cards = [{ id: 'd_process', conceptId: 'process', result: 'right' }];
  const states = new Map([['syscall', { status: 'reading' as const }]]);
  assert.deepEqual(
    sessionSteps(day, cards, states, 'thread').map((s) => [s.kind, s.id, s.done]),
    [
      ['lesson', 'syscall', false],
      ['card', 'd_process', true],
      ['lesson', 'thread', false],
    ],
  );
  assert.deepEqual(sessionSteps(null, cards, states), []);
  assert.equal(nextReviewIn(new Map([['a', { nextReviewAt: NOW + 2.6 * DAY }], ['b', { nextReviewAt: null }]]), NOW), 3);
  assert.equal(nextReviewIn(new Map([['a', { nextReviewAt: NOW + DAY + 60_000 }]]), NOW), 1);
  assert.equal(nextReviewIn(new Map(), NOW), null);
});

test('splitCode and asCodeBlock handle the way the model writes commands', async () => {
  const { splitCode, asCodeBlock } = await import('@/lib/basics');
  assert.deepEqual(splitCode('Run `ps -ef` now'), [
    { text: 'Run ', code: false },
    { text: 'ps -ef', code: true },
    { text: ' now', code: false },
  ]);
  assert.equal(asCodeBlock('Run ```ps -o pid``` here'), '```\nRun ps -o pid here\n```');
  assert.equal(asCodeBlock('```bash\n$ ps -ef\nPID CMD\n```'), '```\n$ ps -ef\nPID CMD\n```');
  assert.equal(asCodeBlock('$ free -h'), '```\n$ free -h\n```');
});
