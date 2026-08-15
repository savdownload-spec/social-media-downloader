import { describe, it, expect } from 'vitest';
import { themePatchSchema } from './validators';

describe('themePatchSchema', () => {
  it.each(['light', 'dark', 'auto'] as const)('accepts mode=%s', (mode) => {
    expect(themePatchSchema.safeParse({ mode }).success).toBe(true);
  });

  it('rejects an invalid mode', () => {
    expect(themePatchSchema.safeParse({ mode: 'blue' }).success).toBe(false);
  });

  it('rejects a missing mode', () => {
    expect(themePatchSchema.safeParse({}).success).toBe(false);
  });
});
