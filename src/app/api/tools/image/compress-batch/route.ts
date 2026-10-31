/**
 * POST /api/tools/image/compress-batch
 *
 * Batch image compression endpoint. Accepts multiple image files via
 * multipart/form-data and returns a compact binary manifest plus raw image
 * bytes. This avoids the 33% base64
 * expansion and oversized JSON payloads of the legacy response.
 *
 * Body (multipart/form-data):
 *   file[]   – one or more image files (field name "file", repeated)
 *   quality  – integer 10–100 (optional, default 80)
 *
 * Headers:
 *   Idempotency-Key  – required for per-file credit deduplication
 *
 * Response: application/vnd.savdown.image-batch
 *   uint32be manifest byte length + UTF-8 JSON manifest + raw file bytes
 */
import { NextResponse } from 'next/server';
import { requireCredits, JOB_COST, requestIdempotencyKey } from '@/lib/credits';
import { checkBatchLimit } from '@/lib/batchLimitGate';
import { processImage, type OutputFormat } from '@/lib/imageService';
import {
  IMAGE_MAX_FILE_BYTES,
  IMAGE_MAX_BATCH_BYTES,
  ALLOWED_IMAGE_TYPES,
} from '@/lib/imageConfig';
import { checkImageIpLimit, checkImageUserLimit } from '@/lib/imageRateLimit';
import { requireToolAvailable } from '@/lib/toolStatus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Map a file's MIME type to the Sharp OutputFormat we want to compress into. */
function detectOutputFormat(mimeType: string): OutputFormat {
  const m = mimeType.toLowerCase();
  if (m.includes('png'))            return 'png';
  if (m.includes('webp'))           return 'webp';
  if (m.includes('gif'))            return 'gif';
  if (m.includes('avif'))           return 'avif';
  // heic/heif — sharp outputs jpeg for these
  return 'jpeg';
}

/**
 * Given an original filename and the detected output format, return the
 * correct output filename.  For heic/heif inputs the extension becomes .jpg.
 */
function outputFilename(originalName: string, mimeType: string): string {
  const m = mimeType.toLowerCase();
  const isHeic = m.includes('heic') || m.includes('heif');
  if (isHeic) {
    return originalName.replace(/\.[^.]+$/, '') + '.jpg';
  }
  return originalName; // preserve original filename + extension for all other types
}

type FileResult = {
  sourceName: string;
  name: string;
  status: 'completed' | 'failed';
  originalSize?: number;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  buffer?: Buffer;
  error?: string;
};

