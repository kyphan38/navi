// Data model. Every doc lives under users/{uid}/. Times are epoch ms.
// Kept in step with firestore.rules.template and PLAN-navi.md section 3.

// --- Profile (users/{uid}/meta/profile) ---
export type Profile = {
  role: string;          // "DevOps engineer"
  years: number;         // 2
  context: string;      // "payment app on AWS at a bank", goes into every prompt
  focus: string;        // the one deep skill to grow
  hoursPerWeek: number; // planned; used until there are 2 weeks of real data
};

// --- Skills (users/{uid}/skills/{skillId}) ---
export type SkillLevel = 0 | 1 | 2 | 3 | 4;
export type Evidence = {
  level: SkillLevel;
  kind: 'module' | 'demo' | 'drill' | 'work' | 'explain';
  ref: string | null;    // module, drill or term id
  note: string;          // <= 500
  at: number;
};
export type Skill = {
  name: string;          // "IAM policy evaluation"
  area: string;          // "Security", "Networking", "Reliability", "Payments", "AI", "Communication"...
  level: SkillLevel;
  evidence: Evidence[];  // <= 50
  createdAt: number; updatedAt: number;
};

// --- Drills (users/{uid}/drills/{drillId}) ---
export type DrillGroup = 'tech' | 'ai' | 'comms' | 'business' | 'writing';
export type DrillType =
  | 'incident' | 'security-review' | 'why-chain' | 'tradeoff' | 'logs' | 'cost'        // tech
  | 'capacity' | 'failure-mode' | 'war-room' | 'spot-the-lie'                          // tech (added 2026-11-25)
  | 'review-ai-output' | 'brief-an-agent' | 'use-ai-or-not'                            // ai
  | 'three-audiences' | 'say-no' | 'clarify' | 'feedback' | 'status-update'           // comms
  | 'payment-case' | 'business-impact'                                                 // business
  | 'postmortem' | 'cr-risk' | 'prioritize';                                           // writing
export type DrillLevel = 'easy' | 'medium' | 'hard';
export type AnswerKind = 'choice' | 'multi' | 'text' | 'order' | 'command' | 'message';

export type Round = {
  prompt: string;
  kind: AnswerKind;
  options: string[];           // choice: pick one; multi: pick all that apply; order: rank all; else []
  hint: string;                // easy level only, else ''
  answer?: string;
  reveal?: string;             // what happened after the answer (not on the last round)
};
export type Criterion = 'triage' | 'hypothesis' | 'safety' | 'comms' | 'prevention';
/** 0-3 per criterion; null = not used by this drill type. */
export type Score = Record<Criterion, number | null>;

export type Drill = {
  group: DrillGroup; type: DrillType; level: DrillLevel;
  topic: string;               // "IAM", "DB connection pool"...
  skillIds: string[];
  clock: string;               // fake start time "02:04" for the incident-log look
  brief: string;
  rounds: Round[];             // 3-5
  status: 'active' | 'done' | 'dropped';
  score: Score | null;
  debrief: string | null;
  seniorPath: string | null;
  whatIf: { question: string; answer: string }[];
  automate?: string;           // how a machine can catch it next time (CI check, policy as code, alert)
  evenBetter?: string[];       // ideas beyond a correct answer, given even at full score
  newTerms: string[];
  tagged?: boolean;            // skillIds were set by skillTag (may still be empty)
  redoOf?: string;             // the low-score drill this one redoes (V5)
  fromAsk?: string;            // the Ask a senior question it came from (V7)
  startedAt: number; doneAt: number | null;
};

// users/{uid}/drillKeys/{drillId} - hidden answer. Rules: the client can never read it.
export type DrillKey = {
  truth: string;
  seniorPath: string;
  rubric: string;
  outline: string[];           // one line per round
};

// --- Mistakes (users/{uid}/mistakes/{id}) ---
export type Mistake = {
  drillId: string; skillId: string | null;
  text: string;
  lesson: string;
  box: 1 | 2 | 3 | 4 | 5;      // Leitner
  nextReviewAt: number | null; // null = learned, no more reviews
  createdAt: number;
};

