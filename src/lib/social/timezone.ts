export const DEFAULT_TIMEZONE = 'Asia/Karachi';

const keyFormatters = new Map<string, Intl.DateTimeFormat>();

function keyFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = keyFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    keyFormatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function partsToRecord(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') record[part.type] = part.value;
  }
  return record;
}

/** `YYYY-MM-DD` for the given instant in the target zone. */
export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = partsToRecord(keyFormatter(timeZone).formatToParts(date));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function timeInTimeZone(date: Date, timeZone: string): string {
  const parts = partsToRecord(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(date),
  );
  return `${parts.hour}:${parts.minute}`;
}

export function formatDateTimeInTimeZone(
  value: Date | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(date);
}

/** Offset of `timeZone` at the given UTC instant, in milliseconds. */
export function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = partsToRecord(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(utcMs)),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - utcMs;
}

/**
 * Convert a wall-clock `YYYY-MM-DDTHH:mm` in `timeZone` to a UTC Date.
 * Iterates twice so DST transitions resolve to the correct instant.
 */
export function zonedDateTimeToUtc(local: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) throw new Error('Expected a local date-time in YYYY-MM-DDTHH:mm format.');
  const [, year, month, day, hour, minute] = match.map(Number);
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  for (let pass = 0; pass < 2; pass += 1) {
    const offset = timeZoneOffsetMs(utc, timeZone);
    utc = Date.UTC(year, month - 1, day, hour, minute, 0, 0) - offset;
  }
  return new Date(utc);
}

/** Value for an `<input type="datetime-local">` showing the zoned wall clock. */
export function utcToZonedInputValue(value: Date | string, timeZone: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${dateKeyInTimeZone(date, timeZone)}T${timeInTimeZone(date, timeZone)}`;
}

export function addDaysToDateKey(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a bare date key (timezone-independent). */
export function weekdayOfDateKey(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function monthLabel(year: number, monthIndex: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  );
}

export type GridDay = { key: string; day: number; inMonth: boolean };

/** Six-week grid starting on Sunday, covering `monthIndex` (0-based). */
export function monthGrid(year: number, monthIndex: number): GridDay[] {
  const firstKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const leading = weekdayOfDateKey(firstKey);
  const startKey = addDaysToDateKey(firstKey, -leading);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const days: GridDay[] = [];
  for (let index = 0; index < 42; index += 1) {
    const key = addDaysToDateKey(startKey, index);
    const day = Number(key.slice(8, 10));
    const inMonth = key.slice(0, 7) === firstKey.slice(0, 7);
    days.push({ key, day, inMonth: inMonth && day <= daysInMonth });
  }
  return days;
}

export function weekKeysForDateKey(key: string): string[] {
  const start = addDaysToDateKey(key, -weekdayOfDateKey(key));
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(start, index));
}
