// ============================================================
// navi - Cloud Functions: basics (PLAN-basics.md 7)
// basicsDaily (04:00) writes today's session ahead, so the learner never waits;
// basicsNow does the same on demand; basicsRewrite rewrites one lesson.
// ============================================================

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { onSchedule } from 'firebase-functions/scheduler';
import { CONCEPTS, conceptOf, isConceptId } from './basics/catalog.ts';
import { MAX_REVIEWS, deckStuck, levelFor, linkedConcept, nextKind, pickSession, vnDay, type StateLite } from './basics/pick.ts';
import { LESSON_SCHEMA, QUESTION_SCHEMA, buildLessonPrompt, buildQuestionPrompt, fakeLesson, fakeQuestion, parseLesson, parseQuestion } from './basics/prompts.ts';
import { ALLOWED_USER_EMAIL, GEMINI_API_KEY, GEMINI_MODEL_START, GEMINI_THINKING_START, OPTS, ask, guard, loadProfile, thinkingOf } from './shared.ts';

/** Lessons and questions are foundations: the strong model, low temperature. Nobody waits for them. */
const strong = () => ({ model: GEMINI_MODEL_START.value(), thinking: thinkingOf(GEMINI_THINKING_START.value()), temperature: 0.4 });
const MAX_REWRITES = 3;

async function loadStates(uid: string): Promise<Map<string, StateLite & { deck: string }>> {
  const snap = await getFirestore().collection(`users/${uid}/basics`).get();
  return new Map(snap.docs.map((d) => [d.id, d.data() as StateLite & { deck: string }]));
}

/** Names of concepts already started: the words a lesson or question may use freely. */
function knownNames(states: ReadonlyMap<string, StateLite>): string[] {
  return CONCEPTS.filter((c) => states.get(c.id) && states.get(c.id)!.status !== 'reading').map((c) => c.name);
}

async function writeLesson(uid: string, id: string, states: ReadonlyMap<string, StateLite>, role: string, version: number, note = ''): Promise<void> {
  const c = conceptOf(id)!;
  const lesson = await ask(buildLessonPrompt(c, knownNames(states), role, note), LESSON_SCHEMA, parseLesson, () => fakeLesson(c.name), strong());
  await getFirestore().doc(`users/${uid}/basicLessons/${id}`).set({ ...lesson, version, createdAt: Date.now() });
}

/** What the learner works on now (PLAN-basics.md 10): the running track, drills and terms of the last 7 days. */
async function loadWork(uid: string, now: number): Promise<{ track: Set<string>; drills: Set<string>; terms: string[] }> {
  const db = getFirestore();
  const since = now - 7 * 86_400_000;
  const [ms, drills, terms] = await Promise.all([
    db.collection(`users/${uid}/milestones`).where('kind', '==', 'track').get(),
    db.collection(`users/${uid}/drills`).where('doneAt', '>=', since).get(),
    db.collection(`users/${uid}/terms`).where('createdAt', '>=', since).get(),
  ]);
  const track = new Set<string>();
  for (const d of ms.docs) {
    if (d.get('doneAt') !== null) continue;
    for (const n of (d.get('needs') as { skillId: string }[] | undefined) ?? []) track.add(n.skillId);
  }
  const drillSkills = new Set<string>(drills.docs.flatMap((d) => (d.get('skillIds') as string[] | undefined) ?? []));
  return { track, drills: drillSkills, terms: terms.docs.map((d) => String(d.get('name') ?? '')).filter(Boolean) };
}

/**
 * Writes what today's session needs: the lesson for `next` and `spare` if missing,
 * one review question per due concept (skipped when already there), and the day doc.
 * Safe to run twice.
 */
