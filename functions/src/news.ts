// Weekly digest and postmortem of the week (P6). Pure except checkLink (network).
// The model searches the web (Google Search grounding), but its links are often
// slightly wrong (a 404 path), so every link is opened before it is saved.

import { PLAIN_ENGLISH } from './style.ts';

export type NewsItem = { title: string; url: string; source: string; group: 'banking' | 'outside'; why: string };
export type Postmortem = { title: string; url: string; source: string; summary: string; questions: string[] };

/** Items kept per digest (PLAN-navi.md: at most 5). */
export const MAX_ITEMS = 5;

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });

export function buildDigestPrompt(context: string, now: number): string {
  return `${PLAIN_ENGLISH}

Today is ${dateFmt.format(now)}. Search the web for news from the last 7 days that matter to a DevOps / SRE engineer
who works on a ${context}.
Find 8 candidates: 3 about banking or payments technology ("banking"), 5 about DevOps, SRE, cloud security,
AWS or AI for operations ("outside"). Prefer official sources (AWS, CNCF, vendors' blogs, big tech news sites).
Use the exact article URL you read, not a home page.

Return ONLY JSON, no other text:
{"items":[{"title":"","url":"","source":"","group":"banking or outside","why":""}]}
"why": one sentence, 20 words or less, starting with "For you:" - what it means for this engineer's daily work.`;
}

export function buildPostmortemPrompt(context: string, skip: string[]): string {
  return `${PLAIN_ENGLISH}

Search the web for real public postmortems (incident reports) from well-known companies (AWS, Cloudflare, GitHub,
Google Cloud, Slack, Atlassian, Stripe...). Pick 3 candidates that teach something useful to an engineer on a ${context}.
${skip.length ? `Do not pick these again: ${skip.join('; ')}.\n` : ''}Use the exact URL of the report.

Return ONLY JSON, no other text:
{"items":[{"title":"","url":"","source":"","summary":"","questions":["",""]}]}
"summary": 3-4 short sentences: what broke, why, how they fixed it.
"questions": 2 questions for the learner, like "How would you have found this sooner?".`;
}

/** The first JSON object in a model reply (it may wrap it in ``` fences or add words). */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON');
  return JSON.parse(text.slice(start, end + 1));
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

function httpUrl(v: unknown): string {
  const s = str(v, 1000);
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

export function parseDigest(text: string): NewsItem[] {
  const d = extractJson(text) as { items?: unknown };
  if (!Array.isArray(d.items)) throw new Error('No items');
  return d.items
    .map((raw): NewsItem | null => {
      const r = (raw ?? {}) as Record<string, unknown>;
      const url = httpUrl(r.url);
      const title = str(r.title, 300);
      if (!url || !title) return null;
      return { title, url, source: str(r.source, 100), group: r.group === 'banking' ? 'banking' : 'outside', why: str(r.why, 300) };
    })
    .filter((x): x is NewsItem => x !== null);
}

export function parsePostmortems(text: string): Postmortem[] {
  const d = extractJson(text) as { items?: unknown };
  if (!Array.isArray(d.items)) throw new Error('No items');
  return d.items
    .map((raw): Postmortem | null => {
      const r = (raw ?? {}) as Record<string, unknown>;
      const url = httpUrl(r.url);
      const title = str(r.title, 300);
      if (!url || !title) return null;
      const questions = Array.isArray(r.questions) ? r.questions.map((q) => str(q, 300)).filter(Boolean).slice(0, 2) : [];
      return { title, url, source: str(r.source, 100), summary: str(r.summary, 1200), questions };
    })
    .filter((x): x is Postmortem => x !== null);
}

/** A link is kept only when it opens with 2xx and is not just a home page. Returns the final URL. */
export async function checkLink(url: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchImpl(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; navi-link-check)', Accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status < 200 || res.status >= 300) return null;
    const final = new URL(res.url || url);
    if (final.pathname === '/' || final.pathname === '') return null;
    return final.toString();
  } catch {
    return null;
  }
}

/**
 * Up to 5 items with working links, at most 2 "banking", no repeated URL.
 * `check` returns the final URL or null.
 */
export async function keepWorking(items: NewsItem[], check: (url: string) => Promise<string | null>): Promise<NewsItem[]> {
  const checked = await Promise.all(items.map(async (i) => ({ ...i, url: (await check(i.url)) ?? '' })));
  const out: NewsItem[] = [];
  const seen = new Set<string>();
  for (const i of checked) {
    if (!i.url || seen.has(i.url)) continue;
    if (i.group === 'banking' && out.filter((x) => x.group === 'banking').length >= 2) continue;
    seen.add(i.url);
    out.push(i);
    if (out.length === MAX_ITEMS) break;
  }
  return out;
}

// ---------------------------------------------------------------- fakes (emulator, no key)

export function fakeDigest(): string {
  return JSON.stringify({
    items: [
      { title: 'AWS What is new', url: 'https://aws.amazon.com/new/', source: 'AWS', group: 'outside', why: 'For you: new AWS features each week.' },
      { title: 'Google SRE book', url: 'https://sre.google/sre-book/table-of-contents/', source: 'Google', group: 'outside', why: 'For you: the base of SRE work.' },
      { title: 'Broken link', url: 'https://aws.amazon.com/this-page-does-not-exist-navi/', source: 'AWS', group: 'banking', why: 'For you: should be dropped.' },
    ],
  });
}

export function fakePostmortems(): string {
  return JSON.stringify({
    items: [
      {
        title: 'Summary of the Amazon S3 service disruption (2017)',
        url: 'https://aws.amazon.com/message/41926/',
        source: 'AWS',
        summary: 'A command typed with a wrong value removed too many servers. S3 in one region went down for hours. They added limits to the tool.',
        questions: ['How would you stop one command from removing too much?', 'What would you tell customers in the first 15 minutes?'],
      },
    ],
  });
}

/** ISO week id 'YYYY-Www' for a moment, in Vietnam time (same weeks as the app). */
export function weekIdAt(now: number): string {
  const local = new Date(now + 7 * 3_600_000);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const week = Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
