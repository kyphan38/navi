// Community picks for the weekly digest (owner, 2026-11-26): titles and links only, no AI.
// Hacker News (Algolia search API), Lobsters (tag JSON), daily.dev (the owner's own feed,
// public API with a personal token), new GitHub repos (search API), and headlines from the
// RSS feeds of InfoQ, The New Stack and The Register (they block the link check, so their
// own feeds are the way in). Everything is filtered to the five DevOps/Platform pillars.
// Pure except the fetchers, which take a fetch so tests can fake it.

export type Thread = { title: string; url: string; discuss: string | null; where: 'hn' | 'lobsters' | 'daily.dev'; score: number };
export type Headline = { title: string; url: string; site: string };
export type Repo = { name: string; url: string; description: string; stars: number };
export type Community = { threads: Thread[]; headlines: Headline[]; repos: Repo[] };

const DAY = 86_400_000;
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; navi-link-check)' };
export const MAX_THREADS = 5;
export const MAX_HEADLINES = 3;
export const MAX_REPOS = 3;

/** Words for the five pillars. Whole words, case does not matter. */
const PILLAR_WORDS = [
  'kubernetes', 'k8s', 'docker', 'container', 'containers', 'podman', 'helm', 'argo', 'argocd', 'gitops',
  'linux', 'kernel', 'systemd', 'ebpf', 'networking', 'dns', 'tcp', 'tls', 'bgp', 'nginx', 'envoy', 'load balancer',
  'terraform', 'opentofu', 'ansible', 'pulumi', 'ci', 'ci/cd', 'github actions', 'pipeline', 'deploy', 'deployment',
  'observability', 'prometheus', 'grafana', 'opentelemetry', 'tracing', 'logging', 'monitoring', 'sre', 'incident',
  'outage', 'postmortem', 'reliability', 'on-call', 'slo',
  'aws', 'gcp', 'azure', 'cloud', 'iam', 'vulnerability', 'cve', 'supply chain', 'secrets',
  'postgres', 'postgresql', 'mysql', 'redis', 'kafka', 'database', 'platform engineering', 'devops',
];
// Headlines about AI products and models crowd out ops news in the feeds; the focus is DevOps / Platform.
const AI_TITLE = /\b(ai|agent|agents|agentic|llm|llms|claude|openai|gpt|gemini|copilot|model|models|chatbot)\b/i;
const PILLAR_RE = new RegExp(`(^|[^a-z0-9])(${PILLAR_WORDS.map((w) => w.replace(/[/.+-]/g, '\\$&')).join('|')})($|[^a-z0-9])`, 'i');

