import JSZip from 'jszip';

export async function buildZip(files: { name: string; buffer: Buffer }[]): Promise<Buffer> {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.buffer);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
}
