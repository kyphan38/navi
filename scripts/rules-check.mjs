// ---------------------------------------------------------------------------
// navi - Check firestore.rules against the running emulator
//
//   npm run emu          # terminal 1 (writes rules for dev@navi.test)
//   npm run test:rules   # terminal 2
//
// Signs in as the allowed user and as a stranger, then tries reads and
// writes that must pass or fail. Exits 1 on the first surprise.
// ---------------------------------------------------------------------------

import { deleteApp, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, connectAuthEmulator, getAuth, signInWithCredential } from 'firebase/auth';
import { addDoc, collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, increment, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';

// Denied writes are expected here; the SDK would log each one as an error.
setLogLevel('silent');

import { existsSync, readFileSync } from 'node:fs';

// Same email as `npm run rules -- --emu`: .env.local, else the dev email.
function allowedEmail() {
  if (existsSync('.env.local')) {
    const m = readFileSync('.env.local', 'utf8').match(/^\s*ALLOWED_USER_EMAIL\s*=\s*['"]?([^'"\s]+)/m);
    if (m) return m[1].toLowerCase();
  }
  return 'dev@navi.test';
}

const apps = [];

async function client(name, email) {
  const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-navi', appId: 'demo-app' }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9110', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8110);
  // One emulator account per email: an old account keeps its old email.
  const token = JSON.stringify({ sub: `check-${name}-${email}`, email, email_verified: true });
  const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(token));
  return { db, uid: cred.user.uid };
}

const profile = { role: 'DevOps engineer', years: 2, context: 'payment app', focus: 'security', hoursPerWeek: 5 };

let failed = 0;
async function expect(label, shouldPass, fn) {
  let ok;
  try {
    await fn();
    ok = true;
  } catch (err) {
    if (err?.code !== 'permission-denied') throw err;
    ok = false;
  }
  const good = ok === shouldPass;
  if (!good) failed++;
  console.log(`${good ? 'ok  ' : 'FAIL'} ${label} (${ok ? 'allowed' : 'denied'})`);
}

const me = await client('me', allowedEmail());
const stranger = await client('stranger', 'someone@example.com');
const mine = (...p) => doc(me.db, 'users', me.uid, ...p);

// The emulator account can be the same one the app uses: keep its profile and
// write test days far in the past, so a check never changes real test data.
const savedProfile = await getDoc(mine('meta', 'profile'));

await expect('owner writes a valid profile', true, () => setDoc(mine('meta', 'profile'), profile));
await expect('owner reads the profile', true, () => getDoc(mine('meta', 'profile')));
await expect('owner writes years = 99', false, () => setDoc(mine('meta', 'profile'), { ...profile, years: 99 }));
await expect('owner writes an unknown key', false, () => setDoc(mine('meta', 'profile'), { ...profile, extra: 1 }));
await expect('owner reads a drill key', false, () => getDoc(mine('drillKeys', 'x')));
await expect('owner creates a drill', false, () => addDoc(collection(me.db, 'users', me.uid, 'drills'), { group: 'tech' }));
await expect('owner writes another uid', false, () => setDoc(doc(me.db, 'users', stranger.uid, 'meta', 'profile'), profile));
await expect('stranger writes own profile', false, () =>
  setDoc(doc(stranger.db, 'users', stranger.uid, 'meta', 'profile'), profile),
);
await expect('stranger reads owner profile', false, () => getDoc(doc(stranger.db, 'users', me.uid, 'meta', 'profile')));
await expect('owner writes a bad day id', false, () =>
  setDoc(mine('days', 'today'), { moduleIds: [], drillId: null, minutes: 0, note: '', confidence: null, updatedAt: 1 }),
);
await expect('owner writes a valid day', true, () =>
  setDoc(mine('days', '2000-01-01'), { moduleIds: [], drillId: null, minutes: 30, note: '', confidence: 3, updatedAt: 1 }),
);

await expect('owner writes a day with reviews', true, () =>
  setDoc(mine('days', '2000-01-02'), { moduleIds: [], drillId: null, minutes: 0, note: '', confidence: null, reviews: 3, updatedAt: 1 }),
);
await expect('owner writes negative reviews', false, () =>
  setDoc(mine('days', '2000-01-02'), { moduleIds: [], drillId: null, minutes: 0, note: '', confidence: null, reviews: -1, updatedAt: 1 }),
);
// Same writes as bumpDayReviews: a new day with defaults, then only the counter.
await deleteDoc(mine('days', '2000-01-03')).catch(() => {});
await expect('owner counts a review on a new day', true, () =>
  setDoc(
    mine('days', '2000-01-03'),
    { moduleIds: [], drillId: null, minutes: 0, note: '', confidence: null, reviews: increment(1), updatedAt: 1 },
    { merge: true },
  ),
);
await expect('owner counts a review on an existing day', true, () => updateDoc(mine('days', '2000-01-03'), { reviews: increment(1), updatedAt: 2 }));

const basic = { deck: 'linux', status: 'learning', readAt: 1, box: 2, nextReviewAt: 5, lastKind: 'predict', blindSpots: 0, stuck: 1, stuckAt: [3], updatedAt: 1 };
await expect('owner writes a valid basics state', true, () => setDoc(mine('basics', 'rules-check'), basic));
await expect('owner writes a basics state with box 9', false, () => setDoc(mine('basics', 'rules-check'), { ...basic, box: 9 }));
await expect('owner writes a basic lesson', false, () => setDoc(mine('basicLessons', 'process'), { problem: 'x' }));
await expect('owner creates a basic card', false, () => setDoc(mine('basicCards', '2000-01-01_process'), { prompt: 'x' }));
await deleteDoc(mine('basics', 'rules-check')).catch(() => {});

const track = {
  area: 'Cloud & security',
  rung: 'mid',
  startedAt: 1,
  endBy: 2,
  baseline: { levels: { dns: 1 }, drillAvg: null, openMistakeIds: [] },
  summary: null,
};
const trackDoc = { title: 'Cloud & security', kind: 'track', courseId: null, needs: [], checklist: [], order: 0.1, doneAt: 1, track };
await expect('owner writes a valid track', true, () => setDoc(mine('milestones', 'rules-check-track'), trackDoc));
await expect('owner writes a track with a bad rung', false, () =>
  setDoc(mine('milestones', 'rules-check-track'), { ...trackDoc, track: { ...track, rung: 'staff' } }),
);
await expect('owner puts a track on a learning milestone', false, () =>
  setDoc(mine('milestones', 'rules-check-track'), { ...trackDoc, kind: 'learning' }),
);
await deleteDoc(mine('milestones', 'rules-check-track')).catch(() => {});

if (savedProfile.exists()) await setDoc(mine('meta', 'profile'), savedProfile.data());

await Promise.all(apps.map((a) => deleteApp(a)));
console.log(failed ? `\n${failed} check(s) failed` : '\nall rules checks passed');
process.exit(failed ? 1 : 0);
