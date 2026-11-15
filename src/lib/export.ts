// ============================================================
// navi - Export everything to one JSON file
//
// Pure file: the reads live in repo.ts, the download in SettingsView.
// ============================================================

/** Every collection under users/{uid} that the owner may list. meta/profile is read on its own. */
export const EXPORT_COLLECTIONS = [
  'skills',
  'drills',
  'mistakes',
  'terms',
  'courses',
  'weeks',
  'days',
  'milestones',
  'digests',
  'months',
  'asks',
] as const;

export type ExportCollection = (typeof EXPORT_COLLECTIONS)[number];
export type ExportDoc = { id: string } & Record<string, unknown>;

export function exportFilename(day: string): string {
  return `navi-${day}.json`;
}

export type ExportData = Partial<Record<ExportCollection, ExportDoc[]>> & { profile?: Record<string, unknown> | null };

export function buildExport(data: ExportData, exportedAt: number): string {
  const collections: Record<string, ExportDoc[]> = {};
  for (const name of EXPORT_COLLECTIONS) {
    collections[name] = [...(data[name] ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  const counts = Object.fromEntries(EXPORT_COLLECTIONS.map((n) => [n, collections[n].length]));
  return JSON.stringify(
    { app: 'navi', version: 1, exportedAt: new Date(exportedAt).toISOString(), profile: data.profile ?? null, counts, collections },
    null,
    2,
  );
}
