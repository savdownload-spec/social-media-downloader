import type { ExportFieldDef } from '../fields';
import { formatFieldValue, type ExportRow } from '../data';

export function buildJson(rows: ExportRow[], fields: ExportFieldDef[], meta: {
  exportedAt: string; exportedBy: string; userCount: number; dateRange: string; filters?: Record<string, unknown>;
}): string {
  const records = rows.map((row) => {
    const record: Record<string, string | number> = {};
    for (const f of fields) record[f.id] = formatFieldValue(row, f.id);
    return record;
  });
  return JSON.stringify({ meta, users: records }, null, 2);
}
