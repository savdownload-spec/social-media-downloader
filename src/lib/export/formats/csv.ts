import type { ExportFieldDef } from '../fields';
import { formatFieldValue, type ExportRow } from '../data';

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(rows: ExportRow[], fields: ExportFieldDef[]): string {
  const header = fields.map((f) => escapeCsvCell(f.label)).join(',');
  const lines = rows.map((row) =>
    fields.map((f) => escapeCsvCell(formatFieldValue(row, f.id))).join(','),
  );
  return [header, ...lines].join('\r\n') + '\r\n';
}
