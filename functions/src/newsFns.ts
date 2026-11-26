// ============================================================
// navi - Cloud Functions: weekly digest and news now
// Split out of index.ts; shared helpers live in shared.ts.
// ============================================================

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { onSchedule } from 'firebase-functions/scheduler';
import { generateGrounded } from './gemini.ts';
import { fetchCommunity } from './community.ts';
import { POSTMORTEM_SOURCES, sourceOf } from './sources.ts';
import { buildDigestPrompt, buildPostmortemPrompt, checkLink, fakeDigest, fakePostmortems, keepWorking, parseDigest, parsePostmortems, weekIdAt } from './news.ts';
import { GEMINI_API_KEY, DAILY_DEV_TOKEN, ALLOWED_USER_EMAIL, GEMINI_MODEL, OPTS, fakeAi, guard, modelError, loadProfile } from './shared.ts';

async function ground<T>(prompt: string, parse: (text: string) => T, fake: () => string): Promise<T> {
  if (fakeAi()) return parse(fake());
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      // A search over the trusted sources can take over 2 minutes; the function has 9.
      text = await generateGrounded(GEMINI_API_KEY.value(), GEMINI_MODEL.value(), prompt, 300_000);
    } catch (err) {
      logger.warn('grounded call failed', err instanceof Error ? err.message : String(err));
      throw modelError(err);
    }
    try {
      return parse(text);
    } catch (err) {
      lastErr = err;
    }
  }
  logger.error('grounded answer could not be parsed', lastErr instanceof Error ? lastErr.message : String(lastErr));
  throw new HttpsError('unavailable', 'Model answer was broken');
}

/**
 * This week's digest (up to 5 news items) and one public postmortem, every link
 * opened first. Saved to digests/{week}; used by the Sunday job and the button.
 */
async function buildDigest(uid: string): Promise<string> {
  const now = Date.now();
  const id = weekIdAt(now);
  const db = getFirestore();
  const col = db.collection('users').doc(uid).collection('digests');
  const [profile, recent] = await Promise.all([loadProfile(uid), col.orderBy('createdAt', 'desc').limit(8).get()]);
  // Never the same postmortem twice in a row of 8 weeks.
  const skip = recent.docs.map((d) => d.get('postmortem.title')).filter((t): t is string => typeof t === 'string');

  // One failed search keeps the other part; only both failing fails the digest.
  let failed = 0;
  const orNone = <T,>(p: Promise<T>, none: T) =>
    p.catch((err: unknown) => {
      failed++;
      if (failed === 2) throw err;
      return none;
    });
  const [items, pms, community] = await Promise.all([
    orNone(ground(buildDigestPrompt(profile.context, now), parseDigest, fakeDigest), [] as ReturnType<typeof parseDigest>),
    orNone(ground(buildPostmortemPrompt(profile.context, skip), parsePostmortems, fakePostmortems), [] as ReturnType<typeof parsePostmortems>),
    // No AI: titles and links from HN, Lobsters, daily.dev, GitHub and three RSS feeds.
    fetchCommunity(now, DAILY_DEV_TOKEN.value(), fetch, (err) => logger.warn('community source failed', err instanceof Error ? err.message : String(err))),
  ]);
  const check = (url: string) => checkLink(url);
  const news = await keepWorking(items, check);
  let postmortem = null;
  for (const p of pms) {
    if (skip.includes(p.title)) continue;
    const url = await check(p.url);
    const src = url ? sourceOf(url, POSTMORTEM_SOURCES) : null;
    if (url && src) {
      postmortem = { ...p, url, source: src.name };
      break;
    }
  }
  await col.doc(id).set({ items: news, postmortem, community, createdAt: now });
  logger.info('digest saved', {
    week: id,
    items: news.length,
    postmortem: !!postmortem,
    candidates: items.length,
    threads: community.threads.length,
    headlines: community.headlines.length,
    repos: community.repos.length,
  });
  return id;
}

/** Sunday 06:00 Vietnam time: the digest for the one allowed user. */
export const weeklyDigest = onSchedule(
  { schedule: '0 6 * * 0', timeZone: 'Asia/Ho_Chi_Minh', secrets: [GEMINI_API_KEY, DAILY_DEV_TOKEN], timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    const user = await getAuth().getUserByEmail(ALLOWED_USER_EMAIL.value());
    await buildDigest(user.uid);
  },
);

/** The same digest on demand (the News page button). At most once an hour. */
export const newsNow = onCall({ ...OPTS, secrets: [GEMINI_API_KEY, DAILY_DEV_TOKEN], timeoutSeconds: 540 }, async (req) => {
  const uid = guard(req.auth);
  const snap = await getFirestore().doc(`users/${uid}/digests/${weekIdAt(Date.now())}`).get();
  const at = snap.get('createdAt');
  if (typeof at === 'number' && Date.now() - at < 3_600_000) return { id: snap.id };
  return { id: await buildDigest(uid) };
});

/** Reads one month of the log and writes users/{uid}/months/{YYYY-MM}. Skips a month that already has one. */
