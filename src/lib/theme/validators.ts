import { z } from 'zod';

export const themePatchSchema = z.object({
  mode: z.enum(['light', 'dark', 'auto']),
});
