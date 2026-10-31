import { describe, expect, it } from 'vitest';
import { decodeImageBatchPayload } from './imageBatchPayload';

function payload(manifest: object, data = new Uint8Array()) {
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  const output = new Uint8Array(4 + json.length + data.length);
  new DataView(output.buffer).setUint32(0, json.length, false);
  output.set(json, 4);
  output.set(data, 4 + json.length);
  return output.buffer;
}

describe('decodeImageBatchPayload', () => {
  it('decodes the manifest and preserves the raw data boundary', () => {
    const result = decodeImageBatchPayload<{ name: string }>(payload({ ok: true, completed: 1, total: 1, files: [{ name: 'one.png' }] }, new Uint8Array([1, 2, 3])));
    expect(result.manifest.files[0]?.name).toBe('one.png');
    expect(new Uint8Array(payload({ ok: true, completed: 0, total: 0, files: [] })).byteLength).toBeGreaterThan(4);
    expect(result.dataStart).toBeGreaterThan(4);
  });

  it('rejects truncated, malformed, and unsuccessful manifests', () => {
    expect(() => decodeImageBatchPayload(new ArrayBuffer(3))).toThrow('incomplete');
    expect(() => decodeImageBatchPayload(payload({ ok: false, files: [] }))).toThrow('invalid');
    const broken = new Uint8Array([0, 0, 0, 9, 123]).buffer;
    expect(() => decodeImageBatchPayload(broken)).toThrow('invalid');
  });
});
