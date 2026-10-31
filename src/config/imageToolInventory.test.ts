import { describe, expect, it } from 'vitest';
import { catalog, isToolAvailable } from './catalog';

describe('image tool registry inventory', () => {
  it('keeps every configured image tool connected to a live implementation', () => {
    const imageSlugs = catalog.filter((tool) => tool.group === 'Image').map((tool) => tool.slug);
    expect(imageSlugs).toEqual([
      'background-remover',
      'image-upscaler',
      'image-enhancer',
      'image-compressor',
      'image-resizer',
      'image-converter',
      'jpg-to-png',
      'png-to-jpg',
      'webp-converter',
      'heic-to-jpg',
    ]);
    expect(imageSlugs.every(isToolAvailable)).toBe(true);
  });
});
