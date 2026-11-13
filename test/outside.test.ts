import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkLink, extractJson, keepWorking, parseDigest, parsePostmortems, weekIdAt, fakeDigest, fakePostmortems, type NewsItem } from '../functions/src/news.ts';
import { buildSeniorPrompt, fakeSenior, findInternalData as serverFind, parseSenior } from '../functions/src/senior.ts';
import { PLAIN_ENGLISH } from '../functions/src/style.ts';
import { findInternalData } from '@/lib/internal-data';
import { oneOnOne } from '@/lib/one-on-one';
import { weekOf } from '@/lib/plan';
import { parseDay } from '@/lib/day';

test('findInternalData catches IPs, ARNs, account ids, keys, hosts and emails', () => {
  assert.deepEqual(findInternalData('Our deploy is slow and reviews take long.'), []);
  assert.deepEqual(findInternalData('The box at 10.20.3.4 times out'), ['an IP address']);
  assert.deepEqual(findInternalData('role arn:aws:iam::123456789012:role/pay'), ['an ARN with an account id']);
  assert.deepEqual(findInternalData('account 123456789012 has a bad SCP'), ['a 12-digit account id']);
  assert.deepEqual(findInternalData('key AKIAABCDEFGHIJKLMNOP leaked'), ['an access key']);
  assert.deepEqual(findInternalData('call pay-core.svc.internal now'), ['an internal host name']);
  assert.deepEqual(findInternalData('host ip-10-0-1-23 is down'), ['a server host name']);
  assert.deepEqual(findInternalData('ask minh@bank.com'), ['an email address']);
  // A version number or a short number is fine.
  assert.deepEqual(findInternalData('upgrade from 2.13.9 to 2.14.0, 500 errors'), []);
});

test('client and server internal-data checks agree', () => {
  for (const t of ['10.0.0.1', 'arn:aws:s3:::bucket', 'arn:aws:iam::123456789012:root', 'x.corp', 'a@b.co', 'nothing here', '1234567890123']) {
    assert.deepEqual(findInternalData(t), serverFind(t), t);
  }
});

test('senior prompt and parser', () => {
  assert.ok(buildSeniorPrompt('q', 'DevOps engineer', 2, 'payment app').startsWith(PLAIN_ENGLISH));
  const a = parseSenior(fakeSenior());
  assert.ok(a.restate && a.recommend && a.firstSteps.length === 3 && a.options.length === 2);
  assert.throws(() => parseSenior(JSON.stringify({ restate: '', recommend: '' })));
});

test('extractJson reads JSON inside fences and words', () => {
  assert.deepEqual(extractJson('Here:\n```json\n{"a":1}\n```\nDone'), { a: 1 });
  assert.throws(() => extractJson('no json'));
});

test('parseDigest and parsePostmortems drop items without a real URL', () => {
  const items = parseDigest(JSON.stringify({ items: [{ title: 'A', url: 'https://x.com/a', group: 'banking' }, { title: 'B', url: 'not a url' }, { title: '', url: 'https://x.com/c' }] }));
  assert.deepEqual(items.map((i) => [i.title, i.group]), [['A', 'banking']]);
  assert.equal(parseDigest(fakeDigest()).length, 3);
  assert.equal(parsePostmortems(fakePostmortems())[0].questions.length, 2);
});

test('keepWorking keeps working links, max 2 banking, max 5, no repeats', async () => {
  const mk = (n: number, group: NewsItem['group']): NewsItem => ({ title: `t${n}`, url: `https://x.com/${n}`, source: '', group, why: '' });
  const items = [mk(1, 'banking'), mk(2, 'banking'), mk(3, 'banking'), mk(4, 'outside'), mk(5, 'outside'), mk(6, 'outside'), mk(7, 'outside'), mk(8, 'outside')];
  const dead = new Set(['https://x.com/4']);
  const kept = await keepWorking(items, async (u) => (dead.has(u) ? null : u.replace('x.com', 'final.com')));
  assert.deepEqual(kept.map((k) => k.title), ['t1', 't2', 't5', 't6', 't7']);
  assert.ok(kept.every((k) => k.url.startsWith('https://final.com/')));
});

test('checkLink: 2xx with a real path passes, 404 and home pages fail', async () => {
  const fake = (status: number, url: string) => (async () => ({ status, url }) as Response) as unknown as typeof fetch;
  assert.equal(await checkLink('https://a.com/x', fake(200, 'https://a.com/y')), 'https://a.com/y');
  assert.equal(await checkLink('https://a.com/x', fake(404, 'https://a.com/x')), null);
  assert.equal(await checkLink('https://a.com/x', fake(200, 'https://a.com/')), null);
  assert.equal(await checkLink('https://a.com/x', (async () => { throw new Error('down'); }) as unknown as typeof fetch), null);
});

test('weekIdAt on the server matches weekOf in the app', () => {
  for (const day of ['2026-11-13', '2026-11-15', '2026-11-16', '2027-01-01', '2025-12-29']) {
    // Noon Vietnam time on that day.
    const t = parseDay(day).getTime();
    assert.equal(weekIdAt(t), weekOf(day), day);
  }
});

test('oneOnOne lists what happened in the range only', () => {
  const day = (id: string) => parseDay(id).getTime();
  const text = oneOnOne({
    from: day('2026-11-01'),
    to: day('2026-11-13'),
    courseTitle: 'AWS Security',
    modules: [
      { id: 'a', section: 's', title: 'A', minutes: 30, kind: 'lesson', skillIds: [], doneWhen: '', doneAt: day('2026-11-05') },
      { id: 'b', section: 's', title: 'B', minutes: 20, kind: 'lesson', skillIds: [], doneWhen: '', doneAt: day('2026-10-01') },
      { id: 'c', section: 's', title: 'C', minutes: 20, kind: 'lesson', skillIds: [], doneWhen: '', doneAt: null },
    ],
    days: [{ id: '2026-11-05', minutes: 30 }, { id: '2026-10-01', minutes: 20 }],
    dayTime: day,
    skills: [{ name: 'IAM policies', computed: 2, reachedAt: day('2026-11-06'), all: [{ level: 3, kind: 'work', ref: null, note: 'Fixed a role', at: day('2026-11-07') }] }],
    drills: [],
    terms: [{ createdAt: day('2026-11-02'), status: 'known', updatedAt: day('2026-11-10') }],
    milestones: [{ checklist: [{ text: 'Write a postmortem', done: true, at: day('2026-11-08') }] }],
  });
  assert.ok(text.includes('- 1 module done (30m) in AWS Security. 2/3 overall.'));
  assert.ok(text.includes('- Studied 30m on 1 day.'));
  assert.ok(text.includes('IAM policies: now "do" (level 2)'));
  assert.ok(text.includes('IAM policies: Fixed a role'));
  assert.ok(text.includes('- 1 new, 1 now known.'));
  assert.ok(text.includes('Write a postmortem (8 Nov)'));
  assert.ok(!text.includes('Drills'));
});
