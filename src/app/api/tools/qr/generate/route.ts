/**
 * POST /api/tools/qr/generate
 *
 * Body (JSON):
 *   text     – string to encode (required, max 2048 chars)
 *   format   – "png" | "svg" | "base64"  (default: "png")
 *   size     – pixel width (default: 400, max: 1024)
 *   margin   – quiet zone cells (default: 4)
 *   color    – dark colour hex (default: #000000)
 *   bgColor  – light colour hex (default: #ffffff)
 *   ecLevel  – error correction "L"|"M"|"Q"|"H" (default: "M")
 *
 * Response:
 *   format="png"    → image/png binary
 *   format="svg"    → image/svg+xml text
 *   format="base64" → JSON { ok, dataUrl }
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import QRCode from 'qrcode';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Schema = z.object({
  text:    z.string().min(1).max(2048),
  format:  z.enum(['png', 'svg', 'base64']).default('png'),
  size:    z.number().int().min(64).max(1024).default(400),
  margin:  z.number().int().min(0).max(20).default(4),
  color:   z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#000000'),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
  ecLevel: z.enum(['L', 'M', 'Q', 'H']).default('M'),
});

export async function POST(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`qr:${ip}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });


  // Credits are spent only once the job below succeeds.
  const gate = await requireCredits({ cost: JOB_COST.qrTool });
  if (!gate.ok) return gate.response;
  let body: z.infer<typeof Schema>;
  try {
    const raw = await req.json();
    body = Schema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError
      ? err.errors.map(e => e.message).join(', ')
      : 'Invalid request body.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Shared renderer options (QRCodeRenderersOptions has width, margin, color).
  const rendererOpts: QRCode.QRCodeRenderersOptions = {
    width:                body.size,
    margin:               body.margin,
    errorCorrectionLevel: body.ecLevel,
    color: {
      dark:  body.color,
      light: body.bgColor,
    },
  };

  try {
    if (body.format === 'svg') {
      const svg = await QRCode.toString(body.text, {
        ...rendererOpts,
        type: 'svg',
      } as QRCode.QRCodeToStringOptions);

      await gate.spend('QR code (SVG)');
      return new NextResponse(svg, {
        headers: {
          'Content-Type':        'image/svg+xml',
          'Content-Disposition': 'attachment; filename="qrcode.svg"',
          'Cache-Control':       'public, max-age=86400',
        },
      });
    }

    if (body.format === 'base64') {
      // toDataURL uses 'image/png', not 'png'
      const dataUrl = await QRCode.toDataURL(body.text, {
        ...rendererOpts,
        type: 'image/png',
      } as QRCode.QRCodeToDataURLOptions);

      await gate.spend('QR code (base64)');
      return NextResponse.json({ ok: true, dataUrl });
    }

    // PNG (default) — toBuffer uses 'png'
    const pngBuffer = await QRCode.toBuffer(body.text, {
      ...rendererOpts,
      type: 'png',
    } as QRCode.QRCodeToBufferOptions);

    await gate.spend('QR code (PNG)');
    return new NextResponse(pngBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type':        'image/png',
        'Content-Disposition': 'attachment; filename="qrcode.png"',
        'Content-Length':      String(pngBuffer.length),
        'Cache-Control':       'public, max-age=86400',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'QR generation failed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
