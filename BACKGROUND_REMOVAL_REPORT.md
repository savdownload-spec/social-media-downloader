# Background removal implementation and deployment review

## Diagnosis

Before the change, package.json requested `@imgly/background-removal ^1.4.0`;
the lockfile and installed version resolved to **1.7.0**. `model: 'medium'`
aliases `/models/isnet_fp16`. No `publicPath` was supplied. Its actual asset
base was `https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/`.
`/models/isnet_fp16` is a manifest key, **not a SavDown route or filename**.
There were no model assets in Next.js `public/`, and no Vercel rewrite or
asset-copy step. Adding a SavDown `/models/isnet_fp16` file alone would not
fix the old request.

The manifest describes an 88,152,708-byte model in 22 content-addressed chunks:
21 × 4,194,304 bytes, then 72,324 bytes. The old loader calls `response.blob()`
without checking HTTP status, response MIME, redirects or chunk hashes. Its
error reports the logical model key even when a hashed chunk URL fails.
Consequently a small error/challenge body becomes a model size mismatch.
The 7,244-byte body is not the model's intended size or its final chunk.

Read-only HTTP investigation on 2026-11-07 found:

- Manifest with a browser User-Agent: HTTP 200, application/json,
  Content-Length 22,759, valid resource metadata, no redirect.
- First four FP16 chunk URLs with that User-Agent: HTTP 200, each
  Content-Length and actual body 4,194,304 bytes, binary bodies, no redirect.
  Content-Type was absent. Responses came through Cloudflare with
  `cf-cache-status: HIT`, CORS `*`, and `Cache-Control: max-age=14400`.
- The same manifest and first chunk with Python's default User-Agent:
  HTTP 403, text/plain, Content-Length and body 17 bytes, `error code: 1010`,
  Cloudflare headers and private/no-store caching.

**The exact historical 7,244-byte response was not reproduced or available as
a HAR.** Its HTTP status, MIME, response headers and body cannot be honestly
asserted from the exception alone. A Cloudflare challenge/error response is
consistent with the evidence, but that particular body's identity remains
unconfirmed. What is established is the external, policy-sensitive delivery
path and the library's failure to distinguish non-model responses. There is
no evidence of a SavDown/Vercel serverless truncation at 7,244 bytes.

## Selection and licensing

The existing model can be repaired by self-hosting the correct assets; no
model replacement or paid inference is necessary. The chosen model remains
**IS-Net general-use FP16**, identical to the original FP16 resource.
The immutable publisher artifact and all chunk hashes are pinned in
`src/lib/background-removal/assets.json`.

| Option | Quality and size | Licence / integration | Decision |
| --- | --- | --- | --- |
| Existing IMG.LY 1.7.0 wrapper + FP16 | Existing model, 88,152,708 bytes | Wrapper AGPL-3.0; commercial use is allowed with its copyleft obligations, or a separate commercial arrangement | Repairable, but would retain AGPL integration obligations and require fixes for retries, cached rejected initialization and original alpha preservation |
| Direct ONNX Runtime 1.21.0 + same FP16 | Same model and 1024-square inference; no quantization change | Runtime MIT; publisher declares ONNX weights MIT | Selected; independent browser integration, no commercial wrapper licence or inference service needed |
| ISNet quint8 | 44,348,940 bytes in the original manifest; publisher warns of possible quantization artifacts | Same browser WASM delivery approach; separately verify that exact artifact's licence before switching | Not selected; preserve existing model quality |

Publisher model licence: https://huggingface.co/imgly/isnet-general-onnx
Runtime licence: https://github.com/microsoft/onnxruntime/blob/v1.21.0/LICENSE
Research code licence (separate from converted weights):
https://github.com/xuebinqin/DIS/blob/main/LICENSE.md

The declared MIT model and MIT runtime permit commercial use, modification
and redistribution with notices retained. Notices and the separate upstream
Apache-2.0 research licence are included under the static asset directory.
This conclusion relies on the publisher's licence declaration for the exact
ONNX model; it does not infer weight permissions from a Python package's
licence or the DIS5K dataset terms. The dataset is not redistributed.

## Delivery and operation

- `predev` and `prebuild` run `scripts/prepare-background-removal.mjs`.
  It downloads the pinned Hugging Face revision **at build time only**,
  retries failures, verifies the full SHA-256 and exact size, verifies and
  writes the 22 chunks, and copies two checked CPU runtime files from the
  pinned npm runtime. Existing verified local assets are reused.
- Failed or incomplete preparation stops the build. No placeholder assets
  or successful mock responses are emitted. Generated binaries are ignored
  by Git and are regenerated for a clean Vercel build. Use `npm run build`
  (the existing Vercel command already does); a direct `next build` bypasses
  npm's prebuild hook.
- Assets are Next.js public static files under
  `/background-removal/isnet-fp16-v1/`, served by the existing Vercel static
  delivery infrastructure, without a Function proxy or tracing inclusion.
  Binary, WASM and JS MIME headers are explicit; the path is versioned and
  immutable. Filenames have extensions, so existing middleware excludes them.
  Future changes to model/runtime bytes must use a new asset directory and
  browser-cache version.
