import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/redis', () => ({ getRedis: () => null }));

import { mapConditionId, fetchWeatherCondition } from './provider';

describe('mapConditionId', () => {
  it.each([
    [211, 'storm', 'moderate'],
    [301, 'rain', 'light'],
    [500, 'rain', 'light'],
    [502, 'rain', 'moderate'],
    [600, 'snow', 'light'],
    [622, 'snow', 'moderate'],
    [741, 'cloudy', 'light'],
    [800, 'clear', 'light'],
    [801, 'cloudy', 'light'],
    [804, 'cloudy', 'moderate'],
  ] as const)('maps condition id %i to %s/%s', (id, condition, intensity) => {
    expect(mapConditionId(id)).toEqual({ condition, intensity });
  });

  it('never returns a "heavy" intensity', () => {
    for (let id = 200; id < 900; id++) {
      expect(['light', 'moderate']).toContain(mapConditionId(id).intensity);
    }
  });
});

describe('fetchWeatherCondition', () => {
  beforeEach(() => {
    delete process.env.OPENWEATHER_API_KEY;
  });

  it('returns null with no API key configured, without making a network call', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    const result = await fetchWeatherCondition('US');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('returns null for an unmapped country code, without making a network call', async () => {
    process.env.OPENWEATHER_API_KEY = 'test-key';
    const fetchSpy = vi.spyOn(global, 'fetch');

    const result = await fetchWeatherCondition('ZZ');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
