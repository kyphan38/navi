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
  newTerms: string[];
  tagged?: boolean;            // skillIds were set by skillTag (may still be empty)
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
  updatedAt: number;
};

export type Milestone = {
  title: string;               // "Pass AWS Security Specialty", "Ready for mid-level"
  kind: 'learning' | 'career';
  courseId: string | null;     // learning milestone that is "finish this course"
  needs: { skillId: string; level: SkillLevel }[];
  checklist: { text: string; done: boolean; at: number | null }[];
  order: number;
  doneAt: number | null;
};

// --- Digests (users/{uid}/digests/{YYYY-Www}) - written by Functions ---
export type NewsItem = { title: string; url: string; source: string; group: 'banking' | 'outside'; why: string };
export type Digest = {
  items: NewsItem[];
  postmortem: { title: string; url: string; source: string; summary: string; questions: string[] } | null;
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
