'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useUid } from '@/components/AuthGate';
import Fold from '@/components/Fold';
import OneOnOnePrep from '@/components/OneOnOnePrep';
import PageHead from '@/components/PageHead';
import BragDoc from '@/components/map/BragDoc';
import Stories from '@/components/map/Stories';
import TargetRole from '@/components/map/TargetRole';
import { useMapData } from '@/hooks/useMapData';
import { watchRole, watchStories, type StoryDoc } from '@/lib/repo-career';
import { roleGaps, roleReadiness } from '@/lib/role';
import type { TargetRole as TargetRoleData } from '@/types/navi';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 font-mono text-[12px] tracking-[0.12em] text-faint">{children}</h2>;
}

/**
 * What you show to other people (2026-11-26 cleanup, was the bottom of the Map):
 * target role, ask a senior, then stories, 1:1 prep and the brag doc, folded.
 */
export default function CareerView() {
  const uid = useUid();
  const { learning, drills, skills, milestones, days } = useMapData();
  const [stories, setStories] = useState<StoryDoc[]>([]);
  const [role, setRole] = useState<TargetRoleData | null>(null);
  useEffect(() => watchStories(uid, setStories), [uid]);
  useEffect(() => watchRole(uid, setRole), [uid]);

  if (!skills || !milestones || !days || !learning.ready) return <main className="column" />;
  const ready = role ? roleReadiness(roleGaps(role.needs, skills)) : null;

  return (
    <main className="column">
      <PageHead title="career" meta={ready !== null ? `ready ${ready}%` : undefined} />

      <section className="mt-8">
        <SectionTitle>target role</SectionTitle>
        <TargetRole role={role} skills={skills} />
      </section>

      <section className="mt-10">
        <SectionTitle>ask a senior</SectionTitle>
        <Link href="/ask/" className="group flex items-baseline justify-between gap-4 text-[15px]">
          <span className="text-muted">A real problem, no internal names</span>
          <span className="font-mono text-[12px] text-faint transition-colors group-hover:text-ink">ask</span>
        </Link>
      </section>

      <section className="mt-10">
        <SectionTitle>for 1:1s and interviews</SectionTitle>
        <Fold title="Stories" meta={stories.length}>
          <Stories stories={stories} drills={drills ?? []} skills={skills} />
        </Fold>
        <Fold title="1:1 prep">
          <OneOnOnePrep courses={learning.courses} stories={stories} days={days} skills={skills} drills={drills ?? []} milestones={milestones} />
        </Fold>
        <Fold title="Brag doc">
          <BragDoc courses={learning.courses} skills={skills} drills={drills ?? []} milestones={milestones} stories={stories} />
        </Fold>
      </section>
    </main>
  );
}
