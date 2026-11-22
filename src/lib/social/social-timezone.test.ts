import { describe, expect, it } from 'vitest';
import {
  addDaysToDateKey,
  dateKeyInTimeZone,
  monthGrid,
  utcToZonedInputValue,
  weekdayOfDateKey,
  weekKeysForDateKey,
  zonedDateTimeToUtc,
} from './timezone';

describe('social timezone helpers', () => {
  it('formats instants in the configured zone', () => {
    const instant = new Date('2026-11-22T07:00:00.000Z');
    expect(dateKeyInTimeZone(instant, 'Asia/Karachi')).toBe('2026-11-22');
    expect(utcToZonedInputValue(instant, 'Asia/Karachi')).toBe('2026-11-22T12:00');
    expect(dateKeyInTimeZone(instant, 'America/New_York')).toBe('2026-11-22');
  });

  it('converts wall-clock time in a zone to the correct UTC instant', () => {
    expect(zonedDateTimeToUtc('2026-11-22T12:00', 'Asia/Karachi').toISOString()).toBe('2026-11-22T07:00:00.000Z');
    expect(zonedDateTimeToUtc('2026-07-01T12:00', 'America/New_York').toISOString()).toBe('2026-07-01T16:00:00.000Z');
    expect(zonedDateTimeToUtc('2026-01-15T12:00', 'America/New_York').toISOString()).toBe('2026-01-15T17:00:00.000Z');
  });

  it('round-trips a UTC instant through the input representation', () => {
    const instant = new Date('2026-03-08T09:30:00.000Z');
    const value = utcToZonedInputValue(instant, 'Asia/Karachi');
    expect(zonedDateTimeToUtc(value, 'Asia/Karachi').toISOString()).toBe(instant.toISOString());
  });

  it('builds a six-week Sunday-first month grid', () => {
    const grid = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(grid).toHaveLength(42);
    expect(grid[0].key).toBe('2026-11-01');
    expect(grid[41].key).toBe('2026-12-12');
    expect(grid.filter((day) => day.inMonth)).toHaveLength(30);
  });

  it('computes week buckets and day arithmetic from date keys', () => {
    expect(weekdayOfDateKey('2026-11-22')).toBe(0);
    expect(weekKeysForDateKey('2026-11-22')[0]).toBe('2026-11-22');
    expect(addDaysToDateKey('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28');
  });
});
