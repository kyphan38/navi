// ============================================================
// navi - Cloud Functions: course split, skill tags, explain it back
// Split out of index.ts; shared helpers live in shared.ts.
// ============================================================

import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import { EXPLAIN_TURNS, GRADE_SCHEMA, QUESTION_SCHEMA, TAG_SCHEMA, buildGradePrompt, buildQuestionPrompt, buildTagPrompt, cleanTurns, fakeGrade, fakeQuestion, fakeTags, parseGrade, parseQuestion, parseTags, type TagItem } from './skills.ts';
import { MAX_TOC, SPLIT_SCHEMA, buildSplitPrompt, chunkToc, fakeSplit, parseSplit, type SplitModule } from './course.ts';
import { GEMINI_MODEL_FINISH, GEMINI_THINKING_FINISH, thinkingOf, OPTS, guard, ask, loadProfile } from './shared.ts';

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
  // Merge: a track drill already carries the skill it was started for.
  for (const d of drills) {
    const had = (d.get('skillIds') as string[] | undefined) ?? [];
    batch.update(d.ref, { skillIds: [...new Set([...had, ...(tags.get(`d:${d.id}`) ?? [])])].slice(0, 5), tagged: true });
  }
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

// ------------------------------------------------------------------ outside info (P6)

/** A grounded (web search) call parsed by `parse`, with one more try when the text is broken. */
