declare module 'heic-decode' {
  export type DecodedHeicImage = {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  };

  export default function decode(options: { buffer: Buffer | Uint8Array }): Promise<DecodedHeicImage>;
}
