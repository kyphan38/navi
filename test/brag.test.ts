import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bragFacts, quarterOf, quarterRange, recentQuarters } from '@/lib/brag';

test('quarters: name, range, recent list across the year', () => {
  assert.equal(quarterOf(new Date(2026, 10, 17).getTime()), '2026-Q4');
  assert.equal(quarterOf(new Date(2026, 0, 1).getTime()), '2026-Q1');
  const r = quarterRange('2026-Q4');
  assert.equal(new Date(r.from).getMonth(), 9);
  assert.equal(new Date(r.to).getMonth(), 11);
  assert.equal(new Date(r.to).getDate(), 31);
  assert.deepEqual(recentQuarters(new Date(2026, 1, 1).getTime(), 3), ['2026-Q1', '2025-Q4', '2025-Q3']);
});

test('bragFacts: facts in the quarter, stories included, no help lines', () => {
  const at = new Date(2026, 10, 2).getTime();
  const facts = bragFacts('2026-Q4', {
    courseTitle: 'AWS Security',
    modules: [{ id: 'm', section: 's', title: 't', minutes: 30, kind: 'lesson', skillIds: [], doneWhen: '', doneAt: at }],
    days: [],
    dayTime: () => 0,
    skills: [],
    drills: [],
    terms: [],
    milestones: [],
    stories: [{ title: 'Fixed slow reviews', createdAt: at }],
  });
  assert.ok(facts.includes('1 module done'));
  assert.ok(facts.includes('- Fixed slow reviews'));
  assert.ok(!facts.includes('I want help with'));
});
