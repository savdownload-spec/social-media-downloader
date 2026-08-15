import PDFDocument from 'pdfkit';
import type { ExportFieldDef } from '../fields';
import { formatFieldValue, type ExportRow } from '../data';

const PAGE_MARGIN = 28;
const ROW_H = 16;
const HEADER_H = 20;

export async function buildPdf(rows: ExportRow[], fields: ExportFieldDef[], meta: {
  exportedAt: string; exportedBy: string; userCount: number; dateRange: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: PAGE_MARGIN });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const pageWidth = doc.page.width - PAGE_MARGIN * 2;

  function drawTitle() {
    doc.fillColor('#4c1d95').fontSize(16).font('Helvetica-Bold').text('SavDown — Users Export', PAGE_MARGIN, PAGE_MARGIN);
    doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
      .text(`Exported ${meta.exportedAt} by ${meta.exportedBy}  ·  ${meta.userCount.toLocaleString()} users  ·  ${meta.dateRange}`, PAGE_MARGIN, PAGE_MARGIN + 20);
    doc.moveTo(PAGE_MARGIN, PAGE_MARGIN + 38).lineTo(doc.page.width - PAGE_MARGIN, PAGE_MARGIN + 38).strokeColor('#e5e7eb').stroke();
  }

  drawTitle();
  let y = PAGE_MARGIN + 50;

  const colWidth = pageWidth / Math.max(1, fields.length);
  const fontSize = fields.length > 12 ? 6 : fields.length > 8 ? 7 : 8;

  function drawHeaderRow() {
    doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#111827');
    doc.rect(PAGE_MARGIN, y, pageWidth, HEADER_H).fill('#f3f0ff');
    doc.fillColor('#4c1d95');
    fields.forEach((f, i) => {
      doc.text(f.label, PAGE_MARGIN + i * colWidth + 3, y + 5, { width: colWidth - 6, ellipsis: true, lineBreak: false });
    });
    y += HEADER_H;
  }

  drawHeaderRow();

  doc.font('Helvetica').fontSize(fontSize);
  rows.forEach((row, idx) => {
    if (y + ROW_H > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
      drawHeaderRow();
      doc.font('Helvetica').fontSize(fontSize);
    }
    if (idx % 2 === 1) {
      doc.rect(PAGE_MARGIN, y, pageWidth, ROW_H).fill('#fafafa');
    }
    doc.fillColor('#1f2937');
    fields.forEach((f, i) => {
      const value = String(formatFieldValue(row, f.id));
      doc.text(value, PAGE_MARGIN + i * colWidth + 3, y + 4, { width: colWidth - 6, ellipsis: true, lineBreak: false });
    });
    y += ROW_H;
  });

  doc.end();
  return done;
}
