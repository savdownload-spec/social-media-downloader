import { scrubSecrets } from './crypto';

export class ProviderError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = options.status;
    this.code = options.code;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** Best-effort extraction of a provider's error message. */
export function providerMessage(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) return null;
  const error = asRecord(record.error);
  if (error) {
    if (typeof error.message === 'string') return error.message;
    if (typeof error.error_description === 'string') return error.error_description;
    if (typeof error.code === 'string') return error.code;
  }
  if (typeof record.error_description === 'string') return record.error_description;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;
  if (Array.isArray(record.errors) && record.errors.length > 0) {
    return providerMessage(record.errors[0]);
  }
  return null;
}

export function providerCode(payload: unknown): string | undefined {
  const record = asRecord(payload);
  const error = asRecord(record?.error);
  const code = error?.code ?? record?.code;
  return code === undefined || code === null ? undefined : String(code);
}

export async function requestJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<{ data: T; status: number; headers: Headers }> {
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store', ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new ProviderError('The provider did not respond in time.', { code: 'TIMEOUT' });
  }

  const text = await response.text().catch(() => '');
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const raw = providerMessage(payload) ?? text.slice(0, 300) ?? `HTTP ${response.status}`;
    const message = String(scrubSecrets(raw)).slice(0, 500) || `HTTP ${response.status}`;
    throw new ProviderError(message, { status: response.status, code: providerCode(payload) });
  }

  return { data: payload as T, status: response.status, headers: response.headers };
}

export async function requestBinary(
  url: string,
  init: RequestInit = {},
  timeoutMs = 45_000,
): Promise<{ buffer: Buffer; contentType: string }> {
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store', ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new ProviderError('The media download timed out.', { code: 'TIMEOUT' });
  }
  if (!response.ok) {
    throw new ProviderError(`Media download failed (HTTP ${response.status}).`, { status: response.status });
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
  };
}

export function missingCredentials(provider: string): ProviderError {
  return new ProviderError(`${provider} credentials are not configured yet.`, { code: 'PROVIDER_NOT_CONFIGURED' });
}

export function isAuthError(error: unknown): boolean {
  if (!(error instanceof ProviderError)) return false;
  return error.status === 401 || error.status === 403 || error.code === '190' || error.code === 'OAuthException';
}
