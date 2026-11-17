// ============================================================
// navi - Cloud Functions: monthly review
// Split out of index.ts; shared helpers live in shared.ts.
// ============================================================

import { getAuth } from 'firebase-admin/auth';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';
import { MONTH_SCHEMA, buildMonthPrompt, fakeMonth, monthBefore, monthRange, parseMonth, summarizeMonth, type MonthInput } from './month.ts';
import { GEMINI_API_KEY, ALLOWED_USER_EMAIL, GEMINI_MODEL_FINISH, GEMINI_THINKING_FINISH, thinkingOf, ask, loadProfile } from './shared.ts';

async function buildMonthReview(uid: string, month: string): Promise<void> {
  const db = getFirestore();
  const user = db.collection('users').doc(uid);
  const ref = user.collection('months').doc(month);
  if ((await ref.get()).exists) return;
  const [start, end] = monthRange(month);
  const inMonth = (t: unknown) => typeof t === 'number' && t >= start && t < end;

  const [profile, drills, days, weeks, mistakes, terms, courses] = await Promise.all([
    loadProfile(uid),
    user.collection('drills').where('startedAt', '>=', start).where('startedAt', '<', end).get(),
    user.collection('days').where(FieldPath.documentId(), '>=', `${month}-01`).where(FieldPath.documentId(), '<=', `${month}-31`).get(),
    user.collection('weeks').where('createdAt', '>=', start).where('createdAt', '<', end).get(),
    user.collection('mistakes').where('createdAt', '>=', start).where('createdAt', '<', end).get(),
    user.collection('terms').get(),
    user.collection('courses').get(),
  ]);

  const input: MonthInput = {
    drills: drills.docs.map((d) => ({
      type: String(d.get('type') ?? ''),
      group: String(d.get('group') ?? ''),
      level: String(d.get('level') ?? ''),
      topic: String(d.get('topic') ?? ''),
      status: String(d.get('status') ?? ''),
      score: (d.get('score') as Record<string, number | null> | null) ?? null,
    })),
    days: days.docs.map((d) => ({
      minutes: Number(d.get('minutes') ?? 0),
      note: String(d.get('note') ?? ''),
      confidence: typeof d.get('confidence') === 'number' ? (d.get('confidence') as number) : null,
    })),
    weekReviews: weeks.docs.map((d) => d.get('review')).filter((r): r is { done: string; missed: string; why: string } => !!r),
    mistakes: mistakes.docs.map((d) => ({ text: String(d.get('text') ?? ''), lesson: String(d.get('lesson') ?? '') })),
    termsAdded: terms.docs.filter((d) => inMonth(d.get('createdAt'))).map((d) => String(d.get('name') ?? '')),
    termsKnown: terms.docs.filter((d) => d.get('status') === 'known' && inMonth(d.get('updatedAt'))).map((d) => String(d.get('name') ?? '')),
    modulesDone: courses.docs.flatMap((c) =>
      ((c.get('modules') as { title?: string; doneAt?: number | null }[] | undefined) ?? []).filter((m) => inMonth(m.doneAt)).map((m) => String(m.title ?? '')),
    ),
  };

  const review = await ask(buildMonthPrompt(month, profile.role, profile.focus, summarizeMonth(input)), MONTH_SCHEMA, parseMonth, fakeMonth, {
    model: GEMINI_MODEL_FINISH.value(),
    thinking: thinkingOf(GEMINI_THINKING_FINISH.value()),
    temperature: 0.4,
  });
  const stats = {
    minutes: input.days.reduce((s, d) => s + d.minutes, 0),
    drillsDone: input.drills.filter((d) => d.status === 'done').length,
    modulesDone: input.modulesDone.length,
    termsAdded: input.termsAdded.length,
  };
  await ref.set({ ...review, stats, createdAt: Date.now() });
  logger.info('month review saved', { month, ...stats });
}

/** 1st of the month, 07:00 Vietnam time: a review of the month before. */
export const monthlyReview = onSchedule(
  { schedule: '0 7 1 * *', timeZone: 'Asia/Ho_Chi_Minh', secrets: [GEMINI_API_KEY], timeoutSeconds: 300, memory: '512MiB' },
  async () => {
    const user = await getAuth().getUserByEmail(ALLOWED_USER_EMAIL.value());
    await buildMonthReview(user.uid, monthBefore(Date.now()));
  },
);

/** A real work problem -> how a senior would think about it. Refuses internal data. */