- Model: **88,152,708 bytes** (~84.1 MiB). WASM: **12,666,427 bytes**;
  runtime module: **26,583 bytes**. Total model/runtime assets:
  **100,845,718 bytes** (~100.85 MB / 96.17 MiB), plus the worker and application
  JS. Each model file is at most 4 MiB; largest runtime file is ~12.7 MB.
- The worker accepts only HTTP 200, rejects redirects and HTML/JSON error
  bodies, bounds bytes read, verifies exact size and SHA-256 before use/cache,
  and verifies the assembled model. It retries an asset once with cache reload.
  Per-asset idle timeouts and a five-minute worker deadline permit recovery.
- Verified chunks/runtime use a dedicated browser Cache API cache when
  available, plus immutable HTTP caching. Unavailable/quota-limited persistent
  storage falls back to the network. A valid loaded session is reused for
  additional images. Cancellation/failure destroys the worker; retry uses
  verified cached assets. The service worker preserves the model cache.
- Progress reflects bytes actually read from network/cache. Session creation,
  runtime loading, inference and PNG encoding are indeterminate; completing
  model bytes does not claim the inference session is ready.
- File selection/drag-drop, original preview, checkerboard result preview,
  transparent PNG download, retry, cancel and another image are supported.
  Separate object URL lifetimes fix the prior original-preview revocation
  when the result changed. Output keeps original dimensions and multiplies
  the model mask by the original alpha.
- Inference runs in a dedicated browser worker using CPU WASM, single-threaded
  so COOP/COEP/SharedArrayBuffer and WebGPU are unnecessary. No GPU-specific
  failure path exists. Preprocessing/PNG composition run in the browser UI
  thread. The model session is reported ready only after real initialization.
- The component no longer calls sign-in, credit or completion endpoints.
  The old credit-only API route is removed; other tools retain their existing
  billing behaviour. Image bytes never leave the browser in this implementation.
  No processing API, provider account, subscription or per-image charge exists.
  Existing hosting bandwidth/storage quotas still apply; this does not promise
  unlimited CDN bandwidth outside the current hosting plan.

## Limits and remaining verification

Current secure desktop/mobile browsers need dedicated Workers, WASM SIMD,
Web Crypto, canvas and image decoding. Cache API is optional. WASM execution
and the 1024-square network can consume several hundred MB or more; low-memory
mobile devices may terminate the worker. CPU processing can be slow. Inputs
retain the existing 10 MiB file limit and additionally reject more than
16 million pixels or a side over 8192 pixels to bound canvas memory; this is
a device-safety limit, not a usage quota. Hair/fine details and complex
backgrounds remain model-dependent and require visual assessment. A model
mask is upscaled to original dimensions; it cannot recover absent fine detail.

Performed: implementation and diff review; read-only upstream HTTP diagnosis;
asset preparation downloaded the genuine pinned model, checked its complete
size/full SHA-256 and every chunk hash, and prepared the checked runtime.
No local tests, typecheck, app build, local browser session or inference were
run, per the task's instruction. Nothing was committed, pushed or deployed.

Deployment development verification remains required (unchecked means pending):

- [ ] Clean Vercel build includes all 22 model chunks and both runtime assets.
- [ ] Deployed headers/MIME and actual response sizes match the manifest;
      no auth/maintenance/error HTML is returned as a model/runtime asset.
- [ ] Fresh browser fully loads the real model and creates the WASM session.
- [ ] Portraits, people/hair, complex backgrounds, objects and already
      transparent images produce real, visually acceptable transparent PNGs.
- [ ] Original/result previews, dimensions, alpha and PNG downloads work.
- [ ] Multiple images reuse the session; reload reuses persistent cached assets.
- [ ] Disconnect, incomplete/corrupt download, unavailable cache, cancellation,
      retry, worker crash and timeout recover without a stuck page.
- [ ] Current Chrome/Edge, Firefox, Safari, iOS and Android work within the
      documented memory/image limits; measure actual inference time/memory.
- [ ] Browser Network panel shows no image upload or paid inference request.
- [ ] Existing SavDown tools and service-worker behaviour remain intact.

## Files changed

Modified: `.gitignore`, `next.config.js`, `package.json`, `package-lock.json`,
`public/sw.js`, `src/components/tools/BackgroundRemoverTool.tsx`.

Added: `scripts/prepare-background-removal.mjs`,
`src/lib/background-removal/{assets.json,client.ts,worker.ts}`,
`src/types/onnxruntime-web.d.ts`, this report, and
`public/background-removal/isnet-fp16-v1/{NOTICE.md,DIS-APACHE-2.0.txt,ONNX-RUNTIME-MIT.txt}`.
Generated/ignored: 22 `.bin` chunks and the CPU `.mjs`/`.wasm` files.

Removed: `src/types/imgly-background-removal.d.ts` and
`src/app/api/tools/image/background-remover/route.ts` (credit-only route).
