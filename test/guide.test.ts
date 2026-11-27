import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bumpHint, hintStage, parseHintCounts } from '@/lib/hint';
import { loopKeyOf, loopSteps } from '@/lib/loop';

test('hintStage: full 3 times, short 3 times, then gone', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 20].map((n) => hintStage(n)), ['full', 'full', 'full', 'short', 'short', 'short', 'gone', 'gone']);
  assert.equal(hintStage(1, false), 'gone');
});

test('parseHintCounts: keeps positive numbers, drops the rest', () => {
  assert.deepEqual(parseHintCounts(null), {});
  assert.deepEqual(parseHintCounts('not json'), {});
  assert.deepEqual(parseHintCounts('[1,2]'), {});
  assert.deepEqual(parseHintCounts('{"a":2,"b":"x","c":-1,"d":3.7}'), { a: 2, d: 3 });
});

test('bumpHint: adds one, stops after the hint is gone', () => {
  assert.deepEqual(bumpHint({}, 'a'), { a: 1 });
  assert.deepEqual(bumpHint({ a: 2, b: 1 }, 'a'), { a: 3, b: 1 });
  const gone = { a: 7 };
  assert.equal(bumpHint(gone, 'a'), gone);
});

test('loopSteps: drill always, basics and review only when set up', () => {
  assert.deepEqual(
    loopSteps({ drillDone: false, basicsDone: null, reviewDue: null }).map((s) => s.key),
    ['drill'],
  );
  const all = loopSteps({ drillDone: true, basicsDone: false, reviewDue: 0 });
  assert.deepEqual(all.map((s) => [s.key, s.done]), [['drill', true], ['basics', false], ['review', true]]);
  assert.equal(loopSteps({ drillDone: true, basicsDone: true, reviewDue: 2 })[2]!.done, false);
});

test('loopKeyOf: drill play counts as drill, other pages are not stops', () => {
  assert.equal(loopKeyOf('/drill/play/'), 'drill');
  assert.equal(loopKeyOf('/drill'), 'drill');
  assert.equal(loopKeyOf('/basics/'), 'basics');
  assert.equal(loopKeyOf('/review/'), 'review');
  assert.equal(loopKeyOf('/terms/'), null);
  assert.equal(loopKeyOf('/'), null);
});