export async function prepareDay(uid: string, now: number): Promise<string> {
  const db = getFirestore();
  const day = vnDay(now);
  const [states, profile] = await Promise.all([loadStates(uid), loadProfile(uid)]);
  const picked = pickSession(states, now);
  const { next, spare } = picked;
  const reviews = [...picked.reviews];
  // Fewer than 2 reviews due: one learned concept that fits what you work on now.
  const links = new Map<string, string>();
  if (reviews.length < MAX_REVIEWS) {
    const work = await loadWork(uid, now).catch((err) => {
      logger.warn('basics work signals failed', err instanceof Error ? err.message : String(err));
      return { track: new Set<string>(), drills: new Set<string>(), terms: [] as string[] };
    });
    const l = linkedConcept(states, { skills: new Set([...work.track, ...work.drills]), terms: work.terms }, reviews, now);
    if (l) {
      reviews.push(l.id);
      links.set(l.id, l.term ? `your term "${l.term}"` : l.skill && work.track.has(l.skill) ? 'your track' : 'a recent drill');
    }
  }

  const lessonIds = [next, spare].filter((x): x is string => !!x);
  const have = await Promise.all(lessonIds.map((id) => db.doc(`users/${uid}/basicLessons/${id}`).get()));
  const cardRefs = reviews.map((id) => db.doc(`users/${uid}/basicCards/${day}_${id}`));
  const cards = cardRefs.length ? await db.getAll(...cardRefs) : [];

  const jobs: Promise<unknown>[] = [];
  lessonIds.forEach((id, i) => {
    if (!have[i].exists) jobs.push(writeLesson(uid, id, states, profile.role, 1));
  });
  reviews.forEach((id, i) => {
    if (cards[i].exists) return;
    const c = conceptOf(id)!;
    const s = states.get(id)!;
    const kind = nextKind(s.lastKind);
    const base = levelFor(s.box);
    const level = (deckStuck(c.deck, states, now) ? Math.max(1, base - 1) : base) as 1 | 2 | 3;
    jobs.push(
      ask(buildQuestionPrompt(c, kind, level, knownNames(states), profile.role), QUESTION_SCHEMA, (t) => parseQuestion(t, kind), () => fakeQuestion(kind, c.name), strong()).then((q) =>
        cardRefs[i].set({ ...q, conceptId: id, level, link: links.get(id) ?? null, forDay: day, picked: null, sure: null, result: null, answeredAt: null, createdAt: Date.now() }),
      ),
    );
  });
  // One failed write keeps the others; the day doc lists only what exists.
  const results = await Promise.allSettled(jobs);
  results.forEach((r) => r.status === 'rejected' && logger.warn('basics item failed', r.reason instanceof Error ? r.reason.message : String(r.reason)));
  await db.doc(`users/${uid}/basicDays/${day}`).set({ next, spare, reviews, createdAt: Date.now() });
  logger.info('basics day', { day, reviews: reviews.length, next: !!next, spare: !!spare, failed: results.filter((r) => r.status === 'rejected').length });
  return day;
}

/** 04:00 Vietnam time: today's session for the one allowed user. */
export const basicsDaily = onSchedule(
  { schedule: '0 4 * * *', timeZone: 'Asia/Ho_Chi_Minh', secrets: [GEMINI_API_KEY], timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    const user = await getAuth().getUserByEmail(ALLOWED_USER_EMAIL.value());
    await prepareDay(user.uid, Date.now());
  },
);

/** "make now" when nothing is ready (or after "one more"). At most once a minute. */
export const basicsNow = onCall({ ...OPTS, timeoutSeconds: 300 }, async (req) => {
  const uid = guard(req.auth);
  const now = Date.now();
  const snap = await getFirestore().doc(`users/${uid}/basicDays/${vnDay(now)}`).get();
  const at = snap.get('createdAt');
  if (typeof at === 'number' && now - at < 60_000) return { day: snap.id };
  return { day: await prepareDay(uid, now) };
});

/** "looks wrong" on a lesson: write it again with the learner's note, at most 3 times. */
export const basicsRewrite = onCall({ ...OPTS, timeoutSeconds: 300 }, async (req) => {
  const uid = guard(req.auth);
  const { conceptId, note } = (req.data ?? {}) as { conceptId?: unknown; note?: unknown };
  if (!isConceptId(conceptId)) throw new HttpsError('invalid-argument', 'Unknown concept');
  const snap = await getFirestore().doc(`users/${uid}/basicLessons/${conceptId}`).get();
  const version = typeof snap.get('version') === 'number' ? (snap.get('version') as number) : 0;
  if (version > MAX_REWRITES) throw new HttpsError('resource-exhausted', 'Rewritten 3 times already');
  const [states, profile] = await Promise.all([loadStates(uid), loadProfile(uid)]);
  await writeLesson(uid, conceptId, states, profile.role, version + 1, typeof note === 'string' ? note.trim().slice(0, 300) : '');
  return { version: version + 1 };
});
