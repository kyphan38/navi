import PageHead from '@/components/PageHead';

/** A page whose content comes in a later phase. */
export default function EmptyPage({ title }: { title: string }) {
  return (
    <main className="column">
      <PageHead title={title} />
    </main>
  );
}
