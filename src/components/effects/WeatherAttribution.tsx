'use client';

import { useWeather } from '@/contexts/WeatherContext';

/**
 * OpenWeather's required attribution for use of their data. Shown only
 * while a live/cached weather reading is actually in use — an always-on
 * badge would be misleading whenever the API key is unset or effects are
 * otherwise disabled.
 */
export function WeatherAttribution() {
  const { active } = useWeather();
  if (!active) return null;

  return (
    <a
      href="https://openweathermap.org"
      target="_blank"
      rel="noopener noreferrer"
      className="text-ink-subtle hover:text-white transition-colors"
    >
      Weather data provided by OpenWeather
    </a>
  );
}
