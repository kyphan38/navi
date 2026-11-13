import { splitProse } from '@/lib/drills';

/** Text from the AI: paragraphs and fenced code blocks, nothing else. */
export default function Prose({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {splitProse(text).map((p, i) =>
        p.code ? (
          <pre key={i} className="overflow-x-auto rounded-md bg-surface-2 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-ink">
            {p.text}
          </pre>
        ) : (
          <p key={i} className="whitespace-pre-wrap [overflow-wrap:anywhere]">
            {p.text}
          </p>
        ),
      )}
    </div>
  );
}
