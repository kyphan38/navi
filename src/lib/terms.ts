// Term helpers with no React or Firestore, so `node --test` can cover them.

import { firstReview, review } from '@/lib/leitner';
import type { Profile, Term } from '@/types/navi';

/** Same list as functions/src/terms.ts (a test keeps them equal). */
export const AREAS = ['Security', 'Networking', 'Reliability', 'Cloud', 'Payments', 'Data', 'Delivery', 'AI', 'Communication', 'Other'] as const;

export const CHECKLIST: readonly { key: keyof Term['checklist']; label: string }[] = [
  { key: 'what', label: 'what it is' },
  { key: 'how', label: 'how it works' },
  { key: 'when', label: 'when to use it' },
  { key: 'mistakes', label: 'common mistakes' },
  { key: 'related', label: 'related terms' },
];

/** Same rule as functions/src/terms.ts termId (a test keeps them equal). */
export function termId(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** The prompt behind "copy prompt" (PLAN-navi.md section 8). */
export function studyPrompt(name: string, p: Pick<Profile, 'role' | 'years' | 'context'>): string {
  return `Teach me the term "${name}".

About me: I am a ${p.role} with ${p.years} years of experience. I work on a ${p.context}.

Use simple English (IELTS 6.0 level). Short sentences.
If you use a hard word, explain it in plain words.

Please cover:
1. What it is, in 2-3 sentences.
2. How it works, step by step.
3. When to use it, and when not to use it.
4. A real example from ${p.context}.
5. Common mistakes people make.
6. 3 related terms I should learn next.
7. 3 questions to test me. Wait for my answers before you show the correct ones.`;
}

/** Terms grouped by area in AREAS order, names A-Z inside a group. */
export function groupByArea<T extends Pick<Term, 'area' | 'name'>>(terms: T[]): { area: string; terms: T[] }[] {
  const order = (a: string) => {
    const i = (AREAS as readonly string[]).indexOf(a);
    return i === -1 ? AREAS.length : i;
  };
  const groups = new Map<string, T[]>();
  for (const t of terms) groups.set(t.area, [...(groups.get(t.area) ?? []), t]);
  return [...groups.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([area, list]) => ({ area, terms: list.sort((x, y) => x.name.localeCompare(y.name)) }));
}

/** Terms named in drills that are not saved yet (older drills, before P2). */
export function missingDrillTerms(drills: { id: string; newTerms: string[] }[], saved: Set<string>): { name: string; drillId: string }[] {
  const out = new Map<string, { name: string; drillId: string }>();
  for (const d of drills) {
    for (const name of d.newTerms) {
      const id = termId(name);
      if (id && !saved.has(id) && !out.has(id)) out.set(id, { name, drillId: d.id });
    }
  }
  return [...out.values()];
}

/** Fields to write when the learner sets a status by hand. Learning starts review tomorrow. */
export function statusPatch(status: Term['status'], now: number): Pick<Term, 'status' | 'box' | 'nextReviewAt'> {
  if (status === 'learning') return { status, box: 1, nextReviewAt: firstReview(now) };
  return { status, box: status === 'known' ? 5 : 1, nextReviewAt: null };
}

/** Fields after a review or a quiz. A term not in review yet starts at box 1; right in box 5 = known. */
export function reviewPatch(term: Pick<Term, 'status' | 'box'>, correct: boolean, now: number): Pick<Term, 'status' | 'box' | 'nextReviewAt'> {
  if (term.status !== 'learning') return statusPatch('learning', now);
  const r = review(term.box, correct, now);
  return { status: r.learned ? 'known' : 'learning', box: r.box, nextReviewAt: r.nextReviewAt };
}
