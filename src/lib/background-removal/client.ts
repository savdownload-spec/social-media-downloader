export type ModelProgress = { stage: 'download' | 'initializing' | 'processing'; current?: number; total?: number };

export class BackgroundRemovalClient {
  private worker: Worker | null = null;
  private ready = false;
  private generation = 0;
  private pending: { resolve: (mask?: Float32Array) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  private onProgress: (progress: ModelProgress) => void = () => undefined;

  dispose(message = 'Processing cancelled. You can try again.') {
    this.generation++;
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(new Error(message));
      this.pending = null;
    }
  }

  private request(message: unknown, transfer: Transferable[] = []) {
    return new Promise<Float32Array | undefined>((resolve, reject) => {
      if (!this.worker || this.pending) { reject(new Error('Background remover is busy or unavailable.')); return; }
      const timer = setTimeout(() => this.dispose('Model loading or processing timed out. Please retry.'), 300_000);
      this.pending = { resolve, reject, timer };
      this.worker.postMessage(message, transfer);
    });
  }

  async remove(file: File, onProgress: (progress: ModelProgress) => void): Promise<Blob> {
    if (!window.Worker || !window.WebAssembly || !window.crypto?.subtle) throw new Error('Use a current browser with WebAssembly on a secure HTTPS connection.');
    this.onProgress = onProgress;
    const generation = this.generation;
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    try {
      image.src = imageUrl;
      await image.decode();
      if (generation !== this.generation) throw new Error('Processing cancelled.');
      const width = image.naturalWidth, height = image.naturalHeight;
      if (!width || !height || width * height > 16_000_000 || Math.max(width, height) > 8192) {
        throw new Error('This image is too large for safe browser processing. Resize it to at most 16 megapixels and 8192 pixels per side.');
      }
      if (!this.worker) {
        this.worker = new Worker(new URL('./worker.ts', import.meta.url));
        this.worker.onmessage = ({ data }) => {
          if (data.type === 'download') this.onProgress({ stage: 'download', current: data.current, total: data.total });
          if (data.type === 'initializing') this.onProgress({ stage: 'initializing' });
          if (data.type === 'error') {
            const pending = this.pending;
            this.pending = null;
            if (pending) { clearTimeout(pending.timer); pending.reject(new Error(data.message)); }
            this.dispose();
          }
          if (data.type === 'ready' || data.type === 'result') {
            if (data.type === 'ready') this.ready = true;
            const pending = this.pending;
            this.pending = null;
            if (pending) { clearTimeout(pending.timer); pending.resolve(data.mask); }
          }
        };
        this.worker.onerror = () => this.dispose('The model worker stopped. Try again with a smaller image or a current browser.');
        this.worker.onmessageerror = () => this.dispose('The browser could not read the model result. Please retry.');
      }
      if (!this.ready) {
        onProgress({ stage: 'initializing' });
        await this.request({ type: 'load' });
      }
      onProgress({ stage: 'processing' });
      // Model-specific preprocessing from the publisher's pinned model card:
      // RGB, 1024 square, NCHW, (channel - 128) / 256.
      const scaled = document.createElement('canvas');
      scaled.width = scaled.height = 1024;
      const small = scaled.getContext('2d', { willReadFrequently: true });
      if (!small) throw new Error('Your browser could not allocate an image canvas.');
      small.drawImage(image, 0, 0, 1024, 1024);
      const rgb = small.getImageData(0, 0, 1024, 1024).data;
      const plane = 1024 * 1024;
      const pixels = new Float32Array(plane * 3);
      for (let i = 0; i < plane; i++) for (let channel = 0; channel < 3; channel++) pixels[channel * plane + i] = (rgb[i * 4 + channel] - 128) / 256;
      const mask = await this.request({ type: 'process', pixels }, [pixels.buffer]);
      if (!mask) throw new Error('The model returned no mask. Please retry.');
      const maskImage = small.createImageData(1024, 1024);
      for (let i = 0; i < plane; i++) {
        const alpha = Math.round(Math.max(0, Math.min(1, mask[i])) * 255);
        maskImage.data[i * 4] = maskImage.data[i * 4 + 1] = maskImage.data[i * 4 + 2] = 255;
        maskImage.data[i * 4 + 3] = alpha;
      }
      small.putImageData(maskImage, 0, 0);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not allocate the output canvas.');
      context.drawImage(image, 0, 0);
      // Multiplication preserves the original alpha, including transparent PNGs.
      context.globalCompositeOperation = 'destination-in';
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(scaled, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG encoding failed. Try a smaller image.')), 'image/png'));
      canvas.width = canvas.height = scaled.width = scaled.height = 0;
      return blob;
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }
}
