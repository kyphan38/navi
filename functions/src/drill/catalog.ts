// Drill types the server can run (PLAN-navi.md 6.3), all 3 levels.
// Pure file: the root test suite imports it.

export type DrillLevel = 'easy' | 'medium' | 'hard';
export type AnswerKind = 'choice' | 'multi' | 'text' | 'order' | 'command' | 'message';
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

/** Every type has all 3 levels; which are open depends on history (unlock rules). */
const LEVELS = ['easy', 'medium', 'hard'] as const;

export const DRILLS = {
  // ---------------------------------------------------------------- tech
  incident: {
    group: 'tech',
    levels: LEVELS,
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
    levels: LEVELS,
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
  'why-chain': {
    group: 'tech',
    levels: LEVELS,
    brief: `A "why" chain. Start from one simple finding or symptom. Each round asks "why?" one level deeper:
level 1 fix the thing, level 2 find why it happened here, level 3 explain how AWS or the system really works,
level 4 make it impossible to happen again across all accounts.`,
    criteria: ['hypothesis', 'prevention'],
    topics: [
      'an S3 bucket became public',
      'a pipeline deploys to production without approval',
      'an IAM user has an old access key',
      'an alert fired but nobody saw it',
      'a security group allows 0.0.0.0/0 on port 22',
      'a Terraform apply deleted a resource',
      'logs were missing during an incident',
    ],
  },
  tradeoff: {
    group: 'tech',
    levels: LEVELS,
    brief: `A design trade-off. Give a real decision with two or three options for a payment platform on AWS.
Each round asks the learner to choose, give reasons, name the risks and what would change their mind.
There is no single right answer, but some reasons are much better than others.`,
    criteria: ['triage', 'safety', 'comms'],
    topics: [
      'one AWS account or many accounts',
      'roll back or fix forward during an incident',
      'ECS or Kubernetes for payment services',
      'managed database or self-hosted',
      'blue-green or canary deploys',
      'build an internal tool or buy one',
      'strict change freeze or small safe changes before a holiday',
    ],
  },
  logs: {
    group: 'tech',
    levels: LEVELS,
    brief: `Read logs or metrics. Show a short log snippet or a small table of numbers (in a fenced code block)
from a payment service. Each round asks what stands out, what it may mean and what to check next.
Hide one real signal among normal noise.`,
    criteria: ['triage', 'hypothesis'],
    topics: [
      'API gateway access logs during a spike',
      'database slow query log',
      'CloudTrail events after a strange change',
      'error rates per endpoint over one hour',
      'latency percentiles p50, p95, p99',
      'a queue depth that keeps growing',
    ],
  },
  cost: {
    group: 'tech',
    levels: LEVELS,
    brief: `A cloud cost problem. The AWS bill for the payment platform went up. Show a short cost table.
Each round asks the learner where to look, what likely caused it, and how to bring it down safely
without hurting reliability or security.`,
    criteria: ['triage', 'hypothesis', 'prevention'],
    topics: [
      'NAT gateway data cost doubled',
      'CloudWatch Logs cost jumped',
      'idle RDS instances in test accounts',
      'S3 storage grew with old versions',
      'too many on-demand instances at night',
      'cross-region data transfer',
    ],
  },
  // ---------------------------------------------------------------- ai
  'review-ai-output': {
    group: 'ai',
    levels: LEVELS,
    brief: `Review work written by an AI assistant. Show a short script, Terraform or pipeline snippet that looks
fine but has 1-3 subtle mistakes (wrong flag, unsafe default, missing check). Each round asks the learner
to find the mistakes, judge the risk, and decide what to fix before it ships.`,
    criteria: ['hypothesis', 'safety', 'prevention'],
    topics: [
      'a bash script that rotates secrets',
      'a GitHub Actions deploy workflow',
      'a Terraform module for an S3 bucket',
      'a Python script that cleans old snapshots',
      'a Kubernetes deployment file',
      'an IAM policy written from a short prompt',
    ],
  },
  'brief-an-agent': {
    group: 'ai',
    levels: LEVELS,
    brief: `Give a task to an AI agent. The learner must write a clear brief (a spec) for an agent that does
one real DevOps job. Each round checks one part: the goal, the inputs, the limits (what the agent must
never do), how to check the result, and when to stop and ask a human.`,
    criteria: ['safety', 'comms', 'prevention'],
    topics: [
      'draft a Change Request from a pull request',
      'sort pipeline failures into code, test or environment',
      'turn a security finding into a Terraform fix pull request',
      'summarize an incident channel into a timeline',
      'check new IAM policies for wildcards',
    ],
  },
  'use-ai-or-not': {
    group: 'ai',
    levels: LEVELS,
    brief: `Decide how to use AI for a task. Give a real task from a bank DevOps team. Each round asks the learner
to choose: let AI do it, do it together, or do it by hand, and to name the risks (data rules, wrong answers,
who checks the result).`,
    criteria: ['triage', 'safety'],
    topics: [
      'reading production logs that may hold card data',
      'writing a runbook from old notes',
      'approving a production change',
      'explaining a Terraform plan to a manager',
      'answering an auditor question',
      'writing unit tests for a script',
    ],
  },
  // ---------------------------------------------------------------- comms
  'three-audiences': {
    group: 'comms',
    levels: LEVELS,
    brief: `Explain one problem to three different people. Give a short technical situation.
Each round asks the learner to explain it to one person: a developer (detail), a manager (risk, impact, plan),
and someone who is not technical (plain words, what it means for customers).`,
    criteria: ['triage', 'comms'],
    topics: [
      'a failed deploy that was rolled back',
      'a security finding that needs a quick fix',
      'why a release must wait one day',
      'a cost increase in the cloud bill',
      'a slow payment API last night',
    ],
  },
  'say-no': {
    group: 'comms',
    levels: LEVELS,
    brief: `Say "no" or "not yet" well. Someone with more power asks for something risky. Each round the pressure grows.
The learner must protect the system and the business, give clear reasons, and offer a safer way forward.`,
    criteria: ['safety', 'comms'],
    topics: [
      'skip the Change Request to release today',
      'give a developer admin access in production',
      'turn off an alert because it is noisy',
      'deploy on Friday evening before a holiday',
      'share production data with a vendor by email',
    ],
  },
  clarify: {
    group: 'comms',
    levels: LEVELS,
    brief: `Make a vague request clear. Show a short, unclear ticket or chat message. Each round asks the learner
to find what is missing, ask the right questions, and agree on what "done" means before starting work.`,
    criteria: ['hypothesis', 'comms'],
    topics: [
      '"Make the pipeline faster"',
      '"We need SSO for the admin portal"',
      '"Fix the security findings this sprint"',
      '"Set up monitoring for the new service"',
      '"Reduce our AWS bill"',
    ],
  },
  feedback: {
    group: 'comms',
    levels: LEVELS,
    brief: `Give and take feedback. Show a short code review comment, a pull request or a teammate message.
Each round asks the learner to rewrite a comment so it is clear and kind, or to answer feedback they got
without being defensive.`,
    criteria: ['comms'],
    topics: [
      'a harsh code review comment on Terraform',
      'a junior teammate missed a deadline',
      'your manager says your updates are too long',
      'a senior engineer rejected your design',
      'a pull request with many small problems',
    ],
  },
  'status-update': {
    group: 'comms',
    levels: LEVELS,
    brief: `Write status updates during an incident or a long task. Give the situation as it changes.
Each round asks for a short update (3 lines): what is happening, the impact, the next step and when the next
update comes.`,
    criteria: ['triage', 'comms'],
    topics: [
      'payment errors at 2 in the morning',
      'a migration that is running late',
      'a security patch rollout across 40 services',
      'a vendor outage that hits card payments',
    ],
  },
  // ---------------------------------------------------------------- business
  'payment-case': {
    group: 'business',
    levels: LEVELS,
    brief: `A payment business case. A customer or the operations team reports a payment problem (charged but failed,
paid twice, stuck transfer). Each round asks what to check (idempotency, reconciliation, cut-off times,
logs) and how to fix it safely for the customer.`,
    criteria: ['triage', 'hypothesis', 'safety', 'comms'],
    topics: [
      'customer charged but the app says failed',
      'a transfer paid twice after a timeout',
      'a payment stuck after the daily cut-off time',
      'reconciliation report does not match',
      'refunds failing for one card network',
    ],
  },
  'business-impact': {
    group: 'business',
    levels: LEVELS,
    brief: `Measure business impact. Give the facts of an outage or a risk with a few numbers. Each round asks
the learner to estimate customers, money, compliance and reputation impact, and to say what to tell
the business.`,
    criteria: ['triage', 'comms'],
    topics: [
      'a 20 minute payment outage at lunch time',
      'a public S3 bucket found by a scanner',
      'a slow login page for one week',
      'a missed batch file to another bank',
    ],
  },
  // ---------------------------------------------------------------- writing
  postmortem: {
    group: 'writing',
    levels: LEVELS,
    brief: `Write a short postmortem. Give the facts of a finished incident in a few lines. Each round asks for one part:
summary, timeline, root cause, what went well, and actions with owners. Blameless: about systems, not people.`,
    criteria: ['hypothesis', 'comms', 'prevention'],
    topics: [
      'expired certificate took down card payments',
      'a config change filled the connection pool',
      'a deleted DNS record broke an internal API',
      'a bad IAM change blocked deployments',
    ],
  },
  'cr-risk': {
    group: 'writing',
    levels: LEVELS,
    brief: `Write the risk part of a Change Request. Describe a planned production change. Each round asks for one part:
what could go wrong, how bad it would be, how to test it, how to roll back, and how to tell people.`,
    criteria: ['safety', 'comms', 'prevention'],
    topics: [
      'upgrade the database engine version',
      'rotate the TLS certificate on the payment API',
      'change the security group of the core service',
      'move a service to a new AWS account',
    ],
  },
  prioritize: {
    group: 'writing',
    levels: LEVELS,
    brief: `Choose what to do first. Give 5-6 tasks with short facts and a week with time for only 3.
Each round asks the learner to rank, give reasons, and say what they will tell the people whose task waits.`,
    criteria: ['triage', 'comms'],
    topics: [
      'security findings, a release, a broken pipeline and a manager request',
      'on-call week with a migration due',
      'three teams asking for help at the same time',
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
  if (level === 'easy')
    return `Use "choice" for most rounds (4 options, one clearly best). Use "multi" once when several answers are truly right. Give a short hint.`;
  if (level === 'medium')
    return `Use "choice" or "multi" for round 1. Use "text", "command" or "message" for the key rounds. Use "order" at most once (4-5 items to rank). Hint is an empty string.`;
  return `Use only "text", "command" or "message". Leave out some facts and add one misleading fact. Hint is an empty string.`;
}

/** Score in percent over the criteria in use; null when none. */
export function percent(score: Record<string, number | null> | null | undefined): number | null {
  if (!score) return null;
  const used = Object.values(score).filter((v): v is number => typeof v === 'number');
  return used.length ? Math.round((used.reduce((a, b) => a + b, 0) / (used.length * 3)) * 100) : null;
}

/**
 * Levels open for one type (PLAN-navi.md 6.2): easy always; the next level opens
 * when the last 3 done drills at the level below all scored 70% or more. A level
 * the learner already finished stays open. `done` is newest first.
 */
export function openLevels(done: { level: DrillLevel; score: Record<string, number | null> | null }[]): DrillLevel[] {
  const order: DrillLevel[] = ['easy', 'medium', 'hard'];
  const open: DrillLevel[] = ['easy'];
  for (let i = 1; i < order.length; i++) {
    const below = done.filter((d) => d.level === order[i - 1]).slice(0, 3);
    const earned = below.length === 3 && below.every((d) => (percent(d.score) ?? 0) >= 70);
    const used = done.some((d) => d.level === order[i]);
    if (earned || used) open.push(order[i]);
    else break;
  }
  return open;
}
