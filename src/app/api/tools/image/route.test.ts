import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

const mocks = vi.hoisted(() => ({
  requireCredits: vi.fn(),
  spend: vi.fn(),
  fail: vi.fn(),
}));

vi.mock('@/lib/credits', () => ({
  JOB_COST: { imageTool: 1 },
  requestIdempotencyKey: (request: Request) => request.headers.get('Idempotency-Key'),
  requireCredits: mocks.requireCredits,
}));
vi.mock('@/lib/toolStatus', () => ({ requireToolAvailable: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/imageRateLimit', () => ({
  checkImageIpLimit: vi.fn(async () => null),
  checkImageUserLimit: vi.fn(async () => null),
}));

import { POST } from './route';

function request(file: File, fields: Record<string, string>, key = 'image:test-key') {
  const body = new FormData();
  body.append('file', file);
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  return new Request('https://savdown.test/api/tools/image', { method: 'POST', headers: { 'Idempotency-Key': key }, body });
}

describe('image tool API validation and charging', () => {
  beforeEach(() => {
    mocks.spend.mockReset().mockResolvedValue(true);
    mocks.fail.mockReset().mockResolvedValue('operation');
    mocks.requireCredits.mockReset().mockResolvedValue({ ok: true, userId: 'user-1', spend: mocks.spend, fail: mocks.fail });
  });

  it('rejects unsupported uploads before opening the credit gate', async () => {
    const response = await POST(request(new File(['hello'], 'note.txt', { type: 'text/plain' }), { op: 'enhance' }));
    expect(response.status).toBe(415);
    expect(mocks.requireCredits).not.toHaveBeenCalled();
  });

  it('validates resize dimensions before opening the credit gate', async () => {
    const response = await POST(request(new File(['x'], 'photo.png', { type: 'image/png' }), { op: 'resize' }));
    expect(response.status).toBe(400);
    expect(mocks.requireCredits).not.toHaveBeenCalled();
  });

  it('returns a real output and spends once only after processing succeeds', async () => {
    const input = await sharp({ create: { width: 10, height: 6, channels: 3, background: '#336699' } }).png().toBuffer();
    const response = await POST(request(new File([input], 'photo.png', { type: 'image/png' }), { op: 'resize', width: '5' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('X-Output-Width')).toBe('5');
    expect(mocks.spend).toHaveBeenCalledTimes(1);
    const output = Buffer.from(await response.arrayBuffer());
    expect(await sharp(output).metadata()).toMatchObject({ format: 'png', width: 5, height: 3 });
  });

  it('does not spend credits when image decoding fails', async () => {
    const response = await POST(request(new File(['not an image'], 'broken.png', { type: 'image/png' }), { op: 'enhance' }));
    expect(response.status).toBe(422);
    expect(mocks.spend).not.toHaveBeenCalled();
    expect(mocks.fail).toHaveBeenCalledTimes(1);
  });
});