// --- Terms (users/{uid}/terms/{termId}) ---
export type Term = {
  name: string;                // "Permission boundary"
  area: string;
  oneLine: string;
  checklist: { what: boolean; how: boolean; when: boolean; mistakes: boolean; related: boolean };
  status: 'new' | 'learning' | 'known';
  source: 'drill' | 'module' | 'manual';
  sourceId: string | null;
  box: 1 | 2 | 3 | 4 | 5;
  nextReviewAt: number | null;
  createdAt: number; updatedAt: number;
};

// --- Courses (users/{uid}/courses/{courseId}) ---
export type ModuleKind = 'lesson' | 'demo' | 'quiz' | 'exam';
export type CourseModule = {
  id: string;
  section: string;
  title: string;
  minutes: number;
  kind: ModuleKind;
  skillIds: string[];
  doneWhen: string;            // "Write 5 lines: when Deny wins over Allow"
  doneAt: number | null;
};
export type Course = {
  title: string;               // "AWS Certified Security - Specialty (Cantrill)"
  goal: string;                // "Pass the exam"
  deadline: number | null;
  modules: CourseModule[];
  status: 'active' | 'paused' | 'done';
  taggedAt?: number;           // modules got skill ids (Map page, skillTag)
  share?: number;              // % of weekly hours when several courses run (V6); missing = equal share
  createdAt: number; updatedAt: number;
};

// --- Weeks (users/{uid}/weeks/{YYYY-Www}) ---
export type Week = {
  plan: { moduleIds: string[]; drillTopics: string[]; workTask: string | null; explore: string | null };
  minutesPlanned: number;
  minutesDone: number;
  review: { done: string; missed: string; why: string } | null;
  createdAt: number; updatedAt: number;
};

export type Day = {
  moduleIds: string[];
  drillId: string | null;
  minutes: number;
  note: string;
  confidence: 1 | 2 | 3 | 4 | 5 | null;
  reviews?: number;            // term and mistake reviews that day (heatmap)
  updatedAt: number;
};

// --- Tracks (PLAN-track.md): a milestone with kind 'track' and a `track` field ---
export type TrackRung = 'mid' | 'senior';
export type TrackSnapshot = {
  levels: Record<string, SkillLevel>; // skill id -> level when the track started
  drillAvg: number | null;            // % average of the pillar's drills, 60 days before
  openMistakeIds: string[];           // the pillar's mistakes still in review (<= 50)
};
export type TrackSummary = {
  met: boolean;
  days: number;
  late: boolean;
  levels: { skillId: string; name: string; before: SkillLevel; after: SkillLevel; workVerified: boolean }[];
  drillAvg: { before: number | null; after: number | null };
  drills: { easy: number; medium: number; hard: number };
  mistakesFixed: number;
  mistakesNew: number;
  redo: { topic: string; before: number; after: number }[];
};
export type Track = {
  area: string;                // a pillar
  rung: TrackRung;
  startedAt: number;
  endBy: number;               // soft deadline, startedAt + 28 days; never moved
  baseline: TrackSnapshot;
  summary: TrackSummary | null; // fixed when the learner closes the track
};

export type Milestone = {
  title: string;               // "Pass AWS Security Specialty", "Ready for mid-level"
  kind: 'learning' | 'career' | 'track';
  courseId: string | null;     // learning milestone that is "finish this course"
  needs: { skillId: string; level: SkillLevel }[];
  checklist: { text: string; done: boolean; at: number | null }[];
  order: number;
  doneAt: number | null;
  track?: Track;               // kind === 'track' only
};

// --- Digests (users/{uid}/digests/{YYYY-Www}) - written by Functions ---
export type NewsItem = { title: string; url: string; source: string; group: 'banking' | 'outside'; why: string };
export type CommunityThread = { title: string; url: string; discuss: string | null; where: 'hn' | 'lobsters' | 'daily.dev'; score: number };
export type Community = {
  threads: CommunityThread[];
  headlines: { title: string; url: string; site: string }[];
  repos: { name: string; url: string; description: string; stars: number }[];
};
export type Digest = {
  items: NewsItem[];
  postmortem: { title: string; url: string; source: string; summary: string; questions: string[] } | null;
  community?: Community | null; // titles and links only, no AI (2026-11-26); older digests have none
  createdAt: number;
};

