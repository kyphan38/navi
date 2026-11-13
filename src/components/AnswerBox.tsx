'use client';

import { useState, type KeyboardEvent } from 'react';

import type { Round } from '@/types/navi';

const PLACEHOLDER: Record<Round['kind'], string> = {
  choice: '',
  multi: '',
  order: '',
  text: 'Your answer',
  command: 'The command you would run',
  message: 'Your message',
};

/**
 * The input for the current round. `choice` picks one option (or "other" with
 * free text), `order` ranks by tapping in order, the rest are free text.
 */
export default function AnswerBox({ round, busy, onSend }: { round: Round; busy: boolean; onSend: (answer: string) => void }) {
  const [picked, setPicked] = useState<number | null>(null); // -1 = other
  const [many, setMany] = useState<number[]>([]); // multi: picked options, in option order
  const [order, setOrder] = useState<number[]>([]);
  const [text, setText] = useState('');
  const [showHint, setShowHint] = useState(false);

  const answer = (() => {
    if (round.kind === 'choice') {
      if (picked === -1) return text.trim();
      return picked === null ? '' : round.options[picked];
    }
    if (round.kind === 'multi') {
      return many.length ? [...many].sort((a, b) => a - b).map((i) => `- ${round.options[i]}`).join('\n') : '';
    }
    if (round.kind === 'order') {
      return order.length === round.options.length ? order.map((i, n) => `${n + 1}. ${round.options[i]}`).join('\n') : '';
    }
    return text.trim();
  })();

  const send = () => {
    if (answer && !busy) onSend(answer);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const textArea = (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={onKey}
      rows={round.kind === 'message' ? 4 : 3}
      maxLength={3000}
      placeholder={PLACEHOLDER[round.kind] || 'Your answer'}
      autoFocus={round.kind !== 'choice' && round.kind !== 'multi' && round.kind !== 'order'}
      className={`w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-[16px] leading-relaxed text-ink placeholder:text-faint focus:border-line-strong ${round.kind === 'command' ? 'font-mono text-[15px]' : ''}`}
    />
  );

  return (
    <div className="space-y-3">
      {round.kind === 'choice' && (
        <ul role="radiogroup" aria-label="Options">
          {[...round.options.map((o, i) => ({ i, o })), { i: -1, o: 'other' }].map(({ i, o }) => (
            <li key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={picked === i}
                onClick={() => setPicked(i)}
                className={`flex w-full items-baseline gap-3 py-1.5 text-left text-[15px] transition-colors ${picked === i ? 'text-ink' : 'text-muted hover:text-ink'}`}
              >
                <span className={`relative top-[-1px] size-[7px] shrink-0 rounded-full border ${picked === i ? 'border-ink bg-ink' : 'border-line-strong'}`} aria-hidden />
                <span className={i === -1 ? 'font-mono text-[13px] text-faint' : ''}>{o}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {round.kind === 'choice' && picked === -1 && textArea}

      {round.kind === 'multi' && (
        <div>
          <p className="mb-1 font-mono text-[12px] text-faint">pick all that apply</p>
          <ul>
            {round.options.map((o, i) => {
              const on = many.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setMany((s) => (on ? s.filter((x) => x !== i) : [...s, i]))}
                    className={`flex w-full items-baseline gap-3 py-1.5 text-left text-[15px] transition-colors ${on ? 'text-ink' : 'text-muted hover:text-ink'}`}
                  >
                    <span className={`relative top-[1px] size-2.5 shrink-0 rounded-[2px] border ${on ? 'border-ink bg-ink' : 'border-line-strong'}`} aria-hidden />
                    {o}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {round.kind === 'order' && (
        <div>
          <ul>
            {round.options.map((o, i) => {
              const pos = order.indexOf(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={pos >= 0}
                    onClick={() => setOrder((s) => [...s, i])}
                    className={`flex w-full items-baseline gap-3 py-1.5 text-left text-[15px] ${pos >= 0 ? 'text-ink' : 'text-muted hover:text-ink'}`}
                  >
                    <span className="w-4 shrink-0 font-mono text-[12px] text-faint tabular-nums">{pos >= 0 ? pos + 1 : '·'}</span>
                    {o}
                  </button>
                </li>
              );
            })}
          </ul>
          {order.length > 0 && (
            <button type="button" onClick={() => setOrder([])} className="mt-1 font-mono text-[12px] text-faint hover:text-ink">
              reset
            </button>
          )}
        </div>
      )}

      {round.kind !== 'choice' && round.kind !== 'multi' && round.kind !== 'order' && textArea}

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={send}
          disabled={!answer || busy}
          className="rounded-md bg-ink px-4 py-1.5 text-[14px] text-bg transition-[opacity,transform] active:scale-[0.97] disabled:opacity-30"
        >
          send
        </button>
        {round.hint &&
          (showHint ? (
            <span className="text-[14px] text-muted">{round.hint}</span>
          ) : (
            <button type="button" onClick={() => setShowHint(true)} className="font-mono text-[12px] text-faint hover:text-ink">
              hint
            </button>
          ))}
      </div>
    </div>
  );
}
