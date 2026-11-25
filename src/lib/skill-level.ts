// ============================================================
// navi - Skill levels from evidence (PLAN-navi.md 3.4). Pure.
//
// 1 Know  = a module tagged with the skill is done
// 2 Do    = a demo is done, or a medium+ drill scored 70% or more
// 3 Use   = the learner wrote how they used it at work
// 4 Teach = passed "Explain it back"
// Level = the highest level where every lower level also has evidence.
// Evidence from modules and drills is worked out from the data each time;
// only work and explain notes are stored on the skill.
// ============================================================

import { scorePercent } from '@/lib/drills';
import type { CourseModule, Drill, Evidence, SkillLevel } from '@/types/navi';

const DAY = 86_400_000;

export const LEVEL_NAMES = ['', 'know', 'do', 'use', 'teach'] as const;

/** Starter skills for a DevOps/SRE on a payment app (seeded once on the Map page). */
export const SKILL_CATALOG: readonly { id: string; name: string; area: string }[] = [
  { id: 'iam-policies', name: 'IAM policies', area: 'Cloud & security' },
  { id: 'iam-roles', name: 'IAM roles and trust', area: 'Cloud & security' },
  { id: 'kms-encryption', name: 'KMS and encryption', area: 'Cloud & security' },
  { id: 's3-security', name: 'S3 security', area: 'Cloud & security' },
  { id: 'network-security', name: 'Network security (SG, NACL, WAF)', area: 'Cloud & security' },
  { id: 'secrets', name: 'Secrets management', area: 'Cloud & security' },
  { id: 'audit-logging', name: 'Audit logging (CloudTrail, Config)', area: 'Cloud & security' },
  { id: 'guardrails', name: 'Guardrails and policy as code', area: 'Cloud & security' },
  { id: 'vpc', name: 'VPC and subnets', area: 'Linux & networking' },
  { id: 'dns', name: 'DNS', area: 'Linux & networking' },
  { id: 'tls', name: 'TLS and certificates', area: 'Linux & networking' },
  { id: 'load-balancers', name: 'Load balancers', area: 'Linux & networking' },
  { id: 'monitoring', name: 'Monitoring and alerts', area: 'Observability & reliability' },
  { id: 'incident-response', name: 'Incident response', area: 'Observability & reliability' },
  { id: 'slo', name: 'SLOs and error budgets', area: 'Observability & reliability' },
  { id: 'scaling', name: 'Capacity and scaling', area: 'Observability & reliability' },
  { id: 'backup-dr', name: 'Backup and disaster recovery', area: 'Observability & reliability' },
  { id: 'iac', name: 'Infrastructure as code (Terraform)', area: 'IaC & CI/CD' },
  { id: 'cicd', name: 'CI/CD pipelines', area: 'IaC & CI/CD' },
  { id: 'change-management', name: 'Change management', area: 'IaC & CI/CD' },
  { id: 'containers', name: 'Containers (ECS, Kubernetes)', area: 'Containers & Kubernetes' },
  { id: 'databases', name: 'Databases and connection pools', area: 'Data' },
  { id: 'payment-flows', name: 'Payment flows and idempotency', area: 'Payments' },
  { id: 'reconciliation', name: 'Reconciliation', area: 'Payments' },
  { id: 'status-updates', name: 'Status updates', area: 'Communication' },
  { id: 'postmortems', name: 'Writing postmortems', area: 'Communication' },
  { id: 'ai-tools', name: 'Using AI tools safely', area: 'AI' },
  // Next steps on the path: DevOps -> Platform -> AI infra.
  { id: 'failure-modes', name: 'Failure modes and blast radius', area: 'Observability & reliability' },
  { id: 'linux-perf', name: 'Linux performance (CPU, memory, disk, network)', area: 'Linux & networking' },
  { id: 'k8s-core', name: 'Kubernetes core (pods, scheduling, resources)', area: 'Containers & Kubernetes' },
  { id: 'k8s-networking', name: 'Kubernetes networking (Service, Ingress, CNI)', area: 'Containers & Kubernetes' },
  { id: 'gitops', name: 'Helm and GitOps', area: 'IaC & CI/CD' },
  { id: 'multi-tenancy', name: 'Multi-tenancy and RBAC', area: 'Containers & Kubernetes' },
  { id: 'observability', name: 'Observability (Prometheus, OpenTelemetry)', area: 'Observability & reliability' },
  { id: 'golden-paths', name: 'Internal platform and golden paths', area: 'IaC & CI/CD' },
  { id: 'gpu-basics', name: 'GPU basics (memory, bandwidth, nvidia-smi)', area: 'AI infra' },
  { id: 'gpu-k8s', name: 'GPUs on Kubernetes', area: 'AI infra' },
  { id: 'llm-serving', name: 'LLM serving (vLLM, batching, KV cache)', area: 'AI infra' },
  { id: 'gpu-capacity', name: 'GPU capacity and cost planning', area: 'AI infra' },
  { id: 'distributed-gpu', name: 'Multi-GPU work (NCCL, parallelism)', area: 'AI infra' },
];

/** Starter skills the learner does not have yet (none of the same id). */
export function missingStarters(have: readonly { id: string }[]): { id: string; name: string; area: string }[] {
  const ids = new Set(have.map((s) => s.id));
  return SKILL_CATALOG.filter((s) => !ids.has(s.id));
}

/** Evidence from done modules and good drills, for one skill. */
export function derivedEvidence(skillId: string, modules: CourseModule[], drills: (Drill & { id: string })[]): Evidence[] {
  const out: Evidence[] = [];
  for (const m of modules) {
    if (m.doneAt === null || !m.skillIds.includes(skillId)) continue;
    out.push({ level: 1, kind: 'module', ref: m.id, note: m.title, at: m.doneAt });
    if (m.kind === 'demo') out.push({ level: 2, kind: 'demo', ref: m.id, note: m.title, at: m.doneAt });
  }
  for (const d of drills) {
    if (d.status !== 'done' || d.doneAt === null || !d.skillIds.includes(skillId) || d.level === 'easy') continue;
    const pct = scorePercent(d.score);
    if (pct !== null && pct >= 70) out.push({ level: 2, kind: 'drill', ref: d.id, note: `${d.topic} ${pct}%`, at: d.doneAt });
  }
  return out;
}

/**
 * Level and when it was reached. A level counts only when every lower level has
 * evidence too; it is reached when the last of those first showed up.
 */
export function levelOf(evidence: Evidence[]): { level: SkillLevel; reachedAt: number | null } {
  let level: SkillLevel = 0;
  let reachedAt: number | null = null;
  for (const l of [1, 2, 3, 4] as const) {
    const at = evidence.filter((e) => e.level === l).map((e) => e.at);
    if (!at.length) break;
    level = l;
    reachedAt = Math.max(reachedAt ?? 0, Math.min(...at));
  }
  return { level, reachedAt };
}

/** Reached in the last 7 days: the Map shows a small "new". */
export function isNewLevel(reachedAt: number | null, now: number): boolean {
  return reachedAt !== null && now - reachedAt < 7 * DAY;
}
