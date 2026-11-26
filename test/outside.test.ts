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
  assert.equal(parseDigest(fakeDigest()).length, 4);
  assert.equal(parsePostmortems(fakePostmortems())[0].questions.length, 2);
});

test('keepWorking keeps working links, max 2 banking, max 5, no repeats', async () => {
  const mk = (n: number, group: NewsItem['group']): NewsItem => ({ title: `t${n}`, url: `https://x.com/${n}`, source: '', group, why: '' });
  const items = [mk(1, 'banking'), mk(2, 'banking'), mk(3, 'banking'), mk(4, 'outside'), mk(5, 'outside'), mk(6, 'outside'), mk(7, 'outside'), mk(8, 'outside')];
  const dead = new Set(['https://x.com/4']);
  const kept = await keepWorking(items, async (u) => (dead.has(u) ? null : u.replace('x.com', 'final.com')), [{ name: 'Final', host: 'final.com', topic: 'devops' }]);
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

test('sourceOf: host or subdomain, path when set, a locale before the path', async () => {
  const { NEWS_SOURCES, POSTMORTEM_SOURCES, sourceOf } = await import('../functions/src/sources.ts');
  assert.equal(sourceOf('https://blog.cloudflare.com/some-post/', NEWS_SOURCES)?.name, 'Cloudflare Blog');
  assert.equal(sourceOf('https://www.hashicorp.com/blog/terraform-1-10', NEWS_SOURCES)?.name, 'HashiCorp Blog');
  assert.equal(sourceOf('https://www.hashicorp.com/products/terraform', NEWS_SOURCES), null);
  assert.equal(sourceOf('https://aws.amazon.com/blogs/architecture/x/', NEWS_SOURCES)?.name, 'AWS Architecture Blog');
  assert.equal(sourceOf('https://aws.amazon.com/blogs/gametech/x/', NEWS_SOURCES), null);
  assert.equal(sourceOf('https://stripe.com/en-gb/blog/payments-at-scale', NEWS_SOURCES)?.name, 'Stripe Blog');
  assert.equal(sourceOf('https://evilcloudflare.com/x', NEWS_SOURCES), null);
  assert.equal(sourceOf('not a url', NEWS_SOURCES), null);
  assert.equal(sourceOf('https://aws.amazon.com/message/41926/', POSTMORTEM_SOURCES)?.name, 'AWS');
});

test('keepWorking drops untrusted sites, keeps at most 1 AI post, names the source from the list', async () => {
  const mk = (n: number, url: string): NewsItem => ({ title: `t${n}`, url, source: 'model said', group: 'outside', why: '' });
  const items = [
    mk(1, 'https://random-blog.dev/post'),
    mk(2, 'https://simonwillison.net/2026/Nov/20/a/'),
    mk(3, 'https://latent.space/p/b'),
    mk(4, 'https://kubernetes.io/blog/2026/11/20/c/'),
  ];
  const kept = await keepWorking(items, async (u) => u);
  assert.deepEqual(kept.map((k) => [k.title, k.source]), [['t2', "Simon Willison's Weblog"], ['t4', 'Kubernetes Blog']]);
});

test('digest and postmortem prompts list the trusted sources', async () => {
  const { buildDigestPrompt, buildPostmortemPrompt } = await import('../functions/src/news.ts');
  const d = buildDigestPrompt('payment app on AWS', Date.UTC(2026, 10, 26));
  assert.match(d, /Use ONLY these sources/);
  assert.match(d, /SRE Weekly \(sreweekly\.com\)/);
  assert.match(d, /Stripe Blog \(stripe\.com\/blog\/\)/);
  assert.match(buildPostmortemPrompt('payment app', []), /status\.cloud\.google\.com\/incidents\//);
});
