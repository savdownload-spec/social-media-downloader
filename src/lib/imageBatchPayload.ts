export type ImageBatchManifest<T> = {
  ok: true;
  completed: number;
  total: number;
  files: T[];
};

/** Decode the length-prefixed manifest without copying the following images. */
export function decodeImageBatchPayload<T>(payload: ArrayBuffer): { manifest: ImageBatchManifest<T>; dataStart: number } {
  if (payload.byteLength < 4) throw new Error('The server returned an incomplete batch.');
  const manifestLength = new DataView(payload).getUint32(0, false);
  if (manifestLength <= 0 || manifestLength > payload.byteLength - 4) {
    throw new Error('The server returned an invalid batch manifest.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(new Uint8Array(payload, 4, manifestLength)));
  } catch {
    throw new Error('The server returned an unreadable batch manifest.');
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as { ok?: unknown }).ok !== true || !Array.isArray((parsed as { files?: unknown }).files)) {
    throw new Error('The server returned an invalid batch manifest.');
  }
  return { manifest: parsed as ImageBatchManifest<T>, dataStart: 4 + manifestLength };
}
