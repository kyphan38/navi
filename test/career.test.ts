import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildBragPrompt,
  buildExamPrompt,
  buildPickPrompt,
  buildRolePrompt,
  buildStoryPrompt,
  fakeExam,
  fakePick,
  fakeRole,
  fakeStory,
  parseExam,
  parsePick,
  parseRole,
  parseStory,
} from '../functions/src/career.ts';
import { buildStartPrompt } from '../functions/src/drill/prompts.ts';
import {
  buildFeedbackPrompt,
  buildTurnPrompt,
  fakeFeedback,
  fakeTurn,
  followUpAllowed,
  interviewOver,
  mainCount,
  parseFeedback,
  parseTurn,
  type Turn,
} from '../functions/src/interview.ts';
import { PLAIN_ENGLISH } from '../functions/src/style.ts';

const p = { role: 'DevOps engineer', years: 2, context: 'payment app on AWS', focus: 'security' };

test('career prompts start with PLAIN_ENGLISH', () => {
  for (const prompt of [
    buildPickPrompt('Releases wait two days for review.'),
    buildStoryPrompt(p, 'work', 'I automated three checks.'),
    buildExamPrompt({ title: 'AWS Security', goal: 'Pass the exam' }, { section: 'IAM', title: 'Policy evaluation', doneWhen: '' }),
    buildBragPrompt(p, '2026 Q4', 'Modules: 12'),
    buildRolePrompt(p, 'Senior DevOps', [{ id: 'iam', name: 'IAM', area: 'Security' }]),
    buildTurnPrompt(p, 'design', [], []),
    buildFeedbackPrompt(p, 'behavioral', [{ q: 'Tell me about a time.', a: 'I did.', followUp: false }], []),
  ]) {
    assert.ok(prompt.startsWith(PLAIN_ENGLISH));
  }
});

test('a drill can be based on a real problem', () => {
  assert.ok(buildStartPrompt(p, 'tradeoff', 'easy', 'Review wait', 'Releases wait two days.').includes('Releases wait two days.'));
  assert.ok(!buildStartPrompt(p, 'tradeoff', 'easy', 'Review wait').includes('real problem'));
});

test('parsers accept the fakes and refuse junk', () => {
  assert.equal(parsePick(fakePick()).type, 'tradeoff');
  assert.throws(() => parsePick('{"type":"nope","topic":"x"}'));
  assert.equal(parseStory(fakeStory()).title, 'Fixed slow release reviews');
  assert.throws(() => parseStory('{"title":""}'));
  assert.equal(parseExam(fakeExam()).length, 5);
  assert.throws(() => parseExam('{"questions":[]}'));
});

test('exam answers are valid indexes, never all options', () => {
  const qs = parseExam(
    JSON.stringify({
      questions: [
        { question: 'a', options: ['1', '2', '3', '4'], answers: [1, 1, 9], why: 'w' },
        { question: 'b', options: ['1', '2', '3', '4'], answers: [0, 1, 2, 3], why: 'w' },
        { question: 'c', options: ['1', '2', '3'], answers: [2, 0], why: 'w' },
        { question: 'd', options: ['1', '2', '3', '4'], answers: [3], why: 'w' },
      ],
    }),
  );
  assert.deepEqual(qs.map((q) => q.answers), [[1], [0, 2], [3]]);
});

test('role needs keep known ids, once, levels 1-4', () => {
  const ids = new Set(['a', 'b']);
  assert.deepEqual(parseRole('{"needs":[{"skillId":"a","level":9},{"skillId":"a","level":2},{"skillId":"z","level":2},{"skillId":"b","level":0}]}', ids), [
    { skillId: 'a', level: 4 },
    { skillId: 'b', level: 1 },
  ]);
  assert.equal(parseRole(fakeRole(['a', 'b']), ids).length, 2);
  assert.throws(() => parseRole('{"needs":[]}', ids));
});

test('interview: 5 main questions, one follow-up at most after each', () => {
  const t = (followUp: boolean, a: string | null = 'ans'): Turn => ({ q: 'q', a, followUp });
  assert.equal(followUpAllowed([]), false);
  assert.equal(followUpAllowed([t(false)]), true);
  assert.equal(followUpAllowed([t(false), t(true)]), false);
  assert.equal(followUpAllowed([t(false, null)]), false);
  const five = [t(false), t(true), t(false), t(false), t(false), t(false)];
  assert.equal(mainCount(five), 5);
  assert.equal(interviewOver(five), true);
  assert.equal(interviewOver([...five.slice(0, 5), t(false, null)]), false);
  // A follow-up the rules do not allow becomes a main question.
  assert.equal(parseTurn('{"question":"Why?","followUp":true}', [t(false), t(true)]).followUp, false);
  assert.equal(parseTurn(fakeTurn([]), []).followUp, false);
  assert.equal(parseFeedback(fakeFeedback()).questions.length, 5);
  assert.equal(parseFeedback('{"overall":"ok","questions":[{"score":7,"note":"n","better":"b"}],"practise":[]}').questions[0].score, 3);
});
