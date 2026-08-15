'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { WeatherCondition, WeatherIntensity } from '@/lib/weather/provider';

type WeatherState = {
  condition: WeatherCondition | null;
  intensity: WeatherIntensity | null;
  /** True once a real (non-null) condition has been resolved — drives both
   *  the decorative effect and whether the OpenWeather attribution shows. */
  active: boolean;
};

const IDLE_STATE: WeatherState = { condition: null, intensity: null, active: false };
const WeatherContext = createContext<WeatherState>(IDLE_STATE);

const SESSION_KEY = 'sd_weather_v1';
const CLIENT_TTL_MS = 30 * 60 * 1000;

type CachedPayload = { condition: WeatherCondition | null; intensity: WeatherIntensity | null; ts: number };

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WeatherState>(IDLE_STATE);

  // Fetched at most once per session (sessionStorage-cached) — never during
  // SSR, never on every page load/navigation within the same tab.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachedPayload;
        if (Date.now() - cached.ts < CLIENT_TTL_MS) {
          setState({ condition: cached.condition, intensity: cached.intensity, active: cached.condition !== null });
          return;
        }
      }
    } catch {
      // corrupt/unavailable sessionStorage: just fetch fresh below
    }

    fetch('/api/weather')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const condition = (json?.data?.condition ?? null) as WeatherCondition | null;
        const intensity = (json?.data?.intensity ?? null) as WeatherIntensity | null;
        setState({ condition, intensity, active: condition !== null });
        try {
          const payload: CachedPayload = { condition, intensity, ts: Date.now() };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
        } catch {
          // not fatal — just re-fetches next mount
        }
      })
      .catch(() => setState(IDLE_STATE));
  }, []);

  return <WeatherContext.Provider value={state}>{children}</WeatherContext.Provider>;
}

export function useWeather() {
  return useContext(WeatherContext);
}
