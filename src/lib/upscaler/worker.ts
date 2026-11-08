import * as tf from '@tensorflow/tfjs-core';
import { loadLayersModel, type LayersModel } from '@tensorflow/tfjs-layers';
import { setWasmPaths, setThreadsCount } from '@tensorflow/tfjs-backend-wasm';
import assets from './assets.json';
import { validateUpscaleDimensions, type UpscaleFactor } from './config';
import { validateUpscaleFile } from './input';

const scope = self as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage: (message: unknown) => void };
const send = (message: unknown) => scope.postMessage(message);
let model: LayersModel | null = null;
let modelScale: UpscaleFactor | null = null;
let runtimeReady = false;
let busy = false;

async function loadAsset(name: string): Promise<ArrayBuffer> {
  const expected = assets.files[name as keyof typeof assets.files];
  if (!expected) throw new Error('Unknown model asset.');
  const url = new URL(assets.basePath + name, self.location.origin).href;
  const cache = typeof caches === 'undefined' ? null : await caches.open('savdown-upscaler-v1').catch(() => null);
  const valid = async (data: ArrayBuffer) => data.byteLength === expected.size && Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), b => b.toString(16).padStart(2, '0')).join('') === expected.sha256;
  const cached = await cache?.match(url).catch(() => undefined);
  if (cached) {
    const bytes = await cached.arrayBuffer();
    if (await valid(bytes)) return bytes;
    await cache?.delete(url).catch(() => undefined);
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: 'error' });
  if (!response.ok || /text\/html/i.test(response.headers.get('content-type') ?? '')) throw new Error(`Model asset unavailable: ${name} (HTTP ${response.status}). Please retry or report a deployment asset error.`);
  const data = await response.arrayBuffer();
  if (!(await valid(data))) throw new Error(`Incomplete or corrupt model asset: ${name}. Please retry.`);
  await cache?.put(url, new Response(data)).catch(() => undefined);
  return data;
}

async function initialize(scale: UpscaleFactor) {
  if (!runtimeReady) {
    send({ type: 'progress', stage: 'Loading AI runtime…', percent: null });
    // Single-thread WASM needs neither isolation headers nor a GPU.
    setThreadsCount(1);
    const urls: Record<string, string> = {};
    try {
      for (const name of Object.keys(assets.files).filter(name => name.endsWith('.wasm'))) {
        urls[name] = URL.createObjectURL(new Blob([await loadAsset(name)], { type: 'application/wasm' }));
      }
      setWasmPaths(urls);
      if (!(await tf.setBackend('wasm'))) throw new Error('This browser could not start the AI runtime. Try a current browser.');
      await tf.ready();
      runtimeReady = true;
    } finally { Object.values(urls).forEach(url => URL.revokeObjectURL(url)); }
  }
  if (model && modelScale === scale) return;
  model?.dispose(); model = null; modelScale = null;
  send({ type: 'progress', stage: `Loading ${scale}× AI model…`, percent: null });
  const json = JSON.parse(new TextDecoder().decode(await loadAsset(`x${scale}/model.json`)));
  const weights = await loadAsset(`x${scale}/group1-shard1of1.bin`);
  model = await loadLayersModel(tf.io.fromMemory({ modelTopology: json.modelTopology, weightSpecs: json.weightsManifest[0].weights, weightData: weights }));
  modelScale = scale;
}

async function process(file: File, scale: UpscaleFactor) {
  await validateUpscaleFile(file, scale);
  // Decoding honors EXIF orientation in current browsers. Validate decoded dimensions before allocating tensors.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image', premultiplyAlpha: 'none' });
  try {
    const { width, height } = bitmap;
    validateUpscaleDimensions(width, height, scale);
    await initialize(scale);
    const source = new OffscreenCanvas(width, height);
    const context = source.getContext('2d', { willReadFrequently: true });
    const output = new OffscreenCanvas(width * scale, height * scale);
    const out = output.getContext('2d');
    if (!context || !out) throw new Error('Could not allocate image memory. Try a smaller image.');
    context.drawImage(bitmap, 0, 0);
    const rgba = context.getImageData(0, 0, width, height).data;
    // 32px cores with a 16px halo cover the model receptive field and avoid tile seams.
    const core = 32, halo = 16;
    const total = Math.ceil(width / core) * Math.ceil(height / core);
    let completed = 0;
    for (let y = 0; y < height; y += core) for (let x = 0; x < width; x += core) {
      const left = Math.max(0, x - halo), top = Math.max(0, y - halo);
      const right = Math.min(width, x + core + halo), bottom = Math.min(height, y + core + halo);
      const w = right - left, h = bottom - top;
      const rgb = new Float32Array(w * h * 3);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) for (let c = 0; c < 3; c++) rgb[(j * w + i) * 3 + c] = rgba[((top + j) * width + left + i) * 4 + c];
      const input = tf.tensor4d(rgb, [1, h, w, 3]);
      let prediction: tf.Tensor | null = null;
      try {
        prediction = model!.predict(input) as tf.Tensor;
        if (prediction.shape.join(',') !== [1, h * scale, w * scale, 3].join(',')) throw new Error('The AI model returned incorrect dimensions.');
        const values = await prediction.data();
        const tileW = Math.min(core, width - x) * scale, tileH = Math.min(core, height - y) * scale;
        const tile = out.createImageData(tileW, tileH);
        for (let j = 0; j < tileH; j++) for (let i = 0; i < tileW; i++) {
          const from = (((y - top) * scale + j) * w * scale + (x - left) * scale + i) * 3;
          const to = (j * tileW + i) * 4;
          for (let c = 0; c < 3; c++) {
            const value = values[from + c];
            if (!Number.isFinite(value)) throw new Error('The AI model produced invalid pixels. Try again.');
            tile.data[to + c] = Math.max(0, Math.min(255, Math.round(value)));
          }
          // Alpha is preserved separately; only RGB is inferred by the model.
          tile.data[to + 3] = rgba[(Math.floor((y * scale + j) / scale) * width + Math.floor((x * scale + i) / scale)) * 4 + 3];
        }
        out.putImageData(tile, x * scale, y * scale);
      } finally { input.dispose(); prediction?.dispose(); }
      send({ type: 'progress', stage: `Upscaling ${scale}×…`, percent: Math.floor(++completed / total * 100) });
    }
    send({ type: 'progress', stage: 'Encoding PNG…', percent: null });
    const blob = await output.convertToBlob({ type: 'image/png' });
    if (!blob.size || blob.type !== 'image/png') throw new Error('PNG export failed. Try a smaller image.');
    // Decode the generated file before reporting success.
    const check = await createImageBitmap(blob);
    const valid = check.width === width * scale && check.height === height * scale;
    check.close(); source.width = source.height = output.width = output.height = 0;
    if (!valid) throw new Error('The generated PNG has incorrect dimensions.');
    send({ type: 'result', blob, width: width * scale, height: height * scale });
  } finally { bitmap.close(); }
}

scope.onmessage = async ({ data }) => {
  if (busy) return;
  busy = true;
  try { await process(data.file, data.scale); }
  catch (error) { send({ type: 'error', message: error instanceof Error ? error.message : 'AI processing failed. Try a smaller image.' }); }
  finally { busy = false; }
};
