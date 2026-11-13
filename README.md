# navi

Grow one step a day: daily drills, a course plan, terms and a roadmap map.
Next.js (static export) + Firebase (Auth + Firestore, Functions for AI from P1) + Vercel.
All copy is plain English (IELTS 6.0-6.5).

Plan, invariants and every decision: [`PLAN-navi.md`](PLAN-navi.md).

| | |
|---|---|
| Live | https://navi.kyphan38.com (after Stage 0) |
| Firebase project | `kyphan38-navi-app`, database `(default)`, `asia-southeast1` |
| Access | one email - checked on the login screen **and inside `firestore.rules`** |
| Server | none for data; Cloud Functions for AI from P1 |
| Look | gray only (`../DESIGN.md`), own touch: left rail, route line, mono labels (plan 1b) |

## Run locally

```bash
npm install
# Emulators (Auth + Firestore). Needs Java 21:
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run emu
# In another terminal:
npm run dev:emu
```

Checks: `npm run lint`, `npm run typecheck`, `npm run fn:typecheck`, `npm test`,
`npm run build`, and `npm run test:rules` while the emulator runs.

The emulator uses its own ports (auth 9110, firestore 8110, functions 5110), so it
runs next to the other apps. With no `GEMINI_API_KEY` in `.env.local`, the functions
answer drills with canned data (`functions/src/drill/fake.ts`), so the whole flow can
be tested for free.

## Functions (AI)

`drillStart`, `drillAnswer`, `drillFinish`, `termCard`, `termQuiz`, `courseSplit`, `skillTag`, `explainBack` in `functions/src/index.ts`
(term cards and quizzes use Flash low).
Deploy: `npm run fn:env`, then `firebase deploy --only functions`. The key lives in
Secret Manager (`firebase functions:secrets:set GEMINI_API_KEY`).

Models (A/B of 2026-11-13, `scripts/ab-finish.mjs`, Flash low vs Argon vs Hydrogen):

| Step | Model | Why |
|---|---|---|
| `drillStart` (write the drill) | `gemini-4-hydrogen` | Most real scenarios: people pressure, a wrong lead, payment safety in the hidden story. 13-50 s, once per drill |
| `drillAnswer` (each round) | `gemini-3.8-flash` low | ~3 s; the learner waits every round, and the hidden story from Hydrogen keeps it on track |
| `drillFinish` (score) | `gemini-4-hydrogen` | Most specific feedback and fair partial scores. 12-18 s, once per drill |

Argon was close on both (kinder tone, 11-28 s). Hydrogen's price was not public on 2026-11-13.
Change a step with `GEMINI_MODEL_START` / `GEMINI_MODEL_FINISH` (and `GEMINI_THINKING_*`,
`none` = no thinking level) in `.env.local`, then `npm run fn:env` and deploy functions.

## Stage 0 (owner, on the consoles)

1. Firebase project `kyphan38-navi-app` (Blaze plan, needed for Functions in P1).
2. Authentication → Google. Authorized domains → `navi.kyphan38.com`.
3. Google Cloud → OAuth client → redirect URI `https://navi.kyphan38.com/__/auth/handler`
   (same iPhone / iPad sign-in fix as the other apps: `vercel.json` proxies `/__/auth/*`).
4. Firestore `(default)` in `asia-southeast1`.
5. Web app config → `.env.local` (see `.env.example`).
6. `npm run rules && firebase deploy --only firestore:rules,firestore:indexes`.
7. Vercel → import the repo, domain `navi.kyphan38.com`, add the `NEXT_PUBLIC_*` variables.
8. DNS: `navi` CNAME as Vercel says.
9. Before P1: add navi to `../sync-gemini-key.sh` and `../SECRETS.md`, then run the script yourself.

## How it works

- **Data:** everything under `users/{uid}/` (see `src/types/navi.ts` and
  `firestore.rules.template`). `drillKeys` hold hidden drill answers and are
  never readable from the client. Only Functions create drills; the client may
  only mark one `dropped`.
- **Drills:** the server writes the hidden story first (`drillKeys`), then each
  round reacts to the answer but stays true to it. Easy = 3 rounds, medium = 4.
  Mistakes go to `mistakes` (review comes in P5).
- **Terms:** scoring a drill also writes a card for each new term (`terms/{id}`,
  id = lowercase name with `-`). `termCard` adds terms by hand, `termQuiz` makes
  3 questions. Review uses Leitner boxes (1, 3, 7, 14, 30 days, `src/lib/leitner.ts`);
  right in box 5 = known. Today shows the review when something is due.
- **Course plan (P3):** paste a course's contents once; `courseSplit` (Flash low, parts of
  10 KB run 3 at a time) turns it into modules with minutes and a "done when". Each week,
  `src/lib/plan.ts` takes about 70% of the real weekly average (last 4 planned weeks,
  profile hours until there are 2) and picks the next modules. Today spreads them over
  the days left. Being late moves the finish date; old work never piles onto next week.
- **More drills (P5):** 19 types in 5 groups (`functions/src/drill/catalog.ts`). Medium opens
  after 3 easy drills in a row at 70%+, hard after 3 medium (`openLevels`, checked on the
  server too). Hard rounds show a 5 minute timer. Mistakes from drills and due terms share
  one review at `/review/` (Leitner, at most 5 a day, no AI call).
- **Skills and Map (P4):** levels 1-4 come from evidence (`src/lib/skill-level.ts`): done
  modules and demos, medium+ drills at 70%+, "used at work" notes, and a passed
  "Explain it back". `skillTag` tags modules and drills with skills. The Map shows the
  route (associate -> you -> milestones -> senior), a what-if slider with the last 12
  weeks, milestone checklists and the skill grid. Dates: `src/lib/forecast.ts`.
- **Writes are never awaited** (`src/lib/repo.ts`): offline, a write goes to the
  cache at once and syncs later.
- **Nav:** a left rail on wide screens, a scrolling row of words on phones
  (`src/components/Rail.tsx`).
