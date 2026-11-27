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
    CONCEPTS.map((c) => [c.id, c.deck, c.name, [...c.skills], [...c.prereqs]]),
    SERVER.map((c) => [c.id, c.deck, c.name, [...c.skills], [...c.prereqs]]),
  );
});

test('catalog: unique ids, prereqs exist and come earlier (no loops), skills are real', async () => {
  const { SKILL_CATALOG } = await import('@/lib/skill-level');
  const skillIds = new Set(SKILL_CATALOG.map((s) => s.id));
  const seen = new Set<string>();
  for (const c of SERVER) {
    assert.ok(!seen.has(c.id), c.id);
    for (const p of c.prereqs) assert.ok(seen.has(p), `${c.id} needs ${p} first`);
    assert.ok(c.focus.length > 20, c.id);
    for (const k of c.skills) assert.ok(skillIds.has(k), `${c.id}: unknown skill ${k}`);
    seen.add(c.id);
  }
  assert.equal(SERVER.length, 64);
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
  assert.equal(nextKind('myth'), 'command');
  assert.equal(nextKind('command'), 'order');
  assert.equal(nextKind('order'), 'predict');
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

test('command and order questions parse; order needs 4-5 steps', async () => {
  const { fakeQuestion, parseQuestion } = await import('../functions/src/basics/prompts.ts');
  assert.equal(parseQuestion(fakeQuestion('command', 'X'), 'command').options.length, 4);
  const o = parseQuestion(fakeQuestion('order', 'X'), 'order');
  assert.equal(o.answer, 0);
  const raw = JSON.parse(fakeQuestion('order', 'X'));
  assert.throws(() => parseQuestion(JSON.stringify({ ...raw, options: ['a', 'b', 'c'] }), 'order'));
});

test('shuffled is stable, a real shuffle, never the right order; orderRight', async () => {
  const { shuffled, orderRight } = await import('@/lib/basics');
  const a = shuffled(5, 'card-1');
  assert.deepEqual(a, shuffled(5, 'card-1'));
  assert.deepEqual([...a].sort(), [0, 1, 2, 3, 4]);
  for (const seed of ['x', 'y', 'z', 'card-2', 'card-3']) assert.notDeepEqual(shuffled(4, seed), [0, 1, 2, 3]);
  assert.equal(orderRight([0, 1, 2, 3], 4), true);
  assert.equal(orderRight([1, 0, 2, 3], 4), false);
  assert.equal(orderRight([0, 1, 2], 4), false);
});

test('linkedConcept: learned concepts that fit current work, not rested, best score then oldest', async () => {
  const { linkedConcept } = await import('../functions/src/basics/pick.ts');
  const old = NOW - 10 * DAY;
  const s = new Map<string, StateLite>([
    ['dns-resolution', st('learning', { updatedAt: old })],
    ['dns-ttl', st('learned', { updatedAt: old - DAY })],
    ['tcp-close', st('learning', { updatedAt: old })],
    ['tls-handshake', st('learning', { updatedAt: NOW - DAY })], // touched lately: rests
    ['process', st('reading', { updatedAt: old })],
  ]);
  const work = { skills: new Set(['dns', 'tls']), terms: [] };
  assert.deepEqual(linkedConcept(s, work, [], NOW), { id: 'dns-ttl', skill: 'dns', term: null });
  assert.deepEqual(linkedConcept(s, work, ['dns-ttl'], NOW), { id: 'dns-resolution', skill: 'dns', term: null });
  // A recent term counts too.
  assert.deepEqual(linkedConcept(s, { skills: new Set(), terms: ['TIME_WAIT'] }, [], NOW), { id: 'tcp-close', skill: null, term: 'TIME_WAIT' });
  assert.equal(linkedConcept(s, { skills: new Set(['iac']), terms: [] }, [], NOW), null);
});

test('explainPick: once a week, box 3+ or learned, not explained in 30 days, oldest first', async () => {
  const { explainPick } = await import('@/lib/basics');
  const mk = (box: 1 | 2 | 3 | 4 | 5, updatedAt: number, extra: Partial<BasicState> = {}): BasicState => ({ ...opened('linux', NOW), status: 'learning', box, updatedAt, ...extra });
  const s = new Map<string, BasicState>([
    ['process', mk(2, NOW - 20 * DAY)],
    ['syscall', mk(3, NOW - 5 * DAY)],
    ['thread', mk(4, NOW - 9 * DAY)],
  ]);
  assert.equal(explainPick(s, NOW), 'thread');
  s.set('thread', mk(4, NOW - 9 * DAY, { explainedAt: NOW - 3 * DAY }));
  assert.equal(explainPick(s, NOW), null); // one this week already
  s.set('thread', mk(4, NOW - 9 * DAY, { explainedAt: NOW - 10 * DAY }));
  assert.equal(explainPick(s, NOW), 'syscall'); // thread explained less than 30 days ago
});

test('labPick: weekends only, reviewed once, has a skill, no lab yet', async () => {
  const { labPick } = await import('@/lib/basics');
  const s = new Map<string, BasicState>([
    ['process', { ...opened('linux', NOW), status: 'learning', box: 1 }],
    ['syscall', { ...opened('linux', NOW), status: 'learning', box: 2, labDoneAt: NOW }],
    ['thread', { ...opened('linux', NOW), status: 'learned', box: 5 }],
  ]);
  assert.equal(labPick(s, false), null);
  assert.equal(labPick(s, true), 'thread');
});

test('extras: explain and lab prompts and parsers', async () => {
  const { PLAIN_ENGLISH } = await import('../functions/src/style.ts');
  const x = await import('../functions/src/basics/extras.ts');
  assert.ok(x.buildExplainPrompt(SERVER[0], 'my words').startsWith(PLAIN_ENGLISH));
  assert.match(x.buildLabPrompt(SERVER[0], 'SRE'), /Never touch real servers/);
  assert.equal(x.parseExplain(x.fakeExplain()).pass, true);
  assert.ok(x.parseLab(x.fakeLab()).steps.length >= 3);
  assert.throws(() => x.parseLab(JSON.stringify({ title: 't', steps: [] })));
});
