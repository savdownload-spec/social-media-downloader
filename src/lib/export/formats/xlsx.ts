import ExcelJS from 'exceljs';
import type { ExportFieldDef } from '../fields';
import { formatFieldValue, type ExportRow } from '../data';

export async function buildXlsx(rows: ExportRow[], fields: ExportFieldDef[], meta: {
  exportedAt: string; exportedBy: string; userCount: number; dateRange: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SavDown Admin';
  wb.created = new Date();

  const summary = wb.addWorksheet('Summary');
  summary.columns = [{ width: 22 }, { width: 40 }];
  summary.addRows([
    ['Export', 'SavDown Users'],
    ['Exported at', meta.exportedAt],
    ['Exported by', meta.exportedBy],
    ['Users', meta.userCount],
    ['Date range', meta.dateRange],
    ['Fields', fields.length],
  ]);
  summary.getColumn(1).font = { bold: true };

  const sheet = wb.addWorksheet('Users', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = fields.map((f) => ({ header: f.label, key: f.id, width: Math.max(14, Math.min(32, f.label.length + 6)) }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F0FF' } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: fields.length } };

  for (const row of rows) {
    const record: Record<string, string | number> = {};
    for (const f of fields) record[f.id] = formatFieldValue(row, f.id);
    sheet.addRow(record);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
