// Drill types the server can run. P1: incident + security-review, easy + medium.
// Pure file: the root test suite imports it.

export type DrillLevel = 'easy' | 'medium' | 'hard';
export type AnswerKind = 'choice' | 'text' | 'order' | 'command' | 'message';
export type Criterion = 'triage' | 'hypothesis' | 'safety' | 'comms' | 'prevention';

export const CRITERIA: readonly Criterion[] = ['triage', 'hypothesis', 'safety', 'comms', 'prevention'];

export type DrillSpec = {
  group: 'tech' | 'ai' | 'comms' | 'business' | 'writing';
  levels: readonly DrillLevel[];
  /** What the drill is, for the model. */
  brief: string;
  /** Criteria that make sense for this type; the rest are scored as not used. */
  criteria: readonly Criterion[];
  /** Topics to pick from when the learner gives none. */
  topics: readonly string[];
};

export const DRILLS = {
  incident: {
    group: 'tech',
    levels: ['easy', 'medium'],
    brief: `A production incident on a payment system on AWS. Start with an alert and a few numbers.
Each round the learner decides what to do next. The hidden cause stays the same the whole time.
Mix technical steps with people steps: who to tell, what to say, when to roll back.`,
    criteria: ['triage', 'hypothesis', 'safety', 'comms', 'prevention'],
    topics: [
      'database connection pool is full',
      'TLS certificate expired on an internal endpoint',
      'a bad deploy changed a timeout value',
      'DNS change points traffic to the wrong target',
      'a downstream core banking system is slow',
      'retry storm after a short outage',
      'disk full on a message broker',
      'IAM role lost a permission after a policy change',
      'NAT gateway limit reached',
      'duplicate payments after a client retry',
    ],
  },
  'security-review': {
    group: 'tech',
    levels: ['easy', 'medium'],
    brief: `A security review. Show a short Terraform or IAM policy snippet (10-30 lines) in a fenced code block.
It has 2-4 real problems (misconfiguration or too much access). Each round asks the learner to find,
rank or fix the problems, and to explain the risk for a payment system.`,
    criteria: ['triage', 'hypothesis', 'safety', 'prevention'],
    topics: [
      'S3 bucket policy',
      'IAM role with wildcard actions',
      'security group rules',
      'KMS key policy',
      'RDS instance settings',
      'CloudTrail and logging',
      'Lambda execution role',
      'cross-account access role',
      'secrets in environment variables',
      'public load balancer and WAF',
    ],
  },
} as const satisfies Record<string, DrillSpec>;

export type DrillType = keyof typeof DRILLS;

export function isDrillType(v: unknown): v is DrillType {
  return typeof v === 'string' && Object.hasOwn(DRILLS, v);
}

/** Number of rounds per level. */
export const ROUNDS: Record<DrillLevel, number> = { easy: 3, medium: 4, hard: 5 };

/** Which answer kinds each round uses, by level (PLAN-navi.md 6.2). */
export function kindRule(level: DrillLevel): string {
  if (level === 'easy') return `Use "choice" for every round (4 options, one clearly best). Give a short hint.`;
  if (level === 'medium')
    return `Use "choice" for round 1. Use "text", "command" or "message" for the key rounds. Use "order" at most once (4-5 items to rank). Hint is an empty string.`;
  return `Use only "text", "command" or "message". Leave out some facts and add one misleading fact. Hint is an empty string.`;
}
