import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PLACES, placeOf } from '@/lib/nav';
import { DEFAULT_PROFILE, normalizeProfile } from '@/lib/profile';

test('placeOf maps paths with and without a trailing slash', () => {
  assert.equal(placeOf('/'), 'today');
  assert.equal(placeOf('/drill'), 'drill');
  assert.equal(placeOf('/drill/'), 'drill');
  assert.equal(placeOf('/settings/'), 'settings');
  assert.equal(placeOf('/login/'), null);
});

test('every place has a unique href', () => {
  assert.equal(new Set(PLACES.map((p) => p.href)).size, PLACES.length);
});

test('normalizeProfile fills missing parts with defaults', () => {
  assert.deepEqual(normalizeProfile(undefined), DEFAULT_PROFILE);
  assert.deepEqual(normalizeProfile({ role: '  SRE  ' }), { ...DEFAULT_PROFILE, role: 'SRE' });
});

test('normalizeProfile keeps numbers inside the rules limits', () => {
  assert.equal(normalizeProfile({ years: 99 }).years, 50);
  assert.equal(normalizeProfile({ years: -1 }).years, 0);
  assert.equal(normalizeProfile({ hoursPerWeek: 0 }).hoursPerWeek, 1);
  assert.equal(normalizeProfile({ hoursPerWeek: 7.6 }).hoursPerWeek, 8);
  assert.equal(normalizeProfile({ hoursPerWeek: Number('abc') }).hoursPerWeek, DEFAULT_PROFILE.hoursPerWeek);
});

test('normalizeProfile cuts long text and treats blank as default', () => {
  assert.equal(normalizeProfile({ focus: 'x'.repeat(300) }).focus.length, 200);
  assert.equal(normalizeProfile({ context: '   ' }).context, DEFAULT_PROFILE.context);
});
