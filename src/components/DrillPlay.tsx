'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import AnswerBox from '@/components/AnswerBox';
import { useUid } from '@/components/AuthGate';
import Debrief from '@/components/Debrief';
import { DrillLog } from '@/components/DrillLog';
import PageHead from '@/components/PageHead';
import Waiting from '@/components/Waiting';
import { aiError, answerDrill, finishDrill } from '@/lib/ai';
import { ROUNDS, typeLabel } from '@/lib/drills';
import { dropDrill, watchDrill, type DrillDoc } from '@/lib/repo';

export default function DrillPlay() {
  const uid = useUid();
  const router = useRouter();
  const id = useSearchParams().get('id') ?? '';
  const [drill, setDrill] = useState<DrillDoc | null | undefined>(undefined);
  const [busy, setBusy] = useState<'answer' | 'finish' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => (id ? watchDrill(uid, id, setDrill) : undefined), [uid, id]);

  if (!id || drill === null) {
    return (
      <main className="column">
        <PageHead title="drill" />
        <p className="mt-8 text-[15px] text-muted">
          Drill not found.{' '}
          <Link href="/drill/" className="text-faint hover:text-ink">
            back
          </Link>
        </p>
      </main>
    );
  }
  if (drill === undefined) return <main className="column" />;

  const total = ROUNDS[drill.level];
  const answered = drill.rounds.filter((r) => r.answer).length;
  const current = drill.rounds[drill.rounds.length - 1];
  const needsScore = drill.status === 'active' && answered >= total;

  const finish = async () => {
    setBusy('finish');
    setError(null);
    try {
      await finishDrill({ drillId: drill.id });
    } catch (err) {
      setError(aiError(err));
    } finally {
      setBusy(null);
    }
  };

  const send = async (answer: string) => {
    setBusy('answer');
    setError(null);
    try {
      const { done } = await answerDrill({ drillId: drill.id, answer });
      if (done) {
        await finish();
        return;
      }
    } catch (err) {
      setError(aiError(err));
    }
    setBusy(null);
  };

  const drop = () => {
    dropDrill(uid, drill.id);
    router.push('/drill/');
  };

  const meta =
    drill.status === 'active' ? `${Math.min(answered + 1, total)}/${total}` : drill.status === 'dropped' ? 'dropped' : `${total}/${total}`;

  return (
    <main className="column">
      <PageHead title={`${typeLabel(drill.type)} · ${drill.level}`} meta={meta} />
      <div className="mt-1 flex items-baseline justify-between gap-4">
        <p className="min-w-0 truncate text-[14px] text-faint">{drill.topic}</p>
        <div className="flex shrink-0 gap-4 font-mono text-[12px] text-faint">
          {drill.status === 'active' && !busy && (
            <button type="button" onClick={drop} className="hover:text-ink">
              drop
            </button>
          )}
          <Link href="/drill/" className="hover:text-ink">
            back
          </Link>
        </div>
      </div>

      {drill.status === 'done' ? (
        <Debrief drill={drill} />
      ) : (
        <div className="mt-8">
          <DrillLog drill={drill} />
          {drill.status === 'active' && (
            <div className="mt-6 pl-[3.75rem]">
              {busy ? (
                <Waiting word={busy === 'finish' ? 'scoring' : 'thinking'} />
              ) : needsScore ? (
                <button type="button" onClick={() => void finish()} className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg active:scale-[0.97]">
                  score it
                </button>
              ) : current && !current.answer ? (
                // key: a fresh box (no old pick or text) for each round
                <AnswerBox key={drill.rounds.length} round={current} busy={busy !== null} onSend={(a) => void send(a)} />
              ) : null}
              {error && (
                <p role="alert" className="mt-3 text-[14px] text-muted">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
