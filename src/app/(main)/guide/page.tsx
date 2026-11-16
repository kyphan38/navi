import PageHead from '@/components/PageHead';

// navi - In-app guide. Plain English, one block per feature.
// Keep it in sync when a feature changes.

type Block = { title: string; lines: string[] };

const BLOCKS: Block[] = [
  {
    title: 'today',
    lines: [
      'Today is a short route: learn, drill, review. A dot fills when a step is done.',
      'learn shows the modules planned for today. drill gives one drill. review shows when something is due.',
      'After studying, write one line about the day and how sure you feel (1 to 5).',
    ],
  },
  {
    title: 'drill',
    lines: [
      'A drill is a short work scenario, like an incident or a hard message. You answer round by round.',
      'Pick a group (tech, ai, comms, business, writing), a type and a level.',
      'Easy has 3 rounds, medium has 4. Hard rounds show a 5 minute timer. Past zero it just says over.',
      'Medium opens after 3 easy drills in a row at 70% or more. Hard opens the same way after medium.',
      'Some rounds give choices, some ask you to put steps in order, some take free text.',
      'At the end you get scores, notes from a coach, and your path next to a senior\'s path.',
      'Mistakes and new terms from a drill go to review.',
    ],
  },
  {
    title: 'review',
    lines: [
      'Due terms and drill mistakes together, oldest first, at most 5 a day.',
      'A term: recall the meaning, then show it. A mistake: think what to do instead, then show the lesson.',
      'Say if you knew it. Items come back after 1, 3, 7, 14 and 30 days. Right at 30 days means known.',
    ],
  },
  {
    title: 'learn',
    lines: [
      'Paste a course\'s contents once. navi splits it into modules with minutes and a "done when". Fix or drop modules, then save.',
      'Each week, look back and set the hours. navi plans about 70% of what you really did, so the plan stays real.',
      'Being late moves the finish date. Old work never piles onto next week.',
      'Tick a module when it is done.',
      'A month review shows here on the 1st of each month.',
    ],
  },
  {
    title: 'terms',
    lines: [
      'Every term you met, with a short card. Add a term by hand to get a card.',
      'quiz gives 3 quick questions about one term.',
    ],
  },
  {
    title: 'map',
    lines: [
      'The route from associate to senior, with you on it and dates for each milestone.',
      'Levels 1 to 4 for each skill come from evidence. 1: finish a module on it. 2: a demo, or a medium drill at 70% or more. 3: a note that you used it at work. 4: teach it to a junior.',
      'teach it to a junior: the AI plays a junior and asks 3 questions, then grades you.',
      'The slider shows how the dates move with more or fewer hours a week.',
      '1:1 prep: notes for a date range, ready to copy before a meeting with your manager.',
    ],
  },
  {
    title: 'ask',
    lines: [
      'Send a real work problem and see how a senior would think about it.',
      'Remove internal data first: IPs, hosts, keys, ARNs and emails. navi refuses them.',
    ],
  },
  {
    title: 'news',
    lines: [
      'A weekly digest (up to 5 items) and one public postmortem, made every Sunday morning.',
      'get this week makes it now. Every link was opened and checked before it was saved.',
    ],
  },
  {
    title: 'settings',
    lines: [
      'Profile: role, years, work, focus and hours a week. The AI uses it, and the plan uses the hours.',
      'Theme, and export .json for a copy of everything.',
    ],
  },
];

export default function GuidePage() {
  return (
    <main className="column">
      <PageHead title="guide" />

      {BLOCKS.map((b) => (
        <section key={b.title} className="mt-10">
          <h2 className="mb-2 font-mono text-[12px] tracking-[0.12em] text-faint">{b.title}</h2>
          <ul className="flex flex-col gap-2">
            {b.lines.map((line) => (
              <li key={line} className="text-[15px] leading-relaxed text-muted">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
