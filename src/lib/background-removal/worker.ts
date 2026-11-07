import * as ort from 'onnxruntime-web/wasm';
import assets from './assets.json';

// CPU WASM works without WebGPU, SharedArrayBuffer or isolation headers.
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
const scope = self as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};
let session: ort.InferenceSession | null = null;
const cacheName = 'savdown-background-isnet-fp16-v1';
type Asset = { file: string; size: number; sha256: string };
const send = (message: unknown) => scope.postMessage(message);

async function verified(data: ArrayBuffer, asset: Asset) {
  if (data.byteLength !== asset.size) return false;
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('') === asset.sha256;
}

async function loadAsset(asset: Asset, progress?: (bytes: number) => void): Promise<ArrayBuffer> {
  const url = new URL(assets.basePath + asset.file, self.location.origin).href;
  // Storage denial/quota exhaustion should never prevent processing.
  const cache = typeof caches === 'undefined' ? null : await caches.open(cacheName).catch(() => null);
  const cached = await cache?.match(url).catch(() => undefined);
  if (cached) {
    const data = await cached.arrayBuffer();
    if (await verified(data, asset)) { progress?.(asset.size); return data; }
    await cache?.delete(url).catch(() => undefined);
  }
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    progress?.(0);
    const controller = new AbortController();
    let timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal, redirect: 'error', cache: attempt ? 'reload' : 'default',
      });
      const mime = response.headers.get('content-type') ?? '';
      if (response.status !== 200 || /text\/html|application\/json/i.test(mime)) {
        throw new Error(`Model asset ${asset.file}: HTTP ${response.status}, Content-Type ${mime || 'missing'}. Please report this deployment asset error.`);
      }
      if (!response.body) throw new Error('This browser cannot stream model assets.');
      const reader = response.body.getReader();
      const data = new Uint8Array(asset.size);
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        clearTimeout(timeout);
        timeout = setTimeout(() => controller.abort(), 45_000);
        if (received + value.length > asset.size) {
          await reader.cancel();
          throw new Error(`Invalid asset length for ${asset.file}.`);
        }
        data.set(value, received);
        received += value.length;
        progress?.(received);
      }
      if (!(await verified(data.buffer, asset))) throw new Error(`Incomplete or invalid asset ${asset.file}. Expected ${asset.size} bytes; received ${received}.`);
      await cache?.put(url, new Response(data, { headers: { 'Content-Type': mime } })).catch(() => undefined);
      return data.buffer;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function initialize() {
  if (session) { send({ type: 'ready' }); return; }
  const model = new Uint8Array(assets.size);
  let offset = 0;
  // Sequential chunks bound memory/network pressure and preserve verified
  // chunks for a retry after an interrupted download.
  for (const chunk of assets.chunks) {
    const data = await loadAsset(chunk, (bytes) => send({ type: 'download', current: offset + bytes, total: assets.size }));
    model.set(new Uint8Array(data), offset);
    offset += chunk.size;
  }
  if (!(await verified(model.buffer, { file: 'ISNet FP16', ...assets }))) throw new Error('Model checksum mismatch.');
  send({ type: 'initializing' });
  const urls: string[] = [];
  try {
    const [mjsAsset, wasmAsset] = assets.runtime;
    const mjs = URL.createObjectURL(new Blob([await loadAsset(mjsAsset)], { type: 'text/javascript' }));
    const wasm = URL.createObjectURL(new Blob([await loadAsset(wasmAsset)], { type: 'application/wasm' }));
    urls.push(mjs, wasm);
    ort.env.wasm.wasmPaths = { mjs, wasm };
    session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    send({ type: 'ready' });
  } finally {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }
}

scope.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') await initialize();
    if (data.type === 'process') {
      if (!session) throw new Error('Model has not loaded. Please retry.');
      const input = new ort.Tensor('float32', data.pixels as Float32Array, [1, 3, 1024, 1024]);
      const outputs = await session.run({ [session.inputNames[0]]: input });
      try {
        const output = outputs[session.outputNames[0]];
        if (output.type !== 'float32' || output.data.length !== 1024 * 1024) throw new Error('Unexpected model mask format.');
        const mask = new Float32Array(output.data as Float32Array);
        scope.postMessage({ type: 'result', mask }, [mask.buffer]);
      } finally {
        input.dispose();
        Object.values(outputs).forEach((output) => output.dispose());
      }
    }
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : 'Background removal failed. Please retry.' });
  }
};
