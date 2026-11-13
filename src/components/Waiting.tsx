/** AI is working: one slow-fading word, no spinner (DESIGN.md). */
export default function Waiting({ word = 'thinking' }: { word?: string }) {
  return (
    <span role="status" className="breathe font-mono text-[13px] text-faint">
      {word}…
    </span>
  );
}
