import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanUrl, fetchCommunity, onTopic, parseDailyDev, parseHn, parseLobsters, parseRepos, parseRss, pickCommunity, type Thread } from '../functions/src/community.ts';

const NOW = Date.UTC(2026, 10, 26, 12);
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

test('onTopic matches pillar words as whole words only', () => {
  assert.ok(onTopic('Why our Kubernetes upgrade broke DNS'));
  assert.ok(onTopic('Terraform 2.0 is out'));
  assert.ok(onTopic('A CI/CD pipeline in 50 lines'));
  assert.equal(onTopic('The best keyboard for cats'), false);
  assert.equal(onTopic('Circus tickets'), false); // "ci" inside a word does not count
});

test('cleanUrl drops utm parameters and the hash', () => {
  assert.equal(cleanUrl('https://a.com/x?utm_source=feed&id=2#top'), 'https://a.com/x?id=2');
});

test('parseHn keeps stories on topic, best first, with the discussion link', () => {
  const t = parseHn({
    hits: [
      { title: 'Kubernetes at scale', url: 'https://a.com/k', points: 100, objectID: '1' },
      { title: 'A new phone', url: 'https://b.com/p', points: 900, objectID: '2' },
      { title: 'Ask HN: how do you run Postgres backups?', url: null, points: 300, objectID: '3' },
    ],
  });
  assert.deepEqual(t.map((x) => [x.title, x.score]), [['Ask HN: how do you run Postgres backups?', 300], ['Kubernetes at scale', 100]]);
  assert.equal(t[0].url, 'https://news.ycombinator.com/item?id=3');
  assert.equal(t[1].discuss, 'https://news.ycombinator.com/item?id=1');
  assert.deepEqual(parseHn({}), []);
});

test('parseLobsters keeps the last 7 days, best first', () => {
  const t = parseLobsters(
    [
      { title: 'Old', url: 'https://a.com/1', score: 50, created_at: iso(9), comments_url: 'https://lobste.rs/s/1' },
      { title: 'New', url: 'https://a.com/2', score: 20, created_at: iso(1), comments_url: 'https://lobste.rs/s/2' },
    ],
    NOW,
  );
  assert.deepEqual(t.map((x) => [x.title, x.discuss]), [['New', 'https://lobste.rs/s/2']]);
});

test('parseDailyDev keeps on-topic articles with a real link', () => {
  const t = parseDailyDev(
    {
      data: [
        { title: 'Quests got better', url: '', type: 'freeform', createdAt: iso(1), numUpvotes: 50, tags: [] },
        { title: 'EP234: Docker vs Kubernetes', url: 'https://blog.bytebytego.com/p/ep234', publishedAt: iso(2), numUpvotes: 83, tags: ['docker'], commentsPermalink: 'https://daily.dev/posts/ep234' },
        { title: 'My favourite font', url: 'https://c.com/f', publishedAt: iso(1), numUpvotes: 400, tags: ['design'] },
      ],
    },
    NOW,
  );
  assert.deepEqual(t.map((x) => [x.where, x.score, x.discuss]), [['daily.dev', 83, 'https://daily.dev/posts/ep234']]);
});

test('parseRss reads RSS items, on topic and recent, newest first', () => {
  const xml = `<rss><channel>
    <item><title><![CDATA[Kubernetes 1.40 ships]]></title><link>https://n.io/k?utm_source=feed</link><pubDate>${new Date(NOW - DAY).toUTCString()}</pubDate></item>
    <item><title>Robots learn to dance</title><link>https://n.io/r</link><pubDate>${new Date(NOW - DAY).toUTCString()}</pubDate></item>
    <item><title>A quiet week</title><link>https://n.io/q</link><pubDate>${new Date(NOW - 2 * DAY).toUTCString()}</pubDate><category>DevOps</category></item>
    <item><title>Old outage</title><link>https://n.io/o</link><pubDate>${new Date(NOW - 20 * DAY).toUTCString()}</pubDate></item>
  </channel></rss>`;
  assert.deepEqual(parseRss(xml, 'News', NOW).map((h) => [h.title, h.url]), [
    ['Kubernetes 1.40 ships', 'https://n.io/k'],
    ['A quiet week', 'https://n.io/q'],
  ]);
});

test('parseRepos and pickCommunity: 2 per place, no repeats, caps', () => {
  const th = (where: Thread['where'], n: number, url = `https://x.com/${where}/${n}`): Thread => ({ title: `${where}${n}`, url, discuss: null, where, score: 10 - n });
  const c = pickCommunity(
    [[th('hn', 1), th('hn', 2), th('hn', 3)], [th('lobsters', 1, 'https://x.com/hn/1'), th('lobsters', 2), th('lobsters', 3)], [th('daily.dev', 1), th('daily.dev', 2)]],
    [[{ title: 'a', url: 'https://f.com/a', site: 'A' }, { title: 'a2', url: 'https://f.com/a2', site: 'A' }], [{ title: 'b', url: 'https://f.com/b', site: 'B' }]],
    [...parseRepos({ items: [{ full_name: 'o/one', html_url: 'https://github.com/o/one', stargazers_count: 5 }, { full_name: 'o/two', html_url: 'https://github.com/o/two', stargazers_count: 50, description: 'x' }] }), ...parseRepos({ items: [{ full_name: 'o/one', html_url: 'https://github.com/o/one', stargazers_count: 5 }] })],
  );
  assert.deepEqual(c.threads.map((t) => t.title), ['hn1', 'hn2', 'lobsters2', 'lobsters3', 'daily.dev1']);
  assert.deepEqual(c.headlines.map((h) => h.title), ['a', 'b', 'a2']);
  assert.deepEqual(c.repos.map((r) => r.name), ['o/two', 'o/one']);
});

test('fetchCommunity never throws and skips daily.dev without a token', async () => {
  const seen: string[] = [];
  const failing = (async (url: string) => {
    seen.push(String(url));
    throw new Error('down');
  }) as unknown as typeof fetch;
  const c = await fetchCommunity(NOW, 'none', failing);
  assert.deepEqual(c, { threads: [], headlines: [], repos: [] });
  assert.ok(seen.every((u) => !u.includes('daily.dev')));
});
