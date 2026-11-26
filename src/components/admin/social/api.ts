'use client';

export type ApiEnvelope<T> = { ok: boolean; data?: T; error?: string };

async function parse<T>(response: Response): Promise<T> {
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // non-JSON error (proxy/timeout)
  }
  if (!response.ok || !json?.ok || !json.data) {
    throw new Error(json?.error || `Request failed (${response.status}).`);
  }
  return json.data;
}

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
  return parse<T>(response);
}

export async function apiSend<T>(
  url: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (method === 'DELETE' && response.ok) {
    const text = await response.text();
    if (!text) return {} as T;
    try {
      return (JSON.parse(text) as { data?: T }).data ?? ({} as T);
    } catch {
      return {} as T;
    }
  }
  return parse<T>(response);
}