// --- Months (users/{uid}/months/{YYYY-MM}) - monthly review, written by Functions on the 1st ---
export type Month = {
  summary: string;
  progress: string[];
  avoiding: string[];
  next: string[];
  stats: { minutes: number; drillsDone: number; modulesDone: number; termsAdded: number };
  createdAt: number;
};

// --- Asks (users/{uid}/asks/{id}) - "Ask a senior", written by Functions ---
export type Ask = {
  question: string;
  answer: {
    restate: string;
    questions: string[];
    impact: string;
    options: { name: string; pros: string; cons: string }[];
    recommend: string;
    tellWho: string;
    firstSteps: string[];
  };
  createdAt: number;
};

// --- STAR stories (users/{uid}/stories/{id}) - V2 ---
export type Story = {
  title: string;
  situation: string; task: string; action: string; result: string;
  skillIds: string[];
  source: 'drill' | 'work' | 'manual';
  sourceId: string | null;     // drill id, or "skillId:at" for a work note
  createdAt: number; updatedAt: number;
};

// --- Saved news (users/{uid}/saved/{id}) - V8 ---
export type Saved = { title: string; url: string; source: string; why: string; note: string; readAt: number | null; createdAt: number };

// --- Target role (users/{uid}/meta/role) - V10 ---
export type TargetRole = { title: string; needs: { skillId: string; level: SkillLevel }[]; createdAt: number; updatedAt: number };

// --- Mock interviews (users/{uid}/interviews/{id}) - V1, written by Functions ---
export type InterviewKind = 'troubleshooting' | 'design' | 'behavioral';
export type InterviewTurn = { q: string; a: string | null; followUp: boolean };
export type Interview = {
  kind: InterviewKind;
  turns: InterviewTurn[];
  status: 'active' | 'done';
  feedback: { overall: string; questions: { score: number; note: string; better: string }[]; practise: string[] } | null;
  createdAt: number; doneAt: number | null;
};

// --- Basics (PLAN-basics.md 6): daily foundations, learn first then practise ---
export type BasicKind = 'predict' | 'myth';
export type Gloss = { term: string; meaning: string };
export type BasicQuestion = {
  kind: BasicKind;
  prompt: string;
  options: string[];
  answer: number;          // index of the right option (for "myth": the wrong statement)
  why: string[];           // the cause-and-effect chain, 3 short lines
  rule: string;            // one rule of thumb
  seeIt: string;           // one command to see it yourself
  glossary: Gloss[];       // hard words in the prompt
  setup: string;           // 2-3 sentences of background for "I don't get it"
};
// users/{uid}/basics/{conceptId} - written by the client
export type BasicState = {
  deck: string;
  status: 'reading' | 'learning' | 'learned'; // reading = lesson open, check not answered yet
  readAt: number | null;
  box: 1 | 2 | 3 | 4 | 5;
  nextReviewAt: number | null;
  lastKind: BasicKind | null;
  blindSpots: number;      // wrong while "sure"
  stuck: number;           // "I don't get it"
  stuckAt: number[];       // last 5 times, for the 7-day rule
  updatedAt: number;
};
// users/{uid}/basicLessons/{conceptId} - written by Functions, read by the client
export type BasicLesson = {
  problem: string;
  how: string[];
  picture: string;
  seeIt: string;
  mistake: string;
  atWork: string;
  readMore: string;
  glossary: Gloss[];
  check: BasicQuestion;
  version: number;
  createdAt: number;
};
// users/{uid}/basicCards/{day_conceptId} - review questions, written by Functions; the client sets only the answer
export type BasicCard = BasicQuestion & {
  conceptId: string;
  level: 1 | 2 | 3;
  forDay: string;
  picked: number | null;
  sure: boolean | null;
  result: 'right' | 'wrong' | 'stuck' | null;
  answeredAt: number | null;
  createdAt: number;
};
// users/{uid}/basicDays/{YYYY-MM-DD} - today's session, written by Functions
export type BasicDay = { next: string | null; spare: string | null; reviews: string[]; createdAt: number };
