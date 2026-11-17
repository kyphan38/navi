// ============================================================
// navi - Cloud Functions: drills (start, answer, finish)
// Split out of index.ts; shared helpers live in shared.ts.
// ============================================================

import { getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import { DRILLS, ROUNDS, isDrillType, openLevels, type DrillLevel, type DrillType } from './drill/catalog.ts';
import { fakeAnswer, fakeFinish, fakeStart } from './drill/fake.ts';
import { ANSWER_SCHEMA, FINISH_SCHEMA, START_SCHEMA, buildAnswerPrompt, buildFinishPrompt, buildStartPrompt, cleanAnswer, parseAnswer, parseFinish, parseStart, type DrillKey, type Round } from './drill/prompts.ts';
import { GEMINI_MODEL_START, GEMINI_THINKING_START, GEMINI_MODEL_FINISH, GEMINI_THINKING_FINISH, thinkingOf, DAY, OPTS, guard, ask, loadProfile } from './shared.ts';
import { saveTerms } from './termFns.ts';

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

/** What a new drill is built from. `scenario`: a real problem (Ask a senior). `redoOf`: the low-score drill it redoes. */
export type StartInput = { type: DrillType; level: DrillLevel; topic?: string; scenario?: string; redoOf?: string; fromAsk?: string };

/** Checks the level is open for this type (from the learner's done drills). */
async function assertOpen(uid: string, type: DrillType, lvl: DrillLevel): Promise<void> {
  if (lvl === 'easy') return;
  // Two equality filters need no composite index; sort here.
  const past = await getFirestore().collection(`users/${uid}/drills`).where('type', '==', type).where('status', '==', 'done').get();
  const done = past.docs
    .map((d) => d.data() as { level: DrillLevel; score: Record<string, number | null> | null; doneAt: number | null })
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  if (!openLevels(done).includes(lvl)) throw new HttpsError('failed-precondition', 'Level not open yet');
}

/** Highest level open for this type. */
export async function highestOpen(uid: string, type: DrillType): Promise<DrillLevel> {
  const past = await getFirestore().collection(`users/${uid}/drills`).where('type', '==', type).where('status', '==', 'done').get();
  const done = past.docs.map((d) => d.data() as { level: DrillLevel; score: Record<string, number | null> | null; doneAt: number | null });
  const open = openLevels(done).filter((l) => (DRILLS[type].levels as readonly string[]).includes(l));
  return open[open.length - 1] ?? 'easy';
}

/** Writes the hidden story and round 1; drops any drill still active. Returns the new id. */
export async function startDrill(uid: string, input: StartInput): Promise<string> {
  const { type, level: lvl } = input;
  const spec = DRILLS[type];
  await assertOpen(uid, type, lvl);
  const topic = input.topic?.trim() ? input.topic.trim().slice(0, 200) : spec.topics[Math.floor(Math.random() * spec.topics.length)];
  const scenario = (input.scenario ?? '').trim().slice(0, 2000);

  const profile = await loadProfile(uid);
  const res = await ask(buildStartPrompt(profile, type, lvl, topic, scenario), START_SCHEMA, parseStart, () => fakeStart(type, lvl), {
    model: GEMINI_MODEL_START.value(),
    thinking: thinkingOf(GEMINI_THINKING_START.value()),
    temperature: 0.9,
  });

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
    ...(input.redoOf ? { redoOf: input.redoOf } : {}),
    ...(input.fromAsk ? { fromAsk: input.fromAsk } : {}),
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
  return ref.id;
}

const ID = /^[A-Za-z0-9]{1,40}$/;

/** New drill: hidden story + round 1. Drops any drill still active. `redoOf` marks a redo (V5). */
export const drillStart = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { type, level, topic, redoOf } = (req.data ?? {}) as Record<string, unknown>;
  if (!isDrillType(type)) throw new HttpsError('invalid-argument', 'Unknown drill type');
  const spec = DRILLS[type];
  if (typeof level !== 'string' || !(spec.levels as readonly string[]).includes(level)) throw new HttpsError('invalid-argument', 'Unknown level');
  if (redoOf !== undefined && (typeof redoOf !== 'string' || !ID.test(redoOf))) throw new HttpsError('invalid-argument', 'Bad drill id');
  const id = await startDrill(uid, {
    type,
    level: level as DrillLevel,
    topic: typeof topic === 'string' ? topic : undefined,
    redoOf: redoOf as string | undefined,
  });
  return { id };
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
    { thinking: 'default' },
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
    { model: GEMINI_MODEL_FINISH.value(), thinking: thinkingOf(GEMINI_THINKING_FINISH.value()), temperature: 0.4 },
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
      automate: res.automate,
      evenBetter: res.evenBetter,
      newTerms: res.newTerms.map((t) => t.name),
      doneAt: now,
    },
    updateTime,
  );
  await saveTerms(uid, res.newTerms, 'drill', ref.id);
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

// ------------------------------------------------------------------ terms (P2)
