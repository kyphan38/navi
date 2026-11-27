// ============================================================
// navi - Cloud Functions: basics extras (PLAN-basics.md 10)
// basicsExplain grades "explain it back"; basicsLab writes a weekend lab once
// per concept. Neither changes skill levels: the app adds lab evidence when the
// learner says the lab is done.
// ============================================================

import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import { conceptOf, isConceptId } from './basics/catalog.ts';
import { EXPLAIN_SCHEMA, LAB_SCHEMA, buildExplainPrompt, buildLabPrompt, fakeExplain, fakeLab, parseExplain, parseLab } from './basics/extras.ts';
import { GEMINI_MODEL_FINISH, GEMINI_MODEL_START, GEMINI_THINKING_FINISH, GEMINI_THINKING_START, OPTS, ask, guard, loadProfile, thinkingOf } from './shared.ts';

export const basicsExplain = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { conceptId, text } = (req.data ?? {}) as { conceptId?: unknown; text?: unknown };
  if (!isConceptId(conceptId)) throw new HttpsError('invalid-argument', 'Unknown concept');
  const body = typeof text === 'string' ? text.trim().slice(0, 2000) : '';
  if (body.split(/\s+/).length < 12) throw new HttpsError('invalid-argument', 'Write at least 2-3 sentences.');
  const state = await getFirestore().doc(`users/${uid}/basics/${conceptId}`).get();
  if (!state.exists) throw new HttpsError('failed-precondition', 'Learn this concept first.');
  const grade = await ask(buildExplainPrompt(conceptOf(conceptId)!, body), EXPLAIN_SCHEMA, parseExplain, fakeExplain, {
    model: GEMINI_MODEL_FINISH.value(),
    thinking: thinkingOf(GEMINI_THINKING_FINISH.value()),
    temperature: 0.3,
  });
  return { grade };
});

/** The lab for one concept, written once and kept in users/{uid}/basicLabs/{conceptId}. */
export const basicsLab = onCall({ ...OPTS, timeoutSeconds: 300 }, async (req) => {
  const uid = guard(req.auth);
  const { conceptId } = (req.data ?? {}) as { conceptId?: unknown };
  if (!isConceptId(conceptId)) throw new HttpsError('invalid-argument', 'Unknown concept');
  const ref = getFirestore().doc(`users/${uid}/basicLabs/${conceptId}`);
  if ((await ref.get()).exists) return { ok: true };
  const profile = await loadProfile(uid);
  const lab = await ask(buildLabPrompt(conceptOf(conceptId)!, profile.role), LAB_SCHEMA, parseLab, fakeLab, {
    model: GEMINI_MODEL_START.value(),
    thinking: thinkingOf(GEMINI_THINKING_START.value()),
    temperature: 0.4,
  });
  await ref.set({ ...lab, createdAt: Date.now() });
  return { ok: true };
});
