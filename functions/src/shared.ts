// ============================================================
// navi - Cloud Functions: shared setup and helpers (params, guard, model calls, profile)
// Split out of index.ts; shared helpers live in shared.ts.
// ============================================================

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger, setGlobalOptions } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { isAllowed } from './access.ts';
import { type Profile } from './drill/prompts.ts';
import { generateText, type Thinking } from './gemini.ts';

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 2 });
initializeApp();

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
/** daily.dev personal token for the community picks (the owner set it; 'none' in the emulator). */
export const DAILY_DEV_TOKEN = defineSecret('DAILY_DEV_TOKEN');
export const ALLOWED_USER_EMAIL = defineString('ALLOWED_USER_EMAIL');
// Model per step, chosen by the A/B of 2026-11-13 (scripts/ab-finish.mjs, README):
// writing the drill and scoring it use a strong model (once each, quality matters);
// the rounds use Flash low, because the learner waits on every round.
// GEMINI_THINKING_* = 'none' sends no thinking level (models without levels).
export const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-3.8-flash' });
export const GEMINI_MODEL_START = defineString('GEMINI_MODEL_START', { default: 'gemini-4-hydrogen' });
export const GEMINI_THINKING_START = defineString('GEMINI_THINKING_START', { default: 'none' });
export const GEMINI_MODEL_FINISH = defineString('GEMINI_MODEL_FINISH', { default: 'gemini-4-hydrogen' });
export const GEMINI_THINKING_FINISH = defineString('GEMINI_THINKING_FINISH', { default: 'none' });

export function thinkingOf(v: string): Thinking | undefined {
  return v === 'low' || v === 'medium' || v === 'high' ? v : undefined;
}

export const DAY = 86_400_000;
// A strong model once took 51 s to write a drill; leave room for one retry.
export const OPTS = { secrets: [GEMINI_API_KEY], timeoutSeconds: 180, memory: '512MiB' as const };

export const fakeAi = () => process.env.FUNCTIONS_EMULATOR === 'true' && process.env.NAVI_FAKE_AI === '1';

export function guard(auth: { uid: string; token: Parameters<typeof isAllowed>[0] } | undefined): string {
  if (!auth || !isAllowed(auth.token, ALLOWED_USER_EMAIL.value())) {
    throw new HttpsError('permission-denied', 'Not allowed');
  }
  return auth.uid;
}

/** Out of Gemini credit (HTTP 402 / 429) gets its own code so the app can say so. */
export function modelError(err: unknown): HttpsError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/"code":\s*(402|429)|RESOURCE_EXHAUSTED/.test(msg)) return new HttpsError('resource-exhausted', 'Model quota used up');
  return new HttpsError('unavailable', 'Model call failed');
}

/** One model call parsed by `parse`. A broken answer gets one more try. */
export async function ask<T>(
  prompt: string,
  schema: unknown,
  parse: (text: string) => T,
  fake: () => string,
  opts: { model?: string; thinking?: Thinking | 'default'; temperature?: number } = {},
): Promise<T> {
  if (fakeAi()) return parse(fake());
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      text = await generateText(GEMINI_API_KEY.value(), opts.model || GEMINI_MODEL.value(), prompt, {
        jsonSchema: schema,
        thinking: opts.thinking === 'default' ? 'low' : opts.thinking,
        temperature: opts.temperature ?? 0.7,
        timeoutMs: 85_000,
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

export const DEFAULT_PROFILE: Profile = {
  role: 'DevOps engineer',
  years: 2,
  context: 'payment app on AWS at a bank',
  focus: 'cloud security and reliability for payments',
};

export async function loadProfile(uid: string): Promise<Profile> {
  const snap = await getFirestore().doc(`users/${uid}/meta/profile`).get();
  const d = (snap.data() ?? {}) as Partial<Profile>;
  return {
    role: d.role || DEFAULT_PROFILE.role,
    years: typeof d.years === 'number' ? d.years : DEFAULT_PROFILE.years,
    context: d.context || DEFAULT_PROFILE.context,
    focus: d.focus || DEFAULT_PROFILE.focus,
  };
}
