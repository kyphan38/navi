import PageHead from '@/components/PageHead';

// navi - In-app guide. Plain English, one block per feature.
// Keep it in sync when a feature changes.

type Block = { title: string; lines: string[] };

const BLOCKS: Block[] = [
  {
    title: 'places',
    lines: [
      'Six places: today, practice, learn, map, career, settings.',
      'practice holds drill, interview, review and basics. learn holds your courses, terms and news. career holds your target role, ask a senior, stories, 1:1 prep and the brag doc.',
      'On a wide screen the rail on the left lists every page under its place. review shows how many items are due. On a phone, switch pages with the words at the top of the page.',
      'drill, basics and review show today\'s loop at the top: a gray dot is done, the black dot is where you are.',
      'After a drill, where this went shows what moved: new terms to terms, mistakes to review.',
      'Some pages have a small hint. It shows in full 3 times, then in a few words, then it goes away.',
    ],
  },
  {
    title: 'basics',
    lines: [
      'Foundations in 6 decks (linux, network, data, runtime, distributed with SRE, delivery), a few minutes a day: first learn, then practise.',
      'Each day: one new lesson with a check question right after it, and up to 2 review questions. It is ready every morning, so there is no wait.',
      'A lesson has fixed parts: the problem, how it works, a picture, a command to see it yourself, a common mistake, where you meet it at work.',
      'Tap a dotted word to see what it means. save term adds it to your terms.',
      'Before you answer, pick guess or sure. Wrong while sure is a wrong belief, worth fixing first.',
      'I don\'t get it shows the background first. It is not counted as wrong; the concepts it needs come back for review.',
      'I know this skips the lesson and goes to the check. If you miss it, the lesson opens before you go on.',
      'Reviews come back after 1, 3, 7, 14 and 30 days, a little harder each time and from another angle: what happens next, find the wrong statement, which command shows it, put the steps in order.',
      'When fewer than 2 reviews are due, one card may be linked to your work: your track, a recent drill or a term you saved.',
      'Wrong while sure also goes into your mistakes, so the review page brings it back.',
      'go deeper (after an answer) starts a drill on that concept: spot the lie for a myth, a why chain for the rest.',
      'Once a week, after the session: explain one concept in your own words. AI says what is missing; a miss comes back tomorrow.',
      'On weekends: a 15-minute lab in a throwaway Docker container. done adds level 2 evidence to the concept\'s skills.',
      'The Map shows one line: how many concepts you started and learned.',
      'library lists every concept by deck. Tap one you have started to read it again; looks wrong rewrites a lesson.',
      'Basics never raise skill levels: only real evidence does.',
    ],
  },
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
      'At the top: today\'s drill and a redo, the same as on Today.',
      'Below, each group is one line of drill names. Tap a name to see what it is, pick a level and start.',
      'to fix (your mistakes) and history are folded at the bottom. Tap to open.',
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
      'The route from associate to senior, with you on it and dates for each milestone. Under it, what if and milestones open with a tap.',
      'Skills are folded by pillar. Tap a pillar to see its skills; other areas are in one "other" row.',
      'Levels 1 to 4 for each skill come from evidence. 1: finish a module on it. 2: a demo, a basics lab, or a medium drill at 70% or more. 3: a note that you used it at work. 4: teach it to a junior.',
      'teach it to a junior: the AI plays a junior and asks 3 questions, then grades you.',
      'Skills: open one and tap edit to rename it, move it to another area, or remove it. Add your own skills under the list. New starter skills can be added with one tap.',
      'Skills are grouped in 5 pillars: Linux & networking, Containers & Kubernetes, IaC & CI/CD, Observability & reliability, Cloud & security. If you see "skills use old areas", tap move.',
      'track: focus on one pillar for about 4 weeks. Pick the pillar, mid or senior, and up to 5 skills, then start. Only one track runs at a time.',
      'While a track runs, tech drills on Today train its skills (lowest level first). Mid uses medium drills; senior uses hard trade-off, failure, war room and incident drills. Redo and review show the pillar first.',
      'Mid is met when the skills are at "do", 3 medium drills scored 70% or more in 60 days, and no mistakes of the pillar are due. Senior also needs 2 hard drills at 70% or more, one of them a trade-off, failure, war room or incident drill.',
      'Used at work and teach are not needed to close a track. The summary marks those skills as work-verified.',
      'Close the track when it says ready, or earlier (it then says not met). After 4 weeks it shows late; the end date never moves. The summary compares before and after: levels, drill average, mistakes fixed, redo scores.',
      'history: the last 26 weeks. Light gray: you learned or reviewed. Dark gray: you did a drill or a mock interview. Tap a day to see what you did.',
      'what if: the slider shows how the dates move with more or fewer hours a week.',

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
    title: 'career',
    lines: [
      'target role: type the role you want, or tap one: Senior DevOps engineer, Site reliability engineer (SRE), Senior SRE, Platform engineer. AI picks the skills and levels it needs; change the levels, then save. Career then shows how ready you are, what is missing, thin evidence, and what to learn next. The drill topic on Today then takes turns between your course and the skills the role still needs.',
      'stories: STAR stories (situation, task, action, result) for 1:1s and interviews. Write one yourself, or let AI draft one from a finished drill or a "used at work" note, then edit it.',
      '1:1 prep: notes for a date range, ready to copy before a meeting with your manager. Your stories are listed too.',
      'brag doc: pick a quarter and write. AI makes one page for your review, only from what the app recorded. Copy it or download it as .md.',
      'Stories, 1:1 prep and the brag doc are folded. Tap one to open it.',
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
      'The picks come only from well-known sources: engineering blogs (Cloudflare, Kubernetes, HashiCorp, Grafana, GitHub, Netflix, Fly.io, Tailscale), newsletters (SRE Weekly, DevOps Weekly, The Pragmatic Engineer, ByteByteGo), AWS blogs, at most one AI post, and payments blogs (Stripe, Monzo, Nubank). Each has one line on what to do or check at work.',
      'Order: devops and cloud, banking and payments, the postmortem of the week (practice this replays it as a drill), then community.',
      'community has no AI: posts discussed on Hacker News, Lobsters and your daily.dev feed (the number opens the comments), headlines from InfoQ, The New Stack and The Register, and new GitHub repos. Only DevOps and Platform topics, no AI product news.',
      'save keeps any link in your reading list, under this week.',
      'practice this under the postmortem replays that real incident as a drill, at your highest open level.',
      'get this week makes it now. Every link was opened and checked before it was saved.',
      'save under an item keeps it, with one line on what you take from it. Saved items sit at the top; mark them read when done.',
    ],
  },
  {
    title: 'settings',
    lines: [
      'Profile: role, years, work, focus and hours a week. The AI uses it, and the plan uses the hours.',
      'Theme, hints (on, off, or show again), and export .json for a copy of everything.',
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
