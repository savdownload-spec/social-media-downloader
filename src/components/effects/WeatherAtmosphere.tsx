'use client';

import { useEffect, useState } from 'react';
import { useWeather } from '@/contexts/WeatherContext';

/**
 * Very subtle decorative layer only — never a focal element. All motion is
 * pure CSS keyframe animation (see globals.css [data-weather="..."] rules);
 * no canvas, no per-frame JS. Renders nothing until a real condition is
 * resolved, and nothing at all if weather is unavailable/disabled.
 *
 * Mounted once near the app root inside the existing PublicShell block
 * (src/components/layout/PublicShell.tsx), so it inherits that component's
 * `/admin` exclusion for free — no separate admin-detection logic needed.
 */
export function WeatherAtmosphere() {
  const { condition, intensity, active } = useWeather();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const handleVisibility = () => setPaused(document.hidden);
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (!active || !condition) return null;

  return (
    <div
      aria-hidden="true"
      data-weather={condition}
      data-weather-intensity={intensity ?? 'light'}
      className={`weather-atmosphere fixed inset-0 pointer-events-none z-[1]${paused ? ' weather-paused' : ''}`}
    />
  );
}
