// Light on the solar panels and radiation on the astronaut. Pure functions.
//
// Light: polar zones (continuousLight) have the Sun skimming the horizon almost all the time,
// with ~4 days of darkness per ~200 of light (Kessler et al. 2022). We give them one eclipse per
// mission. Other zones follow the Sun model (12 h day / 12 h night per lunar cycle).
//
// Radiation: surface dose equivalent measured by Chang'E 4 (Zhang et al. 2020). The hull lets
// through a fraction of it (playtest value until we have a source).

import { sunlightFactor } from './processes';
import { LUNAR_HOURS_PER_CYCLE, type SunState } from './sun';
import type { GameState, ScenarioConfig } from './types';

/** Lunar hours per Earth day. */
function hoursPerEarthDay(config: ScenarioConfig): number {
  return LUNAR_HOURS_PER_CYCLE / config.dayNightCycleLengthDays.value;
}

/** The polar eclipse is under way (only in continuous-light zones). */
export function inEclipse(state: GameState, config: ScenarioConfig): boolean {
  if (!config.zones[state.zoneId].continuousLight) return false;
  const k = hoursPerEarthDay(config);
  const start = state.eclipseStartDay * k;
  const end = start + config.polarEclipseDays.value * k;
  return state.elapsedLunarHours >= start && state.elapsedLunarHours < end;
}

/** 0-1 sunlight on the solar panels right now. */
export function panelSunlight(state: GameState, config: ScenarioConfig, sun: SunState): number {
  if (config.zones[state.zoneId].continuousLight) return inEclipse(state, config) ? 0 : 1;
  return sunlightFactor(sun);
}

/** mSv the astronaut receives per lunar hour, inside or outside the hull. */
export function radiationPerHour(config: ScenarioConfig, inside: boolean): number {
  const microSvPerEarthDay = config.surfaceRadiationDose.value;
  const mSvPerLunarHour = microSvPerEarthDay / 1000 / hoursPerEarthDay(config);
  return mSvPerLunarHour * (inside ? config.hullRadiationFactor : 1);
}
