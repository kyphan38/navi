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

export type SplitModule = { section: string; title: string; minutes: number; kind: 'lesson' | 'demo' | 'quiz' | 'exam'; doneWhen: string };
// A long course runs in parts on the server; allow up to 5 minutes.
export const splitCourse = (data: { text: string }) =>
  httpsCallable<{ text: string }, { modules: SplitModule[] }>(getFunctionsClient(), 'courseSplit', { timeout: 300_000 })(data).then((r) => r.data);

export const tagSkills = (data: Record<string, never> = {}) =>
  httpsCallable<Record<string, never>, { tagged: number }>(getFunctionsClient(), 'skillTag', { timeout: 300_000 })(data).then((r) => r.data);

export type Turn = { question: string; answer?: string };
export type Grade = { pass: boolean; feedback: string; gaps: string[] };
export const explainBack = call<{ skillId: string; turns: Turn[] }, { question?: string; grade?: Grade }>('explainBack');

// The digest searches the web and opens every link: allow up to 9 minutes.
export const newsNow = (data: Record<string, never> = {}) =>
  httpsCallable<Record<string, never>, { id: string }>(getFunctionsClient(), 'newsNow', { timeout: 540_000 })(data).then((r) => r.data);
export const askSenior = call<{ question: string }, { id: string }>('askSenior');
