// ============================================================
// navi - Cloud Functions: drills (P1)
//
// The site stays a static export. These functions exist because the Gemini key
// must not reach the browser, and because the hidden drill answer (drillKeys)
// must never be readable by the client. They check the same email as
// firestore.rules and log no content, only errors.
// ============================================================

import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import { logger, setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineSecret, defineString } from 'firebase-functions/params';

import { isAllowed } from './access.ts';
import {
  EXPLAIN_TURNS,
  GRADE_SCHEMA,
  QUESTION_SCHEMA,
  TAG_SCHEMA,
  buildGradePrompt,
  buildQuestionPrompt,
  buildTagPrompt,
  cleanTurns,
  fakeGrade,
  fakeQuestion,
  fakeTags,
  parseGrade,
  parseQuestion,
  parseTags,
  type TagItem,
} from './skills.ts';
import { MAX_TOC, SPLIT_SCHEMA, buildSplitPrompt, chunkToc, fakeSplit, parseSplit, type SplitModule } from './course.ts';
import { DRILLS, ROUNDS, isDrillType, openLevels, type DrillLevel, type DrillType } from './drill/catalog.ts';
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
import {
  CARDS_SCHEMA,
  QUIZ_SCHEMA,
  buildCardPrompt,
  buildQuizPrompt,
  cleanTermName,
  fakeCards,
  fakeQuiz,
  parseCards,
  parseQuiz,
  termId,
  type TermCard,
} from './terms.ts';

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 2 });
initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const ALLOWED_USER_EMAIL = defineString('ALLOWED_USER_EMAIL');
// Model per step, chosen by the A/B of 2026-11-13 (scripts/ab-finish.mjs, README):
// writing the drill and scoring it use a strong model (once each, quality matters);
// the rounds use Flash low, because the learner waits on every round.
// GEMINI_THINKING_* = 'none' sends no thinking level (models without levels).
const GEMINI_MODEL = defineString('GEMINI_MODEL', { default: 'gemini-3.8-flash' });
const GEMINI_MODEL_START = defineString('GEMINI_MODEL_START', { default: 'gemini-4-hydrogen' });
const GEMINI_THINKING_START = defineString('GEMINI_THINKING_START', { default: 'none' });
const GEMINI_MODEL_FINISH = defineString('GEMINI_MODEL_FINISH', { default: 'gemini-4-hydrogen' });
const GEMINI_THINKING_FINISH = defineString('GEMINI_THINKING_FINISH', { default: 'none' });

function thinkingOf(v: string): Thinking | undefined {
  return v === 'low' || v === 'medium' || v === 'high' ? v : undefined;
}

