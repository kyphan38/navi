// ---------------------------------------------------------------------------
// navi - Write env files for Cloud Functions from .env.local
//
//   npm run fn:env
//
// functions/.env           ALLOWED_USER_EMAIL, GEMINI_MODEL: deploy and emulator
// functions/.secret.local  emulator only: GEMINI_API_KEY
// functions/.env.local     emulator only: NAVI_FAKE_AI=1 when there is no key
//
// The emulator uses the same email as `npm run rules -- --emu`, so the fake
// Google sign-in passes both the rules and the functions.
// On deploy the key comes from Secret Manager, set once with:
//   firebase functions:secrets:set GEMINI_API_KEY
// Both files are gitignored.
// ---------------------------------------------------------------------------

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = { ...readEnvFile('.env.local'), ...process.env };
const EMU = process.argv.includes('--emu');
// Same fallback as `npm run rules -- --emu`, so the fake sign-in passes both.
const email = ((env.ALLOWED_USER_EMAIL ?? '').trim() || (EMU ? 'dev@navi.test' : '')).toLowerCase();
const key = (env.GEMINI_API_KEY ?? '').trim();

if (!email) {
  console.error('ALLOWED_USER_EMAIL is missing in .env.local.');
  process.exit(1);
}

const lines = [`ALLOWED_USER_EMAIL=${email}`];
// Always written: non-interactive deploy fails on a param with no value, even with a default.
lines.push(`GEMINI_MODEL=${(env.GEMINI_MODEL ?? '').trim() || 'gemini-3.8-flash'}`);
writeFileSync('functions/.env', lines.join('\n') + '\n');
console.log('functions/.env written');

if (key) {
  writeFileSync('functions/.secret.local', `GEMINI_API_KEY=${key}\n`);
  writeFileSync('functions/.env.local', 'NAVI_FAKE_AI=0\n');
  console.log('functions/.secret.local written (emulator only)');
} else {
  // No key: the emulator answers drills with canned data, so the UI can be tested.
  writeFileSync('functions/.secret.local', 'GEMINI_API_KEY=none\n');
  writeFileSync('functions/.env.local', 'NAVI_FAKE_AI=1\n');
  console.log('GEMINI_API_KEY not in .env.local: the emulator uses fake AI answers.');
}
