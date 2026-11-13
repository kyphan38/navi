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

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
and `npm run test:rules` while the emulator runs.

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
  never readable from the client.
- **Writes are never awaited** (`src/lib/repo.ts`): offline, a write goes to the
  cache at once and syncs later.
- **Nav:** a left rail on wide screens, a scrolling row of words on phones
  (`src/components/Rail.tsx`).
