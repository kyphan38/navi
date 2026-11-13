// 1:1 prep (PLAN-navi.md P6): what happened in a date range, as plain text to
// copy into a 1:1 with the manager. Pure, no AI: only facts from the app.

import { CRITERIA, scorePercent, typeLabel } from '@/lib/drills';
import { hm } from '@/lib/plan';
import { LEVEL_NAMES } from '@/lib/skill-level';
import type { CourseModule, Drill, Evidence, Milestone, SkillLevel, Term } from '@/types/navi';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export type OneOnOneInput = {
  from: number;
  to: number;
  courseTitle: string | null;
  modules: CourseModule[];
  days: { id: string; minutes: number }[];
  /** Day id -> epoch ms at noon, so day docs can be put in the range. */
  dayTime: (id: string) => number;
  skills: { name: string; computed: SkillLevel; reachedAt: number | null; all: Evidence[] }[];
  drills: Drill[];
  terms: Pick<Term, 'createdAt' | 'status' | 'updatedAt'>[];
  milestones: Pick<Milestone, 'checklist'>[];
};

export function oneOnOne(i: OneOnOneInput): string {
  const inRange = (t: number | null | undefined) => t !== null && t !== undefined && t >= i.from && t <= i.to;
  const out: string[] = [`1:1 notes, ${shortFmt.format(i.from)} - ${dateFmt.format(i.to)}`, ''];

  // Learning
  const mods = i.modules.filter((m) => inRange(m.doneAt));
  const days = i.days.filter((d) => inRange(i.dayTime(d.id)) && d.minutes > 0);
  const minutes = days.reduce((s, d) => s + d.minutes, 0);
  const learning: string[] = [];
  if (mods.length) {
    const total = i.modules.length;
    const done = i.modules.filter((m) => m.doneAt !== null).length;
    learning.push(`- ${mods.length} ${mods.length === 1 ? 'module' : 'modules'} done (${hm(mods.reduce((s, m) => s + m.minutes, 0))})${i.courseTitle ? ` in ${i.courseTitle}` : ''}. ${done}/${total} overall.`);
  }
  if (minutes) learning.push(`- Studied ${hm(minutes)} on ${days.length} ${days.length === 1 ? 'day' : 'days'}.`);
  if (learning.length) out.push('Learning', ...learning, '');

  // Skills that reached a new level, and work evidence
  const up = i.skills.filter((s) => s.computed > 0 && inRange(s.reachedAt));
  if (up.length) out.push('Skills', ...up.map((s) => `- ${s.name}: now "${LEVEL_NAMES[s.computed]}" (level ${s.computed}).`), '');
  const work = i.skills.flatMap((s) => s.all.filter((e) => e.kind === 'work' && inRange(e.at)).map((e) => `- ${s.name}: ${e.note}`));
  if (work.length) out.push('Used at work', ...work, '');

  // Drills
  const drills = i.drills.filter((d) => d.status === 'done' && inRange(d.doneAt));
  if (drills.length) {
    const pcts = drills.map((d) => scorePercent(d.score)).filter((p): p is number => p !== null);
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
    const best = [...drills].sort((a, b) => (scorePercent(b.score) ?? 0) - (scorePercent(a.score) ?? 0))[0];
    const lines = [`- ${drills.length} ${drills.length === 1 ? 'drill' : 'drills'}${avg !== null ? `, average ${avg}%` : ''}.`];
    if (best) lines.push(`- Best: ${typeLabel(best.type)} "${best.topic}" ${scorePercent(best.score) ?? '-'}%.`);
    // Weakest criterion over the drills that used it.
    const per = CRITERIA.map((c) => {
      const vals = drills.map((d) => d.score?.[c.key]).filter((v): v is number => typeof v === 'number');
      return { label: c.label, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, n: vals.length };
    }).filter((x) => x.avg !== null && x.n >= 2);
    const weak = per.sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))[0];
    if (weak) lines.push(`- To work on: ${weak.label} (${weak.avg!.toFixed(1)} of 3).`);
    out.push('Drills', ...lines, '');
  }

  // Terms
  const newTerms = i.terms.filter((t) => inRange(t.createdAt)).length;
  const known = i.terms.filter((t) => t.status === 'known' && inRange(t.updatedAt)).length;
  if (newTerms || known) out.push('Terms', `- ${newTerms} new, ${known} now known.`, '');

  // Career checklist
  const career = i.milestones.flatMap((m) => m.checklist.filter((c) => c.done && inRange(c.at)).map((c) => `- ${c.text} (${shortFmt.format(c.at!)})`));
  if (career.length) out.push('Career steps', ...career, '');

  if (out.length === 2) out.push('Nothing recorded in these dates yet.', '');
  out.push('I want help with', '- ');
  return out.join('\n');
}