const DAY = 86_400_000;
// A strong model once took 51 s to write a drill; leave room for one retry.
const OPTS = { secrets: [GEMINI_API_KEY], timeoutSeconds: 180, memory: '512MiB' as const };

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
  if (typeof level !== 'string' || !(spec.levels as readonly string[]).includes(level)) throw new HttpsError('invalid-argument', 'Unknown level');
  const lvl = level as DrillLevel;
  if (lvl !== 'easy') {
    // Two equality filters need no composite index; sort here.
    const past = await getFirestore().collection(`users/${uid}/drills`).where('type', '==', type).where('status', '==', 'done').get();
    const done = past.docs
      .map((d) => d.data() as { level: DrillLevel; score: Record<string, number | null> | null; doneAt: number | null })
      .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
    if (!openLevels(done).includes(lvl)) throw new HttpsError('failed-precondition', 'Level not open yet');
  }
  const topic =
    typeof rawTopic === 'string' && rawTopic.trim()
      ? rawTopic.trim().slice(0, 200)
      : spec.topics[Math.floor(Math.random() * spec.topics.length)];

  const profile = await loadProfile(uid);
  const res = await ask(buildStartPrompt(profile, type, lvl, topic), START_SCHEMA, parseStart, () => fakeStart(type, lvl), {
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

/** Saves cards as new terms; a term that already exists is left as it is. Returns the ids. */
async function saveTerms(uid: string, cards: TermCard[], source: 'drill' | 'manual', sourceId: string | null): Promise<string[]> {
  const usable = cards.filter((c) => termId(c.name));
  if (!usable.length) return [];
  const db = getFirestore();
  const col = db.collection('users').doc(uid).collection('terms');
  const refs = usable.map((c) => col.doc(termId(c.name)));
  const snaps = await db.getAll(...refs);
  const now = Date.now();
  const batch = db.batch();
  snaps.forEach((snap, i) => {
    if (snap.exists) return;
    const c = usable[i];
    batch.set(refs[i], {
      name: c.name,
      area: c.area,
      oneLine: c.oneLine,
      checklist: { what: false, how: false, when: false, mistakes: false, related: false },
      status: 'new',
      source,
      sourceId,
      box: 1,
      nextReviewAt: null,
      createdAt: now,
      updatedAt: now,
    });
  });
  await batch.commit();
  return refs.map((r) => r.id);
}

/** Up to 10 term names -> saved cards (name, area, one-line meaning). */
export const termCard = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const raw = (req.data ?? {}) as { names?: unknown; source?: unknown; sourceId?: unknown };
  const names = [...new Map((Array.isArray(raw.names) ? raw.names : []).map(cleanTermName).filter((n) => termId(n)).map((n) => [termId(n), n])).values()].slice(0, 10);
  if (!names.length) throw new HttpsError('invalid-argument', 'No term names');
  const source = raw.source === 'drill' ? 'drill' : 'manual';
  const sourceId = typeof raw.sourceId === 'string' && /^[A-Za-z0-9]{1,40}$/.test(raw.sourceId) ? raw.sourceId : null;

  const profile = await loadProfile(uid);
  const cards = await ask(buildCardPrompt(names, profile.context), CARDS_SCHEMA, parseCards, () => fakeCards(names), { thinking: 'default', temperature: 0.3 });
  // Keep the learner's spelling of the name; the model only adds area and meaning.
  const byId = new Map(cards.map((c) => [termId(c.name), c]));
  const merged = names.map((n, i) => ({ ...(byId.get(termId(n)) ?? cards[i] ?? { area: 'Other' as const, oneLine: '' }), name: n })).filter((c) => c.oneLine);
  return { ids: await saveTerms(uid, merged, source, sourceId) };
});

