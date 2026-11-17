// ============================================================
// navi - Cloud Functions entry point. Each group lives in its own file.
//
// The site stays a static export. These functions exist because the Gemini key
// must not reach the browser, and because the hidden drill answer (drillKeys)
// must never be readable by the client. They check the same email as
// firestore.rules and log no content, only errors.
// ============================================================

export { drillStart, drillAnswer, drillFinish } from './drills.ts';
export { termCard, termQuiz } from './termFns.ts';
export { courseSplit, skillTag, explainBack } from './learn.ts';
export { weeklyDigest, newsNow } from './newsFns.ts';
export { monthlyReview } from './monthFns.ts';
export { askSenior } from './seniorFns.ts';
