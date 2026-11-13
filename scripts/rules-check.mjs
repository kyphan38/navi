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
import { addDoc, collection, connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc, setLogLevel } from 'firebase/firestore';

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
  setDoc(mine('days', '2026-11-13'), { moduleIds: [], drillId: null, minutes: 30, note: '', confidence: 3, updatedAt: 1 }),
);

await Promise.all(apps.map((a) => deleteApp(a)));
console.log(failed ? `\n${failed} check(s) failed` : '\nall rules checks passed');
process.exit(failed ? 1 : 0);
