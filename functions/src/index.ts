// ============================================================
// navi - Cloud Functions: drills (P1)
//
// The site stays a static export. These functions exist because the Gemini key
// must not reach the browser, and because the hidden drill answer (drillKeys)
// must never be readable by the client. They check the same email as
// firestore.rules and log no content, only errors.
// ============================================================

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import { logger, setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineSecret, defineString } from 'firebase-functions/params';

import { isAllowed } from './access.ts';
import { DRILLS, ROUNDS, isDrillType, type DrillLevel, type DrillType } from './drill/catalog.ts';
import { fakeAnswer, fakeFinish, fakeStart } from './drill/fake.ts';
import {
  ANSWER_SCHEMA,
  FINISH_SCHEMA,
  START_SCHEMA,
  buildAnswerPrompt,
  buildFinishPrompt,
  buildStartPrompt,
  cleanAnswer,
  parseAnswer,
  parseFinish,
  parseStart,
  type DrillKey,
  type Profile,
  type Round,
} from './drill/prompts.ts';
import { generateText, type Thinking } from './gemini.ts';

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 2 });
initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const ALLOWED_USER_EMAIL = defineString('ALLOWED_USER_EMAIL');
// Flash low by default (ws/app rule); move up only after the A/B in scripts/ab-finish.mjs.
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-3.8-flash' });
const GEMINI_MODEL_FINISH = defineString('GEMINI_MODEL_FINISH', { default: '' });
const GEMINI_THINKING_FINISH = defineString('GEMINI_THINKING_FINISH', { default: 'low' });

const DAY = 86_400_000;
const OPTS = { secrets: [GEMINI_API_KEY], timeoutSeconds: 90, memory: '512MiB' as const };

const fakeAi = () => process.env.FUNCTIONS_EMULATOR === 'true' && process.env.NAVI_FAKE_AI === '1';

function guard(auth: { uid: string; token: Parameters<typeof isAllowed>[0] } | undefined): string {
  if (!auth || !isAllowed(auth.token, ALLOWED_USER_EMAIL.value())) {
    throw new HttpsError('permission-denied', 'Not allowed');
  }
  return auth.uid;
}

/** Out of Gemini credit (HTTP 402 / 429) gets its own code so the app can say so. */
function modelError(err: unknown): HttpsError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/"code":\s*(402|429)|RESOURCE_EXHAUSTED/.test(msg)) return new HttpsError('resource-exhausted', 'Model quota used up');
  return new HttpsError('unavailable', 'Model call failed');
}

/** One model call parsed by `parse`. A broken answer gets one more try. */
async function ask<T>(
  prompt: string,
  schema: unknown,
  parse: (text: string) => T,
  fake: () => string,
  opts: { model?: string; thinking?: Thinking; temperature?: number } = {},
): Promise<T> {
  if (fakeAi()) return parse(fake());
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      text = await generateText(GEMINI_API_KEY.value(), opts.model || GEMINI_MODEL.value(), prompt, {
        jsonSchema: schema,
        thinking: opts.thinking ?? 'low',
        temperature: opts.temperature ?? 0.7,
        timeoutMs: 80_000,
      });
    } catch (err) {
      throw modelError(err);
    }
    try {
      return parse(text);
    } catch (err) {
      lastErr = err;
    }
  }
  logger.error('model answer could not be parsed', lastErr instanceof Error ? lastErr.message : String(lastErr));
  throw new HttpsError('unavailable', 'Model answer was broken');
}

const DEFAULT_PROFILE: Profile = {
  role: 'DevOps engineer',
  years: 2,
  context: 'payment app on AWS at a bank',
  focus: 'cloud security and reliability for payments',
};

async function loadProfile(uid: string): Promise<Profile> {
  const snap = await getFirestore().doc(`users/${uid}/meta/profile`).get();
  const d = (snap.data() ?? {}) as Partial<Profile>;
  return {
    role: d.role || DEFAULT_PROFILE.role,
    years: typeof d.years === 'number' ? d.years : DEFAULT_PROFILE.years,
    context: d.context || DEFAULT_PROFILE.context,
    focus: d.focus || DEFAULT_PROFILE.focus,
  };
}

type StoredDrill = {
  type: DrillType;
  level: DrillLevel;
  brief: string;
  rounds: Round[];
  status: 'active' | 'done' | 'dropped';
};

async function loadActive(uid: string, drillId: unknown) {
  if (typeof drillId !== 'string' || !/^[A-Za-z0-9]{1,40}$/.test(drillId)) throw new HttpsError('invalid-argument', 'Bad drill id');
  const user = getFirestore().collection('users').doc(uid);
  const ref = user.collection('drills').doc(drillId);
  const [snap, keySnap] = await Promise.all([ref.get(), user.collection('drillKeys').doc(drillId).get()]);
  if (!snap.exists || !keySnap.exists) throw new HttpsError('not-found', 'No such drill');
  const drill = snap.data() as StoredDrill;
  if (drill.status !== 'active') throw new HttpsError('failed-precondition', 'Drill is not active');
  return { ref, drill, key: keySnap.data() as DrillKey, updateTime: snap.updateTime! };
}

