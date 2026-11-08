import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const assets = JSON.parse(await readFile(path.join(root, 'src/lib/upscaler/assets.json'), 'utf8'));
const destination = path.join(root, 'public', assets.basePath);
for (const [name, expected] of Object.entries(assets.files)) {
  const source = name.endsWith('.wasm')
    ? `node_modules/@tensorflow/tfjs-backend-wasm/dist/${name}`
    : `node_modules/@upscalerjs/esrgan-slim/models/${name}`;
  const data = await readFile(path.join(root, source));
  if (data.length !== expected.size || createHash('sha256').update(data).digest('hex') !== expected.sha256) {
    throw new Error(`Upscaler asset integrity mismatch: ${name}`);
  }
  await mkdir(path.dirname(path.join(destination, name)), { recursive: true });
  await writeFile(path.join(destination, name), data);
}
await copyFile(path.join(root, 'node_modules/@upscalerjs/esrgan-slim/LICENSE'), path.join(destination, 'MODEL-LICENSE.txt'));
await copyFile(path.join(root, 'public/upscaler-notices/TENSORFLOW-LICENSE.txt'), path.join(destination, 'TENSORFLOW-LICENSE.txt'));
await copyFile(path.join(root, 'public/upscaler-notices/TENSORFLOW-LAYERS-LICENSE.txt'), path.join(destination, 'TENSORFLOW-LAYERS-LICENSE.txt'));
console.log('Verified local ESRGAN Slim 2× / 4× models and WASM runtime are ready.');
