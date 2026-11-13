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
  { id: 'iam-policies', name: 'IAM policies', area: 'Security' },
  { id: 'iam-roles', name: 'IAM roles and trust', area: 'Security' },
  { id: 'kms-encryption', name: 'KMS and encryption', area: 'Security' },
  { id: 's3-security', name: 'S3 security', area: 'Security' },
  { id: 'network-security', name: 'Network security (SG, NACL, WAF)', area: 'Security' },
  { id: 'secrets', name: 'Secrets management', area: 'Security' },
  { id: 'audit-logging', name: 'Audit logging (CloudTrail, Config)', area: 'Security' },
  { id: 'guardrails', name: 'Guardrails and policy as code', area: 'Security' },
  { id: 'vpc', name: 'VPC and subnets', area: 'Networking' },
  { id: 'dns', name: 'DNS', area: 'Networking' },
  { id: 'tls', name: 'TLS and certificates', area: 'Networking' },
  { id: 'load-balancers', name: 'Load balancers', area: 'Networking' },
  { id: 'monitoring', name: 'Monitoring and alerts', area: 'Reliability' },
  { id: 'incident-response', name: 'Incident response', area: 'Reliability' },
  { id: 'slo', name: 'SLOs and error budgets', area: 'Reliability' },
  { id: 'scaling', name: 'Capacity and scaling', area: 'Reliability' },
  { id: 'backup-dr', name: 'Backup and disaster recovery', area: 'Reliability' },
  { id: 'iac', name: 'Infrastructure as code (Terraform)', area: 'Delivery' },
  { id: 'cicd', name: 'CI/CD pipelines', area: 'Delivery' },
  { id: 'change-management', name: 'Change management', area: 'Delivery' },
  { id: 'containers', name: 'Containers (ECS, Kubernetes)', area: 'Delivery' },
  { id: 'databases', name: 'Databases and connection pools', area: 'Data' },
  { id: 'payment-flows', name: 'Payment flows and idempotency', area: 'Payments' },
  { id: 'reconciliation', name: 'Reconciliation', area: 'Payments' },
  { id: 'status-updates', name: 'Status updates', area: 'Communication' },
  { id: 'postmortems', name: 'Writing postmortems', area: 'Communication' },
  { id: 'ai-tools', name: 'Using AI tools safely', area: 'AI' },
];

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
