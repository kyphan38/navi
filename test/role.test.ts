import assert from 'node:assert/strict';
import { test } from 'node:test';

import { learnNext, roleGaps, roleReadiness } from '@/lib/role';
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
