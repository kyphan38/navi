// ============================================================
// navi - Cloud Functions: ask a senior
// Split out of index.ts; shared helpers live in shared.ts.
// ============================================================

import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import { SENIOR_SCHEMA, buildSeniorPrompt, fakeSenior, findInternalData, parseSenior } from './senior.ts';
import { GEMINI_MODEL_FINISH, GEMINI_THINKING_FINISH, thinkingOf, OPTS, guard, ask, loadProfile } from './shared.ts';

export const askSenior = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { question: raw } = (req.data ?? {}) as { question?: unknown };
  const question = typeof raw === 'string' ? raw.normalize('NFC').trim() : '';
  if (question.length < 10) throw new HttpsError('invalid-argument', 'Write a bit more about the problem');
  if (question.length > 3000) throw new HttpsError('invalid-argument', 'Too long');
  const found = findInternalData(question);
  if (found.length) throw new HttpsError('invalid-argument', `Remove internal data first: ${found.join(', ')}.`);

  const profile = await loadProfile(uid);
  const answer = await ask(buildSeniorPrompt(question, profile.role, profile.years, profile.context), SENIOR_SCHEMA, parseSenior, fakeSenior, {
    model: GEMINI_MODEL_FINISH.value(),
    thinking: thinkingOf(GEMINI_THINKING_FINISH.value()),
    temperature: 0.5,
  });
  const ref = getFirestore().collection('users').doc(uid).collection('asks').doc();
  await ref.set({ question, answer, createdAt: Date.now() });
  return { id: ref.id };
});
