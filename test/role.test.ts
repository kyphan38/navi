import assert from 'node:assert/strict';
import { test } from 'node:test';

import { focusSkills, learnNext, roleGaps, roleReadiness } from '@/lib/role';
import type { Evidence } from '@/types/navi';

const ev = (kind: Evidence['kind'], level: Evidence['level'] = 2): Evidence => ({ level, kind, ref: null, note: '', at: 0 });

test('roleGaps: biggest gap first, thin evidence marked', () => {
  const skills = [
    { id: 'iam', name: 'IAM', computed: 2 as const, all: [ev('drill'), ev('module', 1)] },
    { id: 'net', name: 'Networking', computed: 3 as const, all: [ev('work', 3), ev('drill')] },
    { id: 'k8s', name: 'Kubernetes', computed: 1 as const, all: [ev('module', 1)] },
  ];
  const gaps = roleGaps(
    [
      { skillId: 'iam', level: 3 },
      { skillId: 'net', level: 3 },
      { skillId: 'k8s', level: 3 },
      { skillId: 'gone', level: 2 },
    ],
    skills,
  );
  assert.deepEqual(gaps.map((g) => [g.id, g.gap, g.thin]), [
    ['k8s', 2, true],
    ['gone', 2, false],
    ['iam', 1, true],
    ['net', 0, false],
  ]);
  assert.deepEqual(learnNext(gaps).map((g) => g.id), ['k8s', 'gone', 'iam']);
  assert.equal(roleReadiness(gaps), Math.round((100 * (1 + 0 + 2 + 3)) / 11));
  assert.equal(roleReadiness([]), 0);
});

test('focusSkills: skills below the needed level, biggest gap first, at most 5', () => {
  const skills = [
    { id: 'a', name: 'A', level: 1 },
    { id: 'b', name: 'B', level: 3 },
    { id: 'c', name: 'C', level: 0 },
  ];
  const needs = [
    { skillId: 'a', level: 2 },
    { skillId: 'b', level: 3 },
    { skillId: 'c', level: 3 },
    { skillId: 'gone', level: 2 },
  ];
  assert.deepEqual(focusSkills(needs, skills), ['C', 'A']);
  const many = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, name: `S${i}`, level: 0 }));
  assert.equal(focusSkills(many.map((m) => ({ skillId: m.id, level: 2 })), many).length, 5);
});

test('focusSkills skips parked areas', () => {
  const skills = [
    { id: 'g', name: 'GPU', level: 0, area: 'AI infra' },
    { id: 'k', name: 'K8s', level: 0, area: 'Containers & Kubernetes' },
  ];
  assert.deepEqual(focusSkills([{ skillId: 'g', level: 2 }, { skillId: 'k', level: 2 }], skills), ['K8s']);
});
