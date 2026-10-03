declare module '@imgly/background-removal' {
  export interface Config {
    publicPath?: string;
    progress?: (key: string, current: number, total: number) => void;
    model?: 'small' | 'medium';
    output?: {
      format?: 'image/png' | 'image/jpeg' | 'image/webp';
      quality?: number;
    };
  }
  export function removeBackground(image: ImageData | string | URL | File | Blob, config?: Config): Promise<Blob>;
}
