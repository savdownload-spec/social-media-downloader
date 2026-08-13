/**
 * POST /api/tools/image
 * Shared image processing endpoint for all Sharp-based tools.
 *
 * Body: multipart/form-data
 *   file    – image file (required)
 *   op      – operation: compress|resize|convert|enhance|jpg-to-png|
 *             png-to-jpg|to-webp|heic-to-jpg
 *   quality – 1-100 (optional, default varies per op)
 *   width   – px (optional, for resize)
 *   height  – px (optional, for resize)
 *   format  – target format string (optional, for convert)
 *   fit     – sharp fit mode (optional, for resize)
 *
 * Response: binary image file with appropriate Content-Type and
 *           Content-Disposition headers, plus X-* metadata headers.
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { processImage, type ImageOperation, type OutputFormat } from '@/lib/imageService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_OPS = new Set([
  'compress', 'resize', 'convert', 'enhance',
  'jpg-to-png', 'png-to-jpg', 'to-webp', 'heic-to-jpg',
]);

export async function POST(req: Request) {
  /* ── rate limit ── */
  const ip = getClientId(req);
  const rl = await ratelimit(`img:${ip}`, { limit: 30, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  // Credits are spent only once the job below succeeds.
  const gate = await requireCredits({ cost: JOB_COST.imageTool });
  if (!gate.ok) return gate.response;

  /* ── parse multipart ── */
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  const op = (formData.get('op') as string | null)?.toLowerCase() || 'compress';
  if (!VALID_OPS.has(op)) {
    return NextResponse.json({ error: `Unknown operation: ${op}` }, { status: 400 });
  }

  const quality = parseInt(formData.get('quality') as string || '0', 10) || undefined;
  const width   = parseInt(formData.get('width')   as string || '0', 10) || undefined;
  const height  = parseInt(formData.get('height')  as string || '0', 10) || undefined;
  const format  = (formData.get('format') as OutputFormat | null) || undefined;

  /* ── read buffer ── */
  const arrayBuffer = await (file as File).arrayBuffer();
  const inputBuf    = Buffer.from(arrayBuffer);
  const origName    = (file as File).name.replace(/[/\\?%*:|"<>]/g, '-') || 'image';
  const baseName    = origName.replace(/\.[^.]+$/, '');

  /* ── build operation ── */
  let operation: ImageOperation;
  switch (op) {
    case 'compress':   operation = { op: 'compress', quality, format }; break;
    case 'resize':     operation = { op: 'resize', width, height }; break;
    case 'convert':    operation = { op: 'convert', format: format ?? 'jpeg' }; break;
    case 'enhance':    operation = { op: 'enhance' }; break;
    case 'jpg-to-png': operation = { op: 'jpg-to-png' }; break;
    case 'png-to-jpg': operation = { op: 'png-to-jpg', quality }; break;
    case 'to-webp':    operation = { op: 'to-webp', quality }; break;
    case 'heic-to-jpg':operation = { op: 'heic-to-jpg', quality }; break;
    default:           return NextResponse.json({ error: 'Unknown op.' }, { status: 400 });
  }

  /* ── process ── */
  const result = await processImage(inputBuf, operation);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const filename = `${baseName}.${result.extension}`;

  await gate.spend('Image tool');

  return new NextResponse(Buffer.from(result.buffer), {
    status: 200,
    headers: {
      'Content-Type':        result.mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Original-Size':     String(result.originalSize),
      'X-Output-Size':       String(result.outputSize),
      'X-Compression-Ratio': result.compressionRatio ?? '',
      'Cache-Control':       'no-store',
    },
  });
}
