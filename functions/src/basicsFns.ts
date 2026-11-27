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
import { deckStuck, levelFor, nextKind, pickSession, vnDay, type StateLite } from './basics/pick.ts';
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

/**
 * Writes what today's session needs: the lesson for `next` and `spare` if missing,
 * one review question per due concept (skipped when already there), and the day doc.
 * Safe to run twice.
 */
export async function prepareDay(uid: string, now: number): Promise<string> {
  const db = getFirestore();
  const day = vnDay(now);
  const [states, profile] = await Promise.all([loadStates(uid), loadProfile(uid)]);
  const { reviews, next, spare } = pickSession(states, now);

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
        cardRefs[i].set({ ...q, conceptId: id, level, forDay: day, picked: null, sure: null, result: null, answeredAt: null, createdAt: Date.now() }),
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
