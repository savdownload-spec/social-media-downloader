import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ gate: vi.fn(), spend: vi.fn(), fail: vi.fn(), begin: vi.fn(), previous: vi.fn(), session: vi.fn() }));
vi.mock('@/lib/credits', () => ({ JOB_COST: { imageTool: 1 }, requestIdempotencyKey: (r: Request) => r.headers.get('Idempotency-Key'), requireCredits: mocks.gate }));
vi.mock('@/lib/toolStatus', () => ({ requireToolAvailable: async () => ({ ok: true }) }));
vi.mock('@/lib/imageRateLimit', () => ({ checkImageIpLimit: async () => null, checkImageUserLimit: async () => null }));
vi.mock('next-auth', () => ({ getServerSession: mocks.session }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: { download: { findUnique: mocks.previous } } }));
import { POST } from './route';
const receipt = { width: 64, height: 48, scale: 2, bytes: 3000, mime: 'image/png' };
const request = (action: string, result?: object) => new Request('http://localhost/api/tools/image/image-upscaler', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'upscale:test-operation' }, body: JSON.stringify({ action, result }) });
describe('upscaler authorization and success accounting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.previous.mockResolvedValue({ userId: 'user-1', tool: 'image-upscaler', status: 'processing' });
    mocks.spend.mockResolvedValue(true);
    mocks.gate.mockResolvedValue({ ok: true, userId: 'user-1', spend: mocks.spend, fail: mocks.fail, begin: mocks.begin });
  });
  it('authorizes at configured cost without a deduction', async () => {
    expect((await POST(request('authorize'))).status).toBe(200);
    expect(mocks.gate).toHaveBeenCalledWith(expect.objectContaining({ cost: 1 }));
    expect(mocks.begin).toHaveBeenCalledOnce(); expect(mocks.spend).not.toHaveBeenCalled();
  });
  it('never deducts for failed inference or malformed completion', async () => {
    expect((await POST(request('failed'))).status).toBe(200);
    expect(mocks.fail).toHaveBeenCalledOnce();
    expect((await POST(request('complete'))).status).toBe(400);
    expect((await POST(request('complete', { ...receipt, width: 100000 }))).status).toBe(400);
    expect(mocks.spend).not.toHaveBeenCalled();
  });
  it('spends once on the authorized completion and acknowledges retries without reopening the balance gate', async () => {
    expect((await POST(request('complete', receipt))).status).toBe(200);
    expect(mocks.spend).toHaveBeenCalledOnce();
    mocks.previous.mockResolvedValue({ userId: 'user-1', tool: 'image-upscaler', status: 'success' });
    mocks.gate.mockResolvedValue({ ok: false, response: new Response(null, { status: 402 }) });
    expect((await POST(request('complete', receipt))).status).toBe(200);
    expect(mocks.spend).toHaveBeenCalledOnce(); expect(mocks.gate).toHaveBeenCalledOnce();
  });
  it('requires authenticated ownership and prior authorization', async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(request('complete', receipt))).status).toBe(401);
    mocks.session.mockResolvedValue({ user: { id: 'user-1' } }); mocks.previous.mockResolvedValue(null);
    expect((await POST(request('complete', receipt))).status).toBe(409);
    expect(mocks.spend).not.toHaveBeenCalled();
  });
  it('does not report success if the balance changes before completion', async () => {
    mocks.spend.mockResolvedValue(false);
    expect((await POST(request('complete', receipt))).status).toBe(402);
  });
  it('rejects malformed JSON and oversized receipts, including requests without Content-Length', async () => {
    for (const [body, status] of [['null', 400], ['[]', 400], ['{', 400], ['x'.repeat(4097), 413]] as const) {
      const response = await POST(new Request('http://localhost/api', { method: 'POST', body }));
      expect(response.status).toBe(status);
    }
    expect(mocks.spend).not.toHaveBeenCalled();
  });
});
