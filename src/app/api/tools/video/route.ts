/**
 * POST /api/tools/video
 * Shared video processing endpoint for all FFmpeg-based tools.
 *
 * Body: multipart/form-data
 *   file    – video file (required)
 *   op      – operation: convert|compress|to-mp3|to-gif
 *   format  – target container (for convert)
 *   crf     – 18-40 (optional, for compress)
 *   bitrate – 128k|192k|320k (optional, for to-mp3)
 *   fps     – 5-24 (optional, for to-gif)
 *   width   – 120-720 (optional, for to-gif)
 *
 * Response: binary file with appropriate Content-Type/Content-Disposition.
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { processVideo, type VideoOperation } from '@/lib/videoService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_OPS = new Set(['convert', 'compress', 'to-mp3', 'to-gif']);
const VALID_FORMATS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv']);

export async function POST(req: Request) {
  /* ── rate limit (video processing is heavier, tighter limit) ── */
  const ip = getClientId(req);
  const rl = await ratelimit(`vid:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  // Credits are spent only once the job below succeeds.
  const gate = await requireCredits({ cost: JOB_COST.videoTool });
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

  const format  = (formData.get('format')  as string | null) || 'mp4';
  const crf     = parseInt(formData.get('crf')     as string || '0', 10) || undefined;
  const bitrate = (formData.get('bitrate') as string | null) as '128k' | '192k' | '320k' | null;
  const fps     = parseInt(formData.get('fps')     as string || '0', 10) || undefined;
  const width   = parseInt(formData.get('width')   as string || '0', 10) || undefined;

  const inputFile = file as File;
  const arrayBuffer = await inputFile.arrayBuffer();
  const inputBuf    = Buffer.from(arrayBuffer);
  const origName    = inputFile.name.replace(/[/\\?%*:|"<>]/g, '-') || 'video';
  const baseName    = origName.replace(/\.[^.]+$/, '');
  const inputExt    = origName.split('.').pop()?.toLowerCase() || 'mp4';

  /* ── build operation ── */
  let operation: VideoOperation;
  switch (op) {
    case 'convert': {
      if (!VALID_FORMATS.has(format)) {
        return NextResponse.json({ error: `Unsupported target format: ${format}` }, { status: 400 });
      }
      operation = { op: 'convert', format: format as 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv' };
      break;
    }
    case 'compress':  operation = { op: 'compress', crf }; break;
    case 'to-mp3':    operation = { op: 'to-mp3', bitrate: bitrate ?? undefined }; break;
    case 'to-gif':    operation = { op: 'to-gif', fps, width }; break;
    default:          return NextResponse.json({ error: 'Unknown op.' }, { status: 400 });
  }

  /* ── process ── */
  const result = await processVideo(inputBuf, inputExt, operation);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const filename = `${baseName}.${result.extension}`;

  await gate.spend('Video tool');
  return new NextResponse(Buffer.from(result.buffer), {
    status: 200,
    headers: {
      'Content-Type':        result.mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Original-Size':     String(result.originalSize),
      'X-Output-Size':       String(result.outputSize),
      'Cache-Control':       'no-store',
    },
  });
}
