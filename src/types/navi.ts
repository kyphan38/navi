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
export type AnswerKind = 'choice' | 'text' | 'order' | 'command' | 'message';

export type Round = {
  prompt: string;
  kind: AnswerKind;
  options?: string[];
  answer?: string;
  reveal?: string;
};
export type Score = { triage: 0|1|2|3; hypothesis: 0|1|2|3; safety: 0|1|2|3; comms: 0|1|2|3; prevention: 0|1|2|3 };

export type Drill = {
  group: DrillGroup; type: DrillType; level: DrillLevel;
  topic: string;               // "IAM", "DB connection pool"...
  skillIds: string[];
  brief: string;
  rounds: Round[];             // 3-6
  status: 'active' | 'done' | 'dropped';
  score: Score | null;
  debrief: string | null;
  whatIf: string[];
  newTerms: string[];
  startedAt: number; doneAt: number | null;
};

export type DrillKey = {
  truth: string;
  seniorPath: string;
  rubric: string;
};

// --- Mistakes (users/{uid}/mistakes/{id}) ---
export type Mistake = {
  drillId: string; skillId: string | null;
  text: string;
  lesson: string;
  box: 1 | 2 | 3 | 4 | 5;      // Leitner
  nextReviewAt: number;
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
  needs: { skillId: string; level: SkillLevel }[];
  checklist: { text: string; done: boolean; at: number | null }[];
  order: number;
  doneAt: number | null;
};
