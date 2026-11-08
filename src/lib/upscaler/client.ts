import type { UpscaleFactor } from './config';
export type UpscaleProgress = { stage: string; percent: number | null };
export type UpscaleResult = { blob: Blob; width: number; height: number };

export class UpscalerClient {
  private worker: Worker | null = null;
  private pending: { resolve: (result: UpscaleResult) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>; progress: (value: UpscaleProgress) => void } | null = null;

  dispose(message = 'AI processing was cancelled. Please retry.') {
    this.worker?.terminate(); this.worker = null;
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(new Error(message)); this.pending = null; }
  }

  upscale(file: File, scale: UpscaleFactor, progress: (value: UpscaleProgress) => void): Promise<UpscaleResult> {
    if (this.pending) return Promise.reject(new Error('An image is already processing.'));
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined' || !globalThis.crypto?.subtle || !globalThis.WebAssembly) return Promise.reject(new Error('Use a current Chrome, Edge, Firefox, or Safari browser over HTTPS for browser AI processing.'));
    if (!this.worker) {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        const pending = this.pending;
        if (!pending) return;
        if (data.type === 'progress') {
          clearTimeout(pending.timer);
          pending.timer = setTimeout(() => this.dispose('AI processing stopped responding. Try a smaller image.'), 120_000);
          pending.progress(data);
        } else if (data.type === 'error') this.dispose(data.message);
        else if (data.type === 'result') { clearTimeout(pending.timer); this.pending = null; pending.resolve(data); }
      };
      this.worker.onerror = () => this.dispose('The AI worker stopped. Try a smaller image or a current browser.');
      this.worker.onmessageerror = () => this.dispose('Could not read the AI result. Please retry.');
    }
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject, progress, timer: setTimeout(() => this.dispose('AI loading timed out. Check your connection and retry.'), 120_000) };
      this.worker!.postMessage({ file, scale });
    });
  }
}