/** Writes only if nobody changed the drill since it was read (a double tap sends twice). */
async function writeIfSame(ref: DocumentReference, data: Record<string, unknown>, updateTime: FirebaseFirestore.Timestamp) {
  try {
    await ref.update(data, { lastUpdateTime: updateTime });
  } catch (err) {
    if ((err as { code?: number }).code === 9) throw new HttpsError('aborted', 'Drill changed, reload');
    throw err;
  }
}

/** New drill: hidden story + round 1. Drops any drill still active. */
export const drillStart = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { type, level, topic: rawTopic } = (req.data ?? {}) as Record<string, unknown>;
  if (!isDrillType(type)) throw new HttpsError('invalid-argument', 'Unknown drill type');
  const spec = DRILLS[type];
  if (typeof level !== 'string' || !(spec.levels as readonly string[]).includes(level)) throw new HttpsError('invalid-argument', 'Level not open');
  const lvl = level as DrillLevel;
  const topic =
    typeof rawTopic === 'string' && rawTopic.trim()
      ? rawTopic.trim().slice(0, 200)
      : spec.topics[Math.floor(Math.random() * spec.topics.length)];

  const profile = await loadProfile(uid);
  const res = await ask(buildStartPrompt(profile, type, lvl, topic), START_SCHEMA, parseStart, () => fakeStart(type, lvl), { temperature: 0.9 });

  const db = getFirestore();
  const user = db.collection('users').doc(uid);
  const active = await user.collection('drills').where('status', '==', 'active').get();
  const ref = user.collection('drills').doc();
  const now = Date.now();
  const batch = db.batch();
  active.docs.forEach((d) => batch.update(d.ref, { status: 'dropped' }));
  batch.set(ref, {
    group: spec.group,
    type,
    level: lvl,
    topic: res.topic,
    skillIds: [],
    clock: res.clock,
    brief: res.brief,
    rounds: [res.round],
    status: 'active',
    score: null,
    debrief: null,
    seniorPath: null,
    whatIf: [],
    newTerms: [],
    startedAt: now,
    doneAt: null,
  });
  batch.set(user.collection('drillKeys').doc(ref.id), {
    truth: res.truth,
    seniorPath: res.seniorPath,
    rubric: res.rubric,
    outline: res.outline,
  });
  await batch.commit();
  return { id: ref.id };
});

/** Saves the answer to the last round; returns `done` when it was the last one. */
export const drillAnswer = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { drillId, answer } = (req.data ?? {}) as Record<string, unknown>;
  let text: string;
  try {
    text = cleanAnswer(answer);
  } catch (err) {
    throw new HttpsError('invalid-argument', err instanceof Error ? err.message : 'Bad answer');
  }
  const { ref, drill, key, updateTime } = await loadActive(uid, drillId);
  const rounds = drill.rounds.slice();
  const last = rounds[rounds.length - 1];
  if (!last || last.answer) throw new HttpsError('failed-precondition', 'Round already answered');
  rounds[rounds.length - 1] = { ...last, answer: text };

  if (rounds.length >= ROUNDS[drill.level]) {
    await writeIfSame(ref, { rounds }, updateTime);
    return { done: true };
  }

  const profile = await loadProfile(uid);
  const res = await ask(
    buildAnswerPrompt(profile, drill.type, drill.level, drill.brief, key, rounds),
    ANSWER_SCHEMA,
    parseAnswer,
    () => fakeAnswer(rounds.length, drill.level),
  );
  rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], reveal: res.reveal };
  rounds.push(res.round);
  await writeIfSame(ref, { rounds }, updateTime);
  return { done: false };
});

/** Scores the finished drill, writes the debrief and the mistakes. */
export const drillFinish = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { drillId } = (req.data ?? {}) as Record<string, unknown>;
  const { ref, drill, key, updateTime } = await loadActive(uid, drillId);
  const answered = drill.rounds.filter((r) => r.answer).length;
  if (answered < ROUNDS[drill.level]) throw new HttpsError('failed-precondition', 'Drill is not finished');

  const profile = await loadProfile(uid);
  const res = await ask(
    buildFinishPrompt(profile, drill.type, drill.level, drill.brief, key, drill.rounds),
    FINISH_SCHEMA,
    (t) => parseFinish(t, drill.type),
    fakeFinish,
    { model: GEMINI_MODEL_FINISH.value(), thinking: GEMINI_THINKING_FINISH.value() as Thinking, temperature: 0.4 },
  );

  const now = Date.now();
  const db = getFirestore();
  await writeIfSame(
    ref,
    {
      status: 'done',
      score: res.scores,
      debrief: res.debrief,
      seniorPath: res.seniorPath || key.seniorPath,
      whatIf: res.whatIf,
      newTerms: res.newTerms,
      doneAt: now,
    },
    updateTime,
  );
  if (res.mistakes.length) {
    const batch = db.batch();
    const mistakes = db.collection('users').doc(uid).collection('mistakes');
    for (const m of res.mistakes) {
      batch.set(mistakes.doc(), {
        drillId: ref.id,
        skillId: null,
        text: m.text,
        lesson: m.lesson,
        box: 1,
        nextReviewAt: now + DAY,
        createdAt: now,
      });
    }
    await batch.commit();
  }
  return { ok: true };
});
