// Deterministic Sun position from lunar local time and latitude. Pure functions.
// Simplification: the Sun stays on the lunar equator plane (the real tilt of 1.54° is ignored).

import type { GameState, TimeConfig } from './types';

export const LUNAR_HOURS_PER_CYCLE = 24;

const DEG = Math.PI / 180;

export interface SunState {
  /** Lunar local hour, 0-24. 12 = noon, 6 = sunrise, 18 = sunset. */
  localHour: number;
  /** Cosine of the angle between the Sun and the vertical. <= 0 means the Sun is below the horizon. */
  cosIncidence: number;
  /** Angle between the Sun and the vertical, in degrees (90 = on the horizon). */
  incidenceDeg: number;
  isDay: boolean;
}

export function localHourOf(state: GameState, time: TimeConfig): number {
  const h = (time.startLocalHour + state.elapsedLunarHours) % LUNAR_HOURS_PER_CYCLE;
  return h < 0 ? h + LUNAR_HOURS_PER_CYCLE : h;
}

export function sunAt(localHour: number, latitudeDeg: number): SunState {
  const hourAngle = (localHour - 12) * 15 * DEG;
  const cosIncidence = Math.cos(latitudeDeg * DEG) * Math.cos(hourAngle);
  const clamped = Math.max(-1, Math.min(1, cosIncidence));
  return {
    localHour,
    cosIncidence,
    incidenceDeg: Math.acos(clamped) / DEG,
    isDay: cosIncidence > 0,
  };
}
