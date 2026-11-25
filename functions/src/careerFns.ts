// ============================================================
// navi - Cloud Functions: career tools
// drillFromAsk (V7), drillFromPostmortem, storyDraft (V2), moduleExam (V4), bragDoc (V3), roleNeeds (V10).
// Nothing here stores text except drillFromAsk (it starts a drill). The app saves
// stories and the role itself, after the learner checks them.
// ============================================================

import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import {
  EXAM_SCHEMA,
  PICK_SCHEMA,
  ROLE_SCHEMA,
  STORY_SCHEMA,
  buildBragPrompt,
  buildExamPrompt,
  buildPickPrompt,
  buildRolePrompt,
  buildStoryPrompt,
  fakeBrag,
  fakeExam,
  fakePick,
  fakeRole,
  fakeStory,
  parseExam,
  parsePick,
  parseRole,
  parseStory,
} from './career.ts';
import { highestOpen, startDrill } from './drills.ts';
import { findInternalData } from './senior.ts';
import { OPTS, ask, guard, loadProfile } from './shared.ts';

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.normalize('NFC').trim().slice(0, max) : '');
const ID = /^[A-Za-z0-9]{1,40}$/;

/** "practice this" under an Ask a senior answer: the best drill type, at the highest open level. */
export const drillFromAsk = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { askId } = (req.data ?? {}) as { askId?: unknown };
  if (typeof askId !== 'string' || !ID.test(askId)) throw new HttpsError('invalid-argument', 'Bad id');
  const snap = await getFirestore().doc(`users/${uid}/asks/${askId}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'No such question');
  const question = text(snap.data()?.question, 3000);
  const pick = await ask(buildPickPrompt(question), PICK_SCHEMA, parsePick, fakePick, { thinking: 'low', temperature: 0.2 });
  const level = await highestOpen(uid, pick.type);
  const id = await startDrill(uid, { type: pick.type, level, topic: pick.topic, scenario: question, fromAsk: askId });
  return { id };
});

/** "practice this" under the postmortem of the week: replay the real incident as a drill. */
export const drillFromPostmortem = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { weekId } = (req.data ?? {}) as { weekId?: unknown };
  if (typeof weekId !== 'string' || !/^[0-9W-]{1,20}$/.test(weekId)) throw new HttpsError('invalid-argument', 'Bad id');
  const snap = await getFirestore().doc(`users/${uid}/digests/${weekId}`).get();
  const pm = snap.get('postmortem') as { title?: unknown; source?: unknown; summary?: unknown } | null | undefined;
  if (!pm) throw new HttpsError('not-found', 'No postmortem this week');
  const scenario = [text(pm.title, 300), text(pm.source, 100), text(pm.summary, 2000)].filter(Boolean).join('\n');
  const level = await highestOpen(uid, 'incident');
  const id = await startDrill(uid, { type: 'incident', level, topic: text(pm.title, 200), scenario, source: 'postmortem' });
  return { id };
});

/** A STAR story draft from a finished drill or a "used at work" note. Not saved. */
export const storyDraft = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { kind, source } = (req.data ?? {}) as { kind?: unknown; source?: unknown };
  if (kind !== 'drill' && kind !== 'work') throw new HttpsError('invalid-argument', 'Bad kind');
  const src = text(source, 8000);
  if (src.length < 10) throw new HttpsError('invalid-argument', 'Nothing to write from');
  const found = findInternalData(src);
  if (found.length) throw new HttpsError('invalid-argument', `Remove internal data first: ${found.join(', ')}.`);
  const profile = await loadProfile(uid);
  return ask(buildStoryPrompt(profile, kind, src), STORY_SCHEMA, parseStory, fakeStory, { thinking: 'low', temperature: 0.5 });
});

/** 5 exam-style questions for one course module. Not saved; wrong ones go to review in the app. */
export const moduleExam = onCall(OPTS, async (req) => {
  guard(req.auth);
  const d = (req.data ?? {}) as Record<string, unknown>;
  const course = { title: text(d.courseTitle, 300), goal: text(d.goal, 300) };
  const mod = { section: text(d.section, 300), title: text(d.title, 300), doneWhen: text(d.doneWhen, 500) };
  if (!course.title || !mod.title) throw new HttpsError('invalid-argument', 'Missing course or module');
  const questions = await ask(buildExamPrompt(course, mod), EXAM_SCHEMA, parseExam, fakeExam, { thinking: 'low', temperature: 0.6 });
  return { questions };
});

const BRAG_SCHEMA = { type: 'object', properties: { markdown: { type: 'string' } }, required: ['markdown'] };

/** One-page brag doc for a quarter, written only from the facts the app gathered. Not saved. */
export const bragDoc = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { quarter, facts } = (req.data ?? {}) as { quarter?: unknown; facts?: unknown };
  const q = text(quarter, 20);
  const f = text(facts, 12000);
  if (!/^\d{4}-Q[1-4]$/.test(q)) throw new HttpsError('invalid-argument', 'Bad quarter');
  if (f.length < 10) throw new HttpsError('invalid-argument', 'No facts for this quarter');
  const profile = await loadProfile(uid);
  const parse = (t: string) => {
    const md = String((JSON.parse(t) as { markdown?: unknown }).markdown ?? '').trim();
    if (!md) throw new Error('Empty');
    return md.slice(0, 8000);
  };
  const markdown = await ask(buildBragPrompt(profile, q.replace('-', ' '), f), BRAG_SCHEMA, parse, () => JSON.stringify({ markdown: fakeBrag() }), {
    thinking: 'low',
    temperature: 0.4,
  });
  return { markdown };
});

/** Skills and levels a target role needs, picked from the learner's skill list. Not saved. */
export const roleNeeds = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const role = text((req.data as { role?: unknown } | undefined)?.role, 120);
  if (role.length < 3) throw new HttpsError('invalid-argument', 'Write the role');
  const snap = await getFirestore().collection(`users/${uid}/skills`).get();
  const skills = snap.docs.map((s) => ({ id: s.id, name: String(s.data().name ?? ''), area: String(s.data().area ?? '') }));
  if (skills.length === 0) throw new HttpsError('failed-precondition', 'Open the Map once first');
  const ids = new Set(skills.map((s) => s.id));
  const profile = await loadProfile(uid);
  const needs = await ask(buildRolePrompt(profile, role, skills), ROLE_SCHEMA, (t) => parseRole(t, ids), () => fakeRole([...ids]), {
    thinking: 'low',
    temperature: 0.3,
  });
  return { needs };
});
