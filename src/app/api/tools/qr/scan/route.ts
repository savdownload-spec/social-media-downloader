/**
 * POST /api/tools/qr/scan
 *
 * Body: multipart/form-data
 *   file – image file containing a QR code (JPG, PNG, WEBP, GIF)
 *
 * Response JSON:
 *   { ok: true,  data: string, type: string }
 *   { ok: false, error: string }
 *
 * Uses jsQR (MIT) to decode the QR code from a pixel array.
 * Sharp converts the input to raw RGBA before passing to jsQR.
 */
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`qrscan:${ip}`, { limit: 30, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });


  // Credits are spent only once the job below succeeds.
  const gate = await requireCredits({ cost: JOB_COST.qrTool });
  if (!gate.ok) return gate.response;
  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 }); }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit.' }, { status: 413 });
  }

  const inputBuf = Buffer.from(await file.arrayBuffer());

  try {
    // Convert to raw RGBA pixels (jsQR needs a flat Uint8ClampedArray)
    const { data, info } = await sharp(inputBuf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8ClampedArray(data.buffer);
    const code   = jsQR(pixels, info.width, info.height);

    if (!code) {
      return NextResponse.json(
        { ok: false, error: 'No QR code detected in the image. Make sure the QR code is clearly visible and not blurry.' },
        { status: 422 },
      );
    }

    await gate.spend('QR scan');

    return NextResponse.json({
      ok:   true,
      data: code.data,
      type: detectDataType(code.data),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Input buffer contains unsupported image format')) {
      return NextResponse.json(
        { ok: false, error: 'Unsupported image format. Please upload a JPG, PNG, WEBP, or GIF.' },
        { status: 422 },
      );
    }
    return NextResponse.json({ ok: false, error: `Scan failed: ${msg.slice(0, 200)}` }, { status: 500 });
  }
}

/** Best-effort detection of QR data type for the UI. */
function detectDataType(data: string): string {
  if (/^https?:\/\//i.test(data)) return 'URL';
  if (/^mailto:/i.test(data)) return 'Email';
  if (/^tel:/i.test(data)) return 'Phone';
  if (/^smsto:/i.test(data) || /^sms:/i.test(data)) return 'SMS';
  if (/^wifi:/i.test(data)) return 'WiFi';
  if (/^BEGIN:VCARD/i.test(data)) return 'Contact (vCard)';
  if (/^BEGIN:VEVENT/i.test(data)) return 'Calendar Event';
  if (/^geo:/i.test(data)) return 'Location';
  return 'Text';
}
