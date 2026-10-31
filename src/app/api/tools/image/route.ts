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
import { requireCredits, JOB_COST, requestIdempotencyKey } from '@/lib/credits';
import { processImage, detectInputFormat, type ImageOperation, type OutputFormat } from '@/lib/imageService';
import { requireToolAvailable } from '@/lib/toolStatus';
import { IMAGE_MAX_FILE_BYTES, isAllowedImageType } from '@/lib/imageConfig';
import { checkImageIpLimit, checkImageUserLimit } from '@/lib/imageRateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_OPS = new Set([
  'compress', 'resize', 'convert', 'enhance',
  'jpg-to-png', 'png-to-jpg', 'to-webp', 'heic-to-jpg',
]);
const VALID_FORMATS = new Set<OutputFormat>(['jpeg', 'png', 'webp', 'gif', 'avif']);
const VALID_FITS = new Set(['cover', 'contain', 'fill', 'inside', 'outside']);

const TOOL_BY_OP: Record<string, string> = {
  compress: 'image-compressor', resize: 'image-resizer', convert: 'image-converter', enhance: 'image-enhancer',
  'jpg-to-png': 'jpg-to-png', 'png-to-jpg': 'png-to-jpg', 'to-webp': 'webp-converter', 'heic-to-jpg': 'heic-to-jpg',
};

function reusableOutputFormat(file: File): OutputFormat {
  const detected = detectInputFormat(file.type, file.name);
  return detected === 'jpeg' || detected === 'png' || detected === 'webp' || detected === 'gif' || detected === 'avif'
    ? detected
    : 'jpeg';
}

export async function POST(req: Request) {
  const ipLimited = await checkImageIpLimit(req, 'single', { limit: 30, windowSeconds: 60 });
  if (ipLimited) return ipLimited;

  /* ── parse multipart early (needed to resolve tool slug for status gate) ── */
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const op = (formData.get('op') as string | null)?.toLowerCase() || 'compress';
  if (!VALID_OPS.has(op)) {
    return NextResponse.json({ error: `Unknown operation: ${op}` }, { status: 400 });
  }

  /* ── Tool status gate — reject before credits are charged ── */
  const statusGate = await requireToolAvailable(TOOL_BY_OP[op] ?? 'image-tool');
  if (!statusGate.ok) return statusGate.response;

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  // Guard against oversized uploads before buffering
  if ((file as File).size > IMAGE_MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum image size is 25 MB.' }, { status: 413 });
  }
  if ((file as File).size === 0) {
    return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 });
  }
  if (!isAllowedImageType((file as File).type)) {
    return NextResponse.json({ error: 'Unsupported file type. Use JPG, PNG, WEBP, GIF, HEIC, or AVIF.' }, { status: 415 });
  }

  const quality = parseInt(formData.get('quality') as string || '0', 10) || undefined;
  const width   = parseInt(formData.get('width')   as string || '0', 10) || undefined;
  const height  = parseInt(formData.get('height')  as string || '0', 10) || undefined;
  const format  = (formData.get('format') as OutputFormat | null) || undefined;
  const fit     = (formData.get('fit') as string | null) || undefined;

  if (quality !== undefined && (quality < 1 || quality > 100)) {
    return NextResponse.json({ error: 'Quality must be between 1 and 100.' }, { status: 400 });
  }
  if ([width, height].some((value) => value !== undefined && (value < 1 || value > 12_000))) {
    return NextResponse.json({ error: 'Width and height must be between 1 and 12,000 pixels.' }, { status: 400 });
  }
  if (op === 'resize' && !width && !height) {
    return NextResponse.json({ error: 'Enter a width, a height, or both.' }, { status: 400 });
  }
  if (format && !VALID_FORMATS.has(format)) {
    return NextResponse.json({ error: 'Unsupported output format.' }, { status: 400 });
  }
  if (fit && !VALID_FITS.has(fit)) {
    return NextResponse.json({ error: 'Unsupported resize fit mode.' }, { status: 400 });
  }

  const idempotencyKey = requestIdempotencyKey(req);
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }

  const trackingOperation = {
    tool: TOOL_BY_OP[op] ?? 'image-tool',
    platform: 'image',
    sourceUrl: `upload://${(file as File).name.replace(/[/\\?%*:|"<>]/g, '-') || 'image'}`,
    idempotencyKey,
  };

  // Credits are only spent after processing produces an output.
  const gate = await requireCredits({ cost: JOB_COST.imageTool, request: req, operation: trackingOperation });
  if (!gate.ok) return gate.response;
  const userLimited = await checkImageUserLimit(gate.userId, TOOL_BY_OP[op] ?? op, { limit: 20, windowSeconds: 60 });
  if (userLimited) return userLimited;

  /* ── read buffer ── */
  const arrayBuffer = await (file as File).arrayBuffer();
  const inputBuf    = Buffer.from(arrayBuffer);
  const origName    = (file as File).name.replace(/[/\\?%*:|"<>]/g, '-') || 'image';
  const baseName    = origName.replace(/\.[^.]+$/, '');
  /* ── build operation ── */
  let operation: ImageOperation;
  switch (op) {
    case 'compress':   operation = { op: 'compress', quality, format }; break;
    case 'resize':     operation = { op: 'resize', width, height, format: reusableOutputFormat(file as File), ...(fit ? { fit: fit as 'cover' | 'contain' | 'fill' | 'inside' | 'outside' } : {}) }; break;
    case 'convert':    operation = { op: 'convert', format: format ?? 'jpeg' }; break;
    case 'enhance':    operation = { op: 'enhance', format: reusableOutputFormat(file as File) }; break;
    case 'jpg-to-png': operation = { op: 'jpg-to-png' }; break;
    case 'png-to-jpg': operation = { op: 'png-to-jpg', quality }; break;
    case 'to-webp':    operation = { op: 'to-webp', quality }; break;
    case 'heic-to-jpg':operation = { op: 'heic-to-jpg', quality }; break;
    default:           return NextResponse.json({ error: 'Unknown op.' }, { status: 400 });
  }

  /* ── process ── */
  const result = await processImage(inputBuf, operation);
  if (!result.ok) {
    await gate.fail({ ...trackingOperation, failureReason: result.error });
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const filename = `${baseName}.${result.extension}`;

  if (!(await gate.spend({ ...trackingOperation, description: `${trackingOperation.tool}: ${origName}` }))) {
    await gate.fail({ ...trackingOperation, failureCode: 'credit_commit_failed', failureReason: 'Output was generated but the credit transaction could not be committed.' });
    return NextResponse.json(
      { error: 'Your balance changed before this could be charged. Please retry.' },
      { status: 402 },
    );
  }

  return new NextResponse(Buffer.from(result.buffer), {
    status: 200,
    headers: {
      'Content-Type':        result.mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Original-Size':     String(result.originalSize),
      'X-Output-Size':       String(result.outputSize),
      'X-Output-Width':      String(result.width),
      'X-Output-Height':     String(result.height),
      'X-Compression-Ratio': result.compressionRatio ?? '',
      'Cache-Control':       'no-store',
    },
  });
}
