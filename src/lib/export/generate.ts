import type { ExportFieldDef, ExportFormat } from './fields';
import { buildExportFilename } from './fields';
import type { ExportRow } from './data';
import { buildCsv } from './formats/csv';
import { buildJson } from './formats/json';
import { buildXlsx } from './formats/xlsx';
import { buildPdf } from './formats/pdf';
import { buildZip } from './formats/zip';

export const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  json: 'application/json',
  pdf: 'application/pdf',
  zip: 'application/zip',
};

export interface ExportMeta {
  exportedAt: string;
  exportedBy: string;
  userCount: number;
  dateRange: string;
}

/**
 * Generates every requested format for a completed export. `zip` bundles
 * whichever *other* formats were requested alongside it (the caller/UI
 * ensures at least one non-zip format is present when zip is requested).
 */
export async function generateExportFiles(
  rows: ExportRow[],
  fields: ExportFieldDef[],
  formats: ExportFormat[],
  meta: ExportMeta,
  baseName: string,
  from: Date | null,
  to: Date | null,
): Promise<{ format: ExportFormat; name: string; buffer: Buffer; contentType: string }[]> {
  const nonZip = formats.filter((f) => f !== 'zip');
  const generated: { format: ExportFormat; name: string; buffer: Buffer; contentType: string }[] = [];

  for (const format of nonZip) {
    let buffer: Buffer;
    if (format === 'csv') buffer = Buffer.from(buildCsv(rows, fields), 'utf-8');
    else if (format === 'json') buffer = Buffer.from(buildJson(rows, fields, meta), 'utf-8');
    else if (format === 'xlsx') buffer = await buildXlsx(rows, fields, meta);
    else if (format === 'pdf') buffer = await buildPdf(rows, fields, meta);
    else continue;

    generated.push({
      format,
      name: buildExportFilename(baseName, format, from, to),
      buffer,
      contentType: CONTENT_TYPES[format],
    });
  }

  if (formats.includes('zip')) {
    const filesToZip = generated.length > 0 ? generated : [];
    const zipBuffer = await buildZip(filesToZip.map((f) => ({ name: f.name, buffer: f.buffer })));
    generated.push({
      format: 'zip',
      name: buildExportFilename(baseName, 'zip', from, to),
      buffer: zipBuffer,
      contentType: CONTENT_TYPES.zip,
    });
  }

  return generated;
}
