// ============================================================
// navi - Cloud Functions: mock interview (V1)
// users/{uid}/interviews/{id} is written here only; the app reads it.
// ============================================================

import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import type { Story } from './career.ts';
import {
  FEEDBACK_SCHEMA,
  TURN_SCHEMA,
  buildFeedbackPrompt,
  buildTurnPrompt,
  fakeFeedback,
  fakeTurn,
  interviewOver,
  isKind,
  parseFeedback,
  parseTurn,
  type InterviewKind,
  type Turn,
} from './interview.ts';
import { findInternalData } from './senior.ts';
import { GEMINI_MODEL_FINISH, GEMINI_THINKING_FINISH, OPTS, ask, guard, loadProfile, thinkingOf } from './shared.ts';

const ID = /^[A-Za-z0-9]{1,40}$/;
type Stored = { kind: InterviewKind; turns: Turn[]; status: 'active' | 'done'; feedback: unknown };

async function loadStories(uid: string): Promise<Story[]> {
  const snap = await getFirestore().collection(`users/${uid}/stories`).get();
  return snap.docs.map((d) => d.data() as Story).slice(0, 30);
}

async function nextTurn(uid: string, kind: InterviewKind, turns: Turn[]): Promise<Turn> {
  const [profile, stories] = await Promise.all([loadProfile(uid), kind === 'behavioral' ? loadStories(uid) : Promise.resolve([])]);
  const next = await ask(buildTurnPrompt(profile, kind, turns, stories), TURN_SCHEMA, (t) => parseTurn(t, turns), () => fakeTurn(turns), {
    thinking: 'low',
    temperature: 0.8,
  });
  return { q: next.question, a: null, followUp: next.followUp };
}

/** A new interview with its first question. */
export const interviewStart = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { kind } = (req.data ?? {}) as { kind?: unknown };
  if (!isKind(kind)) throw new HttpsError('invalid-argument', 'Unknown kind');
  const first = await nextTurn(uid, kind, []);
  const ref = getFirestore().collection(`users/${uid}/interviews`).doc();
  await ref.set({ kind, turns: [first], status: 'active', feedback: null, createdAt: Date.now(), doneAt: null });
  return { id: ref.id };
});

/** Saves the answer and asks the next question; `over` when all 5 main questions are answered. */
export const interviewAnswer = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { id, answer } = (req.data ?? {}) as { id?: unknown; answer?: unknown };
  if (typeof id !== 'string' || !ID.test(id)) throw new HttpsError('invalid-argument', 'Bad id');
  const a = typeof answer === 'string' ? answer.normalize('NFC').trim().slice(0, 4000) : '';
  if (!a) throw new HttpsError('invalid-argument', 'Empty answer');
  const found = findInternalData(a);
  if (found.length) throw new HttpsError('invalid-argument', `Remove internal data first: ${found.join(', ')}.`);
  const ref = getFirestore().doc(`users/${uid}/interviews/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'No such interview');
  const doc = snap.data() as Stored;
  if (doc.status !== 'active') throw new HttpsError('failed-precondition', 'Interview is over');
  const turns = doc.turns.map((t, i) => (i === doc.turns.length - 1 ? { ...t, a } : t));
  const over = interviewOver(turns);
  const next = over ? turns : [...turns, await nextTurn(uid, doc.kind, turns)];
  await ref.update({ turns: next }, { lastUpdateTime: snap.updateTime });
  return { over };
});

/** Feedback per main question, a better answer for each, and what to practise. */
export const interviewFinish = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { id } = (req.data ?? {}) as { id?: unknown };
  if (typeof id !== 'string' || !ID.test(id)) throw new HttpsError('invalid-argument', 'Bad id');
  const ref = getFirestore().doc(`users/${uid}/interviews/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'No such interview');
  const doc = snap.data() as Stored;
  if (doc.status === 'done') return { ok: true };
  if (!interviewOver(doc.turns)) throw new HttpsError('failed-precondition', 'Answer every question first');
  const [profile, stories] = await Promise.all([loadProfile(uid), doc.kind === 'behavioral' ? loadStories(uid) : Promise.resolve([])]);
  const feedback = await ask(buildFeedbackPrompt(profile, doc.kind, doc.turns, stories), FEEDBACK_SCHEMA, parseFeedback, fakeFeedback, {
    model: GEMINI_MODEL_FINISH.value(),
    thinking: thinkingOf(GEMINI_THINKING_FINISH.value()),
    temperature: 0.4,
  });
  await ref.update({ status: 'done', feedback, doneAt: Date.now() });
  return { ok: true };
});
