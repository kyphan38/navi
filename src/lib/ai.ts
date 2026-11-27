// Calls to the Cloud Functions, with plain-English errors.

import { httpsCallable } from 'firebase/functions';

import { getFunctionsClient } from '@/lib/firebase-client';
import type { DrillLevel, DrillType } from '@/types/navi';

// Above the functions' 180 s limit is pointless; a strong model can take ~50 s.
const TIMEOUT = 175_000;

function call<In, Out>(name: string, timeout = TIMEOUT) {
  return (data: In) => httpsCallable<In, Out>(getFunctionsClient(), name, { timeout })(data).then((r) => r.data);
}

export const startDrill = call<{ type: DrillType; level: DrillLevel; topic?: string; redoOf?: string; skillId?: string }, { id: string }>('drillStart');
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
  // The server's own words say what to fix (internal data, a step to do first).
  if (code.endsWith('invalid-argument') || code.endsWith('failed-precondition')) {
    const m = (err as { message?: string })?.message;
    if (m) return m;
  }
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

// --- career tools ---
export const drillFromAsk = call<{ askId: string }, { id: string }>('drillFromAsk');
export const drillFromPostmortem = call<{ weekId: string }, { id: string }>('drillFromPostmortem');
export type StoryDraft = { title: string; situation: string; task: string; action: string; result: string };
export const storyDraft = call<{ kind: 'drill' | 'work'; source: string }, StoryDraft>('storyDraft');
export type ExamQuestion = { question: string; options: string[]; answers: number[]; why: string };
export const moduleExam = call<{ courseTitle: string; goal: string; section: string; title: string; doneWhen: string }, { questions: ExamQuestion[] }>('moduleExam');
export const bragDoc = call<{ quarter: string; facts: string }, { markdown: string }>('bragDoc');
export const roleNeeds = call<{ role: string }, { needs: { skillId: string; level: number }[] }>('roleNeeds');
export const interviewStart = call<{ kind: 'troubleshooting' | 'design' | 'behavioral' }, { id: string }>('interviewStart');
export const interviewAnswer = call<{ id: string; answer: string }, { over: boolean }>('interviewAnswer');
export const interviewFinish = call<{ id: string }, { ok: boolean }>('interviewFinish');

// Basics (PLAN-basics.md 7): these two run for up to 300 s on the server.
export const basicsNow = call<Record<string, never>, { day: string }>('basicsNow', 295_000);
export const basicsRewrite = call<{ conceptId: string; note?: string }, { version: number }>('basicsRewrite', 295_000);
export const basicsExplain = call<{ conceptId: string; text: string }, { grade: { pass: boolean; good: string; missing: string[]; better: string } }>('basicsExplain');
export const basicsLab = call<{ conceptId: string }, { ok: boolean }>('basicsLab', 295_000);
