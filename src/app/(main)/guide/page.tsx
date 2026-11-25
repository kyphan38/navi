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
      'capacity: estimate GPUs, memory or nodes by hand. The method and the rough size count, not exact digits.',
      'failure mode: one part of a working system fails. Say what breaks next, how far it spreads, and how to limit it.',
      'war room: an incident in a noisy chat channel. Find the real signal and keep people updated.',
      'spot the lie: an expert explains something with one or two wrong claims. Find them and fix them.',
      'When you type a command, you see what that command would print.',
      'Topics also cover Kubernetes, GPUs and model serving, not only AWS.',
      'A drill under 60% comes back after 2 weeks as "redo" on Today, one level up when that level is open. The new debrief shows your old score next to the new one.',
    ],
  },
  {
    title: 'review',
    lines: [
      'Due terms and drill mistakes together, oldest first, at most 5 a day. During a track, its mistakes come first.',
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
      'practice next to a module: 5 exam-style questions. Check shows the right answers and why; wrong ones go to review.',
      'Several courses can run at once. In the week plan, set the % of your hours for each course. Each course shows its own finish date.',
      'add a course at the bottom starts another one.',
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
      'Skills: open one and tap edit to rename it, move it to another area, or remove it. Add your own skills under the list. New starter skills can be added with one tap.',
      'Skills are grouped in 5 pillars: Linux & networking, Containers & Kubernetes, IaC & CI/CD, Observability & reliability, Cloud & security. If you see "skills use old areas", tap move.',
      'track: focus on one pillar for about 4 weeks. Pick the pillar, mid or senior, and up to 5 skills, then start. Only one track runs at a time.',
      'While a track runs, tech drills on Today train its skills (lowest level first). Mid uses medium drills; senior uses hard trade-off, failure, war room and incident drills. Redo and review show the pillar first.',
      'Mid is met when the skills are at "do", 3 medium drills scored 70% or more in 60 days, and no mistakes of the pillar are due. Senior also needs 2 hard drills at 70% or more, one of them a trade-off, failure, war room or incident drill.',
      'Used at work and teach are not needed to close a track. The summary marks those skills as work-verified.',
      'Close the track when it says ready, or earlier (it then says not met). After 4 weeks it shows late; the end date never moves. The summary compares before and after: levels, drill average, mistakes fixed, redo scores.',
      'history: the last 26 weeks. Light gray: you learned or reviewed. Dark gray: you did a drill or a mock interview. Tap a day to see what you did.',
      'The slider shows how the dates move with more or fewer hours a week.',
      '1:1 prep: notes for a date range, ready to copy before a meeting with your manager. Your stories are listed too.',
      'target role: type the role you want (for example Senior DevOps). AI picks the skills and levels it needs; change the levels, then save. The Map then shows how ready you are, what is missing, thin evidence, and what to learn next. The drill topic on Today then takes turns between your course and the skills the role still needs.',
      'stories: STAR stories (situation, task, action, result) for 1:1s and interviews. Write one yourself, or let AI draft one from a finished drill or a "used at work" note, then edit it.',
      'brag doc: pick a quarter and write. AI makes one page for your review, only from what the app recorded. Copy it or download it as .md.',
    ],
  },
  {
    title: 'interview',
    lines: [
      'A mock interview: troubleshooting, system design or behavioral.',
      '5 questions, one at a time. After an answer, the interviewer may ask one follow-up.',
      'At the end you get a score per question, a better answer for each, and 2-3 things to practise.',
      'Behavioral questions use your saved stories.',
    ],
  },
  {
    title: 'ask',
    lines: [
      'Send a real work problem and see how a senior would think about it.',
      'practice this under an answer turns the problem into a drill. AI picks the best drill type, at your highest open level.',
      'Remove internal data first: IPs, hosts, keys, ARNs and emails. navi refuses them.',
    ],
  },
  {
    title: 'news',
    lines: [
      'A weekly digest (up to 5 items) and one public postmortem, made every Sunday morning.',
      'practice this under the postmortem replays that real incident as a drill, at your highest open level.',
      'get this week makes it now. Every link was opened and checked before it was saved.',
      'save under an item keeps it, with one line on what you take from it. Saved items sit at the top; mark them read when done.',
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