function batchResponse(results: FileResult[], completed: number, total: number) {
  let offset = 0;
  const buffers: Buffer[] = [];
  const files = results.map(({ buffer, ...fileResult }) => {
    if (!buffer) return fileResult;
    const entry = { ...fileResult, offset, length: buffer.length };
    offset += buffer.length;
    buffers.push(buffer);
    return entry;
  });
  const manifest = Buffer.from(JSON.stringify({ ok: true, completed, total, files }), 'utf8');
  const prefix = Buffer.allocUnsafe(4);
  prefix.writeUInt32BE(manifest.length, 0);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(prefix);
      controller.enqueue(manifest);
      for (const buffer of buffers) controller.enqueue(buffer);
      controller.close();
    },
  });
  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.savdown.image-batch',
      'Content-Disposition': 'inline; filename="image-compression.batch"',
      'X-Completed-Count': String(completed),
      'X-Total-Count': String(total),
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(req: Request) {
  const ipLimited = await checkImageIpLimit(req, 'compress-batch', { limit: 8, windowSeconds: 60 });
  if (ipLimited) return ipLimited;

  const statusGate = await requireToolAvailable('image-compressor');
  if (!statusGate.ok) return statusGate.response;

  /* ── Parse multipart ── */
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Expected multipart/form-data.' },
      { status: 400 },
    );
  }

  const rawFiles = formData.getAll('file');
  if (!rawFiles.length) {
    return NextResponse.json({ ok: false, error: 'No files uploaded.' }, { status: 400 });
  }

  const requestKey = requestIdempotencyKey(req);
  if (!requestKey) {
    return NextResponse.json({ ok: false, error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }

  const qualityRaw = parseInt((formData.get('quality') as string | null) ?? '80', 10);
  const quality = Number.isFinite(qualityRaw) ? Math.min(100, Math.max(10, qualityRaw)) : 80;

  /* ── Per-file pre-validation (size + type) ── */
  const results: FileResult[] = [];
  const validFiles: { file: File; index: number }[] = [];

  for (let i = 0; i < rawFiles.length; i++) {
    const entry = rawFiles[i];
    if (!entry || typeof entry === 'string') {
      results.push({ sourceName: `file-${i}`, name: `file-${i}`, status: 'failed', error: 'Invalid file entry.' });
      continue;
    }
    const f = entry as File;
    const sourceName = f.name.replace(/[/\\?%*:|"<>]/g, '-') || `image-${i}`;

    if (f.size === 0) {
      results.push({ sourceName, name: sourceName, status: 'failed', error: 'The uploaded file is empty.' });
      continue;
    }

    if (f.size > IMAGE_MAX_FILE_BYTES) {
      results.push({
        sourceName,
        name: sourceName,
        status: 'failed',
        error: `File too large. Maximum size is 25 MB (got ${(f.size / 1024 / 1024).toFixed(1)} MB).`,
      });
      continue;
    }

    const mimeType = f.type.toLowerCase() || 'application/octet-stream';
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      results.push({
        sourceName,
        name: sourceName,
        status: 'failed',
        error: `Unsupported file type: ${mimeType}. Accepted: JPG, PNG, WEBP, GIF, HEIC, AVIF.`,
      });
      continue;
    }

    validFiles.push({ file: f, index: i });
  }

  /* ── Total batch-size guard (valid files only) ── */
  const totalValidBytes = validFiles.reduce((sum, { file: f }) => sum + f.size, 0);
  if (totalValidBytes > IMAGE_MAX_BATCH_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'Combined upload size exceeds 100 MB.' },
      { status: 413 },
    );
  }

  /* ── Credit preflight (charge for valid files only) ── */
  if (validFiles.length === 0) {
    // All files rejected pre-validation — return results without charging
    return batchResponse(results, 0, rawFiles.length);
  }

  const totalCost = validFiles.length * JOB_COST.imageTool;
  const batchLimitResponse = await checkBatchLimit(
    'image-compressor',
    validFiles.length,
    req,
    { cost: totalCost },
  );
  if (batchLimitResponse) return batchLimitResponse;

  const gate = await requireCredits({
    cost: totalCost,
    request: req,
    operation: { tool: 'image-compressor', platform: 'image', idempotencyKey: requestKey },
  });
  if (!gate.ok) return gate.response;
  const userLimited = await checkImageUserLimit(gate.userId, 'compress-batch', { limit: 6, windowSeconds: 60 });
  if (userLimited) return userLimited;

  /* ── Per-file processing ── */
  let completed = 0;
  for (const { file: f, index: i } of validFiles) {
    const sourceName = f.name.replace(/[/\\?%*:|"<>]/g, '-') || `image-${i}`;
    const mimeType = f.type.toLowerCase();
    const outFormat = detectOutputFormat(mimeType);
    const outName = outputFilename(sourceName, mimeType);

    const idempotencyKey = requestIdempotencyKey(req, String(i))!;
    const batchId = requestKey;

    let inputBuf: Buffer;
    try {
      inputBuf = Buffer.from(await f.arrayBuffer());
    } catch {
      results.push({
        sourceName,
        name: outName,
        status: 'failed',
        error: 'Could not read file buffer.',
      });
      await gate.fail({
        tool: 'image-compressor',
        platform: 'image',
        idempotencyKey,
        batchId,
        failureReason: 'Could not read file buffer.',
      });
      continue;
    }

    const result = await processImage(inputBuf, {
      op: 'compress',
      quality,
      format: outFormat,
    });

    if (!result.ok) {
      results.push({
        sourceName,
        name: outName,
        status: 'failed',
        error: result.error,
      });
      await gate.fail({
        tool: 'image-compressor',
        platform: 'image',
        idempotencyKey,
        batchId,
        failureReason: result.error,
      });
      continue;
    }

    const spent = await gate.spend({
      cost: 1,
      tool: 'image-compressor',
      platform: 'image',
      description: `image-compressor: ${sourceName}`,
      sourceUrl: `upload://${sourceName}`,
      idempotencyKey,
      batchId,
    });

    if (!spent) {
      results.push({
        sourceName,
        name: outName,
        status: 'failed',
        error: 'Credit balance changed mid-batch. Please retry.',
      });
      continue;
    }

    completed += 1;
    results.push({
      sourceName,
      name: outName,
      status: 'completed',
      originalSize: result.originalSize,
      size: result.outputSize,
      mimeType: result.mimeType,
      width: result.width,
      height: result.height,
      buffer: result.buffer,
    });
  }

  return batchResponse(results, completed, rawFiles.length);
}