export function onTopic(text: string): boolean {
  return PILLAR_RE.test(text);
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

function httpUrl(v: unknown): string {
  try {
    const u = new URL(str(v, 1000));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

/** Drops tracking parameters, so the same post from two places matches. */
export function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------- parsers (pure)

/** Algolia HN search hits: stories on topic, best score first. */
export function parseHn(json: unknown): Thread[] {
  const hits = (json as { hits?: unknown })?.hits;
  if (!Array.isArray(hits)) return [];
  return hits
    .map((h): Thread | null => {
      const r = (h ?? {}) as Record<string, unknown>;
      const title = str(r.title, 300);
      const id = str(r.objectID, 20);
      const discuss = id ? `https://news.ycombinator.com/item?id=${id}` : null;
      const url = httpUrl(r.url) || discuss || '';
      if (!title || !url || !onTopic(title)) return null;
      return { title, url: cleanUrl(url), discuss, where: 'hn', score: typeof r.points === 'number' ? r.points : 0 };
    })
    .filter((x): x is Thread => x !== null)
    .sort((a, b) => b.score - a.score);
}

/** Lobsters tag JSON: stories from the last 7 days, best score first (the tag already keeps them on topic). */
export function parseLobsters(json: unknown, now: number): Thread[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((h): Thread | null => {
      const r = (h ?? {}) as Record<string, unknown>;
      const title = str(r.title, 300);
      const discuss = httpUrl(r.comments_url) || httpUrl(r.short_id_url) || null;
      const url = httpUrl(r.url) || discuss || '';
      const at = Date.parse(str(r.created_at, 40));
      if (!title || !url || !(now - at <= 7 * DAY)) return null;
      return { title, url: cleanUrl(url), discuss, where: 'lobsters', score: typeof r.score === 'number' ? r.score : 0 };
    })
    .filter((x): x is Thread => x !== null)
    .sort((a, b) => b.score - a.score);
}

/** daily.dev feed: articles with a real link from the last 7 days, on topic, most upvotes first. */
export function parseDailyDev(json: unknown, now: number): Thread[] {
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((p): Thread | null => {
      const r = (p ?? {}) as Record<string, unknown>;
      const title = str(r.title, 300);
      const url = httpUrl(r.url);
      const tags = Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string').join(' ') : '';
      const at = Date.parse(str(r.publishedAt, 40) || str(r.createdAt, 40));
      if (!title || !url || !(now - at <= 7 * DAY) || !onTopic(`${title} ${tags}`)) return null;
      return { title, url: cleanUrl(url), discuss: httpUrl(r.commentsPermalink) || null, where: 'daily.dev', score: typeof r.numUpvotes === 'number' ? r.numUpvotes : 0 };
    })
    .filter((x): x is Thread => x !== null)
    .sort((a, b) => b.score - a.score);
}

/** GitHub repo search: name, link, one line, stars. */
export function parseRepos(json: unknown): Repo[] {
  const items = (json as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map((i): Repo | null => {
      const r = (i ?? {}) as Record<string, unknown>;
      const name = str(r.full_name, 200);
      const url = httpUrl(r.html_url);
      if (!name || !url) return null;
      return { name, url, description: str(r.description, 200), stars: typeof r.stargazers_count === 'number' ? r.stargazers_count : 0 };
    })
    .filter((x): x is Repo => x !== null);
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * RSS 2.0 items from the last 7 days, on topic, not about AI products, newest first.
 * `paths`: only links under these path sections count (The Register puts the section in the URL).
 * No XML library: three tags are enough.
 */
export function parseRss(xml: string, site: string, now: number, paths?: readonly string[]): (Headline & { at: number })[] {
  const out: (Headline & { at: number })[] = [];
  for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/g)) {
    const item = m[0];
    const tag = (name: string) => decode(item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? '');
    const title = str(tag('title'), 300);
    const url = httpUrl(tag('link'));
    const at = Date.parse(tag('pubDate') || tag('dc:date'));
    const categories = [...item.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/g)].map((c) => decode(c[1])).join(' ');
    if (!title || !url || !(now - at <= 7 * DAY) || !onTopic(`${title} ${categories}`) || AI_TITLE.test(title)) continue;
    if (paths && !paths.some((p) => new URL(url).pathname.startsWith(`/${p}/`))) continue;
    out.push({ title, url: cleanUrl(url), site, at });
  }
  return out.sort((a, b) => b.at - a.at);
}

/**
 * The week's picks: up to 2 threads from each place, no repeated link, at most 5;
 * headlines one per site first, at most 3; repos at most 3, most stars first.
 */
export function pickCommunity(threads: Thread[][], headlines: Headline[][], repos: Repo[]): Community {
  const seen = new Set<string>();
  const t: Thread[] = [];
  for (const list of threads) {
    let n = 0;
    for (const x of list) {
      if (n === 2 || t.length === MAX_THREADS) break;
      if (seen.has(x.url)) continue;
      seen.add(x.url);
      t.push(x);
      n++;
    }
  }
  const h: Headline[] = [];
  const rounds = Math.max(0, ...headlines.map((l) => l.length));
  for (let i = 0; i < rounds && h.length < MAX_HEADLINES; i++) {
    for (const list of headlines) {
      const x = list[i];
      if (!x || seen.has(x.url) || h.length === MAX_HEADLINES) continue;
      seen.add(x.url);
      h.push({ title: x.title, url: x.url, site: x.site });
    }
  }
  const r = [...new Map(repos.map((x) => [x.name, x])).values()].sort((a, b) => b.stars - a.stars).slice(0, MAX_REPOS);
  return { threads: t, headlines: h, repos: r };
}

// ---------------------------------------------------------------- fetchers (network)

const LOBSTERS_TAGS = ['devops', 'linux', 'networking', 'databases', 'distributed'];
const REPO_TOPICS = ['kubernetes', 'terraform', 'devops', 'observability'];
// Topic feeds where the site has them (checked 2026-11-26). The Register's section feeds return
// the main feed, so its links are filtered by the section in the URL instead.
const FEEDS: { site: string; urls: string[]; paths?: string[] }[] = [
  { site: 'InfoQ', urls: ['https://feed.infoq.com/devops/', 'https://feed.infoq.com/cloud-computing/', 'https://feed.infoq.com/architecture-design/'] },
  { site: 'The New Stack', urls: ['https://thenewstack.io/devops/feed/', 'https://thenewstack.io/kubernetes/feed/', 'https://thenewstack.io/platform-engineering/feed/'] },
  { site: 'The Register', urls: ['https://www.theregister.com/headlines.atom'], paths: ['devops', 'on_prem', 'security', 'software', 'networks'] },
];

async function getJson(url: string, fetchImpl: typeof fetch, headers: Record<string, string> = {}, timeoutMs = 15_000): Promise<unknown> {
  const res = await fetchImpl(url, { headers: { ...UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${res.status} ${new URL(url).host}`);
  return res.json();
}

async function getText(url: string, fetchImpl: typeof fetch): Promise<string> {
  const res = await fetchImpl(url, { headers: { ...UA, Accept: 'application/rss+xml,application/xml,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${res.status} ${new URL(url).host}`);
  return res.text();
}

/** A failed source gives nothing; the others still count. */
async function safe<T>(p: Promise<T>, fallback: T, onError: (err: unknown) => void): Promise<T> {
  try {
    return await p;
  } catch (err) {
    onError(err);
    return fallback;
  }
}

/**
 * Fetches every source in parallel. `dailyDevToken` empty or 'none' skips daily.dev.
 * Never throws: the digest must not fail because a site is down.
 */
export async function fetchCommunity(now: number, dailyDevToken: string, fetchImpl: typeof fetch = fetch, onError: (err: unknown) => void = () => {}): Promise<Community> {
  const weekAgo = Math.floor((now - 7 * DAY) / 1000);
  const since = new Date(now - 7 * DAY).toISOString().slice(0, 10);
  const hn = safe(
    getJson(`https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=100&numericFilters=${encodeURIComponent(`created_at_i>${weekAgo},points>50`)}`, fetchImpl, {}, 30_000).then(parseHn),
    [],
    onError,
  );
  const lobsters = Promise.all(LOBSTERS_TAGS.map((t) => safe(getJson(`https://lobste.rs/t/${t}.json`, fetchImpl).then((j) => parseLobsters(j, now)), [], onError))).then((lists) =>
    lists.flat().sort((a, b) => b.score - a.score),
  );
  const token = dailyDevToken.trim();
  const daily =
    token && token !== 'none'
      ? safe(getJson('https://api.daily.dev/public/v1/feeds/foryou?limit=50', fetchImpl, { Authorization: `Bearer ${token}` }).then((j) => parseDailyDev(j, now)), [], onError)
      : Promise.resolve([]);
  const repos = Promise.all(
    REPO_TOPICS.map((t) =>
      safe(getJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(`topic:${t} created:>${since}`)}&sort=stars&order=desc&per_page=5`, fetchImpl).then(parseRepos), [], onError),
    ),
  ).then((lists) => lists.flat());
  const feeds = Promise.all(
    FEEDS.map((f) =>
      Promise.all(f.urls.map((u) => safe(getText(u, fetchImpl).then((x) => parseRss(x, f.site, now, f.paths)), [], onError))).then((lists) =>
        [...new Map(lists.flat().map((h) => [h.url, h])).values()].sort((a, b) => b.at - a.at),
      ),
    ),
  );
  const [h, l, d, r, f] = await Promise.all([hn, lobsters, daily, repos, feeds]);
  return pickCommunity([h, l, d], f, r);
}
