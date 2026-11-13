// Calls to the Cloud Functions, with plain-English errors.

import { httpsCallable } from 'firebase/functions';

import { getFunctionsClient } from '@/lib/firebase-client';
import type { DrillLevel, DrillType } from '@/types/navi';

// Above the functions' 180 s limit is pointless; a strong model can take ~50 s.
const TIMEOUT = 175_000;

function call<In, Out>(name: string) {
  return (data: In) => httpsCallable<In, Out>(getFunctionsClient(), name, { timeout: TIMEOUT })(data).then((r) => r.data);
}

export const startDrill = call<{ type: DrillType; level: DrillLevel; topic?: string }, { id: string }>('drillStart');
export const answerDrill = call<{ drillId: string; answer: string }, { done: boolean }>('drillAnswer');
export const addTerms = call<{ names: string[]; source?: 'drill' | 'manual'; sourceId?: string }, { ids: string[] }>('termCard');
export type QuizQuestion = { question: string; options: string[]; answer: number; why: string };
export const quizTerm = call<{ termId: string }, { questions: QuizQuestion[] }>('termQuiz');
export const finishDrill = call<{ drillId: string }, { ok: boolean }>('drillFinish');

/** A short message for the screen. */
export function aiError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.endsWith('resource-exhausted')) return 'AI credit is used up.';
  if (code.endsWith('permission-denied')) return 'This account is not allowed.';
  if (code.endsWith('aborted')) return 'The drill changed. Reload the page.';
  if (code.endsWith('deadline-exceeded')) return 'AI took too long. Try again.';
  return 'AI is not reachable. Try again.';
}
