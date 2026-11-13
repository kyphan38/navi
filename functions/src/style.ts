// Put at the top of EVERY prompt (PLAN-navi.md section 4).
// The owner reads English at IELTS 6.0-6.5; hard words make study feel heavy.
export const PLAIN_ENGLISH = `Write in simple English (IELTS 6.0 level).
Use short sentences, about 20 words or less.
Use common words. Avoid rare or academic words.
Keep technical terms (IAM, idempotency, SLO...), but the first time a term appears,
explain it in plain words in brackets.
One idea per sentence. No idioms.`;

// Never ask for, or invent, real company internals.
export const SAFE_DATA = `Never ask the learner for real company data (host names, IPs, account ids, log lines, config).
Use made-up but realistic names, numbers and snippets.`;
