// ============================================================
// navi - Export everything to one JSON file
//
// Pure file: the reads live in repo.ts, the download in SettingsView.
// ============================================================

/** Every collection under users/{uid} that the owner may read. */
export const EXPORT_COLLECTIONS = [
  'meta',
  'skills',
  'drills',
  'mistakes',
  'terms',
  'courses',
  'weeks',
  'days',
  'milestones',
  'digests',
  'asks',
] as const;

export type ExportCollection = (typeof EXPORT_COLLECTIONS)[number];
export type ExportDoc = { id: string } & Record<string, unknown>;

export function exportFilename(day: string): string {
  return `navi-${day}.json`;
}

export function buildExport(
  data: Partial<Record<ExportCollection, ExportDoc[]>>,
  exportedAt: number,
): string {
  const collections: Record<string, ExportDoc[]> = {};
  for (const name of EXPORT_COLLECTIONS) {
    collections[name] = [...(data[name] ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  const counts = Object.fromEntries(EXPORT_COLLECTIONS.map((n) => [n, collections[n].length]));
  return JSON.stringify({ app: 'navi', version: 1, exportedAt: new Date(exportedAt).toISOString(), counts, collections }, null, 2);
}
