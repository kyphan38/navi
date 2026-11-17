// ============================================================
// navi - Cloud Functions: terms (cards, quiz)
// Split out of index.ts; shared helpers live in shared.ts.
// ============================================================

import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import { CARDS_SCHEMA, QUIZ_SCHEMA, buildCardPrompt, buildQuizPrompt, cleanTermName, fakeCards, fakeQuiz, parseCards, parseQuiz, termId, type TermCard } from './terms.ts';
import { OPTS, guard, ask, loadProfile } from './shared.ts';

/** Saves cards as new terms; a term that already exists is left as it is. Returns the ids. */
export async function saveTerms(uid: string, cards: TermCard[], source: 'drill' | 'manual', sourceId: string | null): Promise<string[]> {
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
