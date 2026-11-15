// Conversions between game time (lunar hours) and Earth time. Pure functions.
// 24 lunar hours = one lunar cycle = config.dayNightCycleLengthDays Earth days.

import { LUNAR_HOURS_PER_CYCLE } from './sun';
import type { GameState, ScenarioConfig } from './types';

/** Earth days since landing. */
export function missionDay(state: GameState, config: ScenarioConfig): number {
  return (state.elapsedLunarHours * config.dayNightCycleLengthDays.value) / LUNAR_HOURS_PER_CYCLE;
}

/** Lunar hours that last this many Earth hours (1 Earth hour ≈ 0.034 lunar hours ≈ 2 real seconds at ×1). */
export function earthHoursToLunar(config: ScenarioConfig, earthHours: number): number {
  return earthHours / config.dayNightCycleLengthDays.value;
}
