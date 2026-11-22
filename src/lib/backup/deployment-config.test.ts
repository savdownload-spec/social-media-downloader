import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

type VercelConfig = {
  crons?: Array<{ path: string; schedule: string }>;
  functions?: Record<string, { maxDuration?: number }>;
};

const config = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../../vercel.json'), 'utf8'),
) as VercelConfig;
const crons = config.crons ?? [];

describe('deployment scheduling configuration', () => {
  it('registers the daily 04:00 UTC backup and an 08:00 UTC retry for the same idempotent route', () => {
    const backupCrons = crons.filter((entry) => entry.path === '/api/admin/backups/auto');
    expect(backupCrons.map((entry) => entry.schedule).sort()).toEqual(['0 4 * * *', '0 8 * * *']);
  });

  it('keeps every cron compatible with the Hobby once-per-day limit', () => {
    for (const entry of crons) {
      const fields = entry.schedule.trim().split(/\s+/);
      expect(fields, `${entry.path} must use a five-field expression`).toHaveLength(5);
      const [, hour] = fields;
      // Hobby rejects any expression that can run more than once per day.
      expect(hour, `${entry.path} runs more than once per day`).not.toMatch(/[*/-]/);
    }
  });

  it('gives backup functions the full Hobby 300-second duration', () => {
    expect(config.functions?.['src/app/api/admin/backups/auto/route.ts']?.maxDuration).toBe(300);
    expect(config.functions?.['src/app/api/admin/backups/route.ts']?.maxDuration).toBe(300);
    expect(config.functions?.['src/app/api/admin/backups/restore/route.ts']?.maxDuration).toBe(300);
  });
});