/** 3 quick multiple-choice questions about one saved term. Nothing is stored. */
export const termQuiz = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { termId: id } = (req.data ?? {}) as { termId?: unknown };
  if (typeof id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(id)) throw new HttpsError('invalid-argument', 'Bad term id');
  const snap = await getFirestore().doc(`users/${uid}/terms/${id}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'No such term');
  const term = snap.data() as { name: string; oneLine: string };
  const profile = await loadProfile(uid);
  const questions = await ask(buildQuizPrompt(term.name, term.oneLine, profile.context), QUIZ_SCHEMA, parseQuiz, () => fakeQuiz(term.name), {
    thinking: 'default',
    temperature: 0.7,
  });
  return { questions };
});

// ------------------------------------------------------------------ course (P3)

/**
 * Pasted table of contents -> modules (not saved: the learner checks them first).
 * Long courses are split into parts that run 3 at a time.
 */
export const courseSplit = onCall({ ...OPTS, timeoutSeconds: 300 }, async (req) => {
  guard(req.auth);
  const { text } = (req.data ?? {}) as { text?: unknown };
  if (typeof text !== 'string' || !text.trim()) throw new HttpsError('invalid-argument', 'Paste the course contents first');
  if (text.length > MAX_TOC) throw new HttpsError('invalid-argument', 'Too long');
  const parts = chunkToc(text.normalize('NFC'));
  const out: SplitModule[][] = new Array(parts.length);
  for (let i = 0; i < parts.length; i += 3) {
    await Promise.all(
      parts.slice(i, i + 3).map(async (part, j) => {
        out[i + j] = await ask(buildSplitPrompt(part, i + j + 1, parts.length), SPLIT_SCHEMA, parseSplit, () => fakeSplit(part), {
          thinking: 'default',
          temperature: 0.2,
        });
      }),
    );
  }
  const modules = out.flat().slice(0, 600);
  if (!modules.length) throw new HttpsError('invalid-argument', 'No lessons found');
  return { modules };
});

// ------------------------------------------------------------------ skills (P4)

/**
 * Tags course modules (once per course) and finished drills (once each) with
 * skill ids from the learner's skills. Runs when the Map opens and finds
 * untagged items. Items are sent 150 at a time.
 */
export const skillTag = onCall({ ...OPTS, timeoutSeconds: 300 }, async (req) => {
  const uid = guard(req.auth);
  const db = getFirestore();
  const user = db.collection('users').doc(uid);
  const [skillSnap, courseSnap, drillSnap] = await Promise.all([
    user.collection('skills').get(),
    user.collection('courses').get(),
    user.collection('drills').where('status', '==', 'done').get(),
  ]);
  const skills = skillSnap.docs.map((d) => ({ id: d.id, name: String(d.get('name') ?? d.id) }));
  if (!skills.length) throw new HttpsError('failed-precondition', 'No skills yet');
  const skillIds = new Set(skills.map((s) => s.id));

  const courses = courseSnap.docs.filter((d) => !d.get('taggedAt'));
  const drills = drillSnap.docs.filter((d) => d.get('tagged') !== true);
  const items: TagItem[] = [
    ...courses.flatMap((c) =>
      (c.get('modules') as { id: string; section: string; title: string }[]).map((m) => ({ id: `m:${c.id}:${m.id}`, text: `${m.section} / ${m.title}` })),
    ),
    ...drills.map((d) => ({ id: `d:${d.id}`, text: `${d.get('type')} drill: ${d.get('topic')}. ${String(d.get('brief') ?? '').slice(0, 200)}` })),
  ];
  if (!items.length) return { tagged: 0 };

  const tags = new Map<string, string[]>();
  for (let i = 0; i < items.length; i += 150) {
    const part = items.slice(i, i + 150);
    const res = await ask(buildTagPrompt(part, skills), TAG_SCHEMA, (t) => parseTags(t, part.map((x) => x.id), skillIds), () => fakeTags(part, skills), {
      thinking: 'default',
      temperature: 0.1,
    });
    res.forEach((v, k) => tags.set(k, v));
  }

  const now = Date.now();
  const batch = db.batch();
  for (const c of courses) {
    const modules = (c.get('modules') as { id: string; skillIds: string[] }[]).map((m) => ({ ...m, skillIds: tags.get(`m:${c.id}:${m.id}`) ?? [] }));
    batch.update(c.ref, { modules, taggedAt: now, updatedAt: now });
  }
  for (const d of drills) batch.update(d.ref, { skillIds: tags.get(`d:${d.id}`) ?? [], tagged: true });
  await batch.commit();
  return { tagged: items.length };
});

/**
 * "Explain it back" (level 4). The model plays a junior and asks 3 questions,
 * one per call; after the 3rd answer it grades. A pass is saved as evidence.
 */
export const explainBack = onCall(OPTS, async (req) => {
  const uid = guard(req.auth);
  const { skillId, turns: rawTurns } = (req.data ?? {}) as { skillId?: unknown; turns?: unknown };
  if (typeof skillId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(skillId)) throw new HttpsError('invalid-argument', 'Bad skill id');
  let turns;
  try {
    turns = cleanTurns(rawTurns ?? []);
  } catch (err) {
    throw new HttpsError('invalid-argument', err instanceof Error ? err.message : 'Bad turns');
  }
  if (turns.some((t) => !t.answer)) throw new HttpsError('invalid-argument', 'Answer the question first');
  const ref = getFirestore().doc(`users/${uid}/skills/${skillId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'No such skill');
  const name = String(snap.get('name'));
  const profile = await loadProfile(uid);

  if (turns.length < EXPLAIN_TURNS) {
    const question = await ask(buildQuestionPrompt(name, profile.context, turns), QUESTION_SCHEMA, parseQuestion, () => fakeQuestion(turns.length), {
      thinking: 'default',
      temperature: 0.8,
    });
    return { question };
  }

  const grade = await ask(buildGradePrompt(name, profile.context, turns), GRADE_SCHEMA, parseGrade, fakeGrade, {
    model: GEMINI_MODEL_FINISH.value(),
    thinking: thinkingOf(GEMINI_THINKING_FINISH.value()),
    temperature: 0.3,
  });
  if (grade.pass) {
    const now = Date.now();
    await ref.update({
      evidence: FieldValue.arrayUnion({ level: 4, kind: 'explain', ref: null, note: grade.feedback.slice(0, 500), at: now }),
      updatedAt: now,
    });
  }
  return { grade };
});
