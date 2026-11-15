import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildMonthPrompt, fakeMonth, monthBefore, monthRange, parseMonth, summarizeMonth } from '../functions/src/month.ts';
import { PLAIN_ENGLISH } from '../functions/src/style.ts';

test('monthBefore uses Vietnam time and wraps the year', () => {
  // 1 Dec 00:30 in Vietnam is still 30 Nov in UTC.
  assert.equal(monthBefore(Date.UTC(2026, 10, 30, 17, 30)), '2026-11');
  assert.equal(monthBefore(Date.UTC(2027, 0, 1, 0, 0)), '2026-12');
});

test('monthRange covers the whole month in Vietnam time', () => {
  const [start, end] = monthRange('2026-11');
  assert.equal(start, Date.UTC(2026, 9, 31, 17));
  assert.equal(end, Date.UTC(2026, 10, 30, 17));
});

test('summarizeMonth counts time, drills and scores', () => {
  const text = summarizeMonth({
    drills: [
      { type: 'incident', group: 'tech', level: 'easy', topic: 'IAM', status: 'done', score: { triage: 2, hypothesis: 3, safety: null, comms: null, prevention: null } },
      { type: 'say-no', group: 'comms', level: 'easy', topic: 'scope', status: 'dropped', score: null },
    ],
    days: [{ minutes: 30, note: 'Hard day', confidence: 4 }, { minutes: 0, note: '', confidence: null }],
    weekReviews: [],
    mistakes: [],
    termsAdded: ['SLO'],
    termsKnown: [],
    modulesDone: [],
  });
  assert.match(text, /30 minutes on 1 days/);
  assert.match(text, /Drills done: 1 \(tech 1\)\. Dropped: 1\./);
  assert.match(text, /incident \(easy, IAM\): 5\/6/);
  assert.match(text, /Hard day/);
});

test('month prompt starts with the plain English rule', () => {
  assert.ok(buildMonthPrompt('2026-11', 'engineer', 'AWS', 'data').startsWith(PLAIN_ENGLISH));
});

test('parseMonth reads the fake answer and rejects an empty one', () => {
  assert.equal(parseMonth(fakeMonth()).progress.length, 2);
  assert.throws(() => parseMonth(JSON.stringify({ summary: '', progress: [], avoiding: [], next: [] })));
});
