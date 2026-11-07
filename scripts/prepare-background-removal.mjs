// Build-time asset preparation only. Browsers never contact the model provider.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const assets = JSON.parse(await readFile(path.join(root, 'src/lib/background-removal/assets.json'), 'utf8'));
const destination = path.join(root, 'public', assets.basePath);
const digest = (data) => createHash('sha256').update(data).digest('hex');
const valid = (data, entry) => data.length === entry.size && digest(data) === entry.sha256;
await mkdir(destination, { recursive: true });

let complete = true;
for (const entry of assets.chunks) {
  const data = await readFile(path.join(destination, entry.file)).catch(() => null);
  if (!data || !valid(data, entry)) complete = false;
}
if (!complete) {
  console.log('Preparing pinned ISNet FP16 model (88,152,708 bytes)…');
  // Immutable revision + SHA-256, rather than a mutable CDN manifest.
  let data;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(assets.source, { signal: AbortSignal.timeout(300_000) });
      if (!response.ok || /text\/html|application\/json/i.test(response.headers.get('content-type') ?? '')) {
        await response.body?.cancel();
        throw new Error(`Model download failed: HTTP ${response.status}. No assets were published.`);
      }
      const downloaded = Buffer.from(await response.arrayBuffer());
      if (!valid(downloaded, assets)) throw new Error('ISNet download has an incorrect size or SHA-256.');
      data = downloaded;
      break;
    } catch (error) {
      lastError = error;
      console.warn(`Model preparation attempt ${attempt + 1} failed: ${error.message}`);
    }
  }
  if (!data) throw lastError;
  let offset = 0;
  for (const entry of assets.chunks) {
    const chunk = data.subarray(offset, offset + entry.size);
    if (!valid(chunk, entry)) throw new Error(`Invalid model chunk: ${entry.file}`);
    await writeFile(path.join(destination, entry.file), chunk);
    offset += entry.size;
  }
}
const runtimePackage = JSON.parse(await readFile(path.join(root, 'node_modules/onnxruntime-web/package.json'), 'utf8'));
if (runtimePackage.version !== '1.21.0') throw new Error('Background remover requires ONNX Runtime 1.21.0.');
for (const entry of assets.runtime) {
  const source = path.join(root, 'node_modules/onnxruntime-web/dist', entry.file);
  if (!valid(await readFile(source), entry)) throw new Error(`Runtime integrity mismatch: ${entry.file}`);
  await copyFile(source, path.join(destination, entry.file));
}
console.log('Background removal model and CPU runtime assets are ready.');
