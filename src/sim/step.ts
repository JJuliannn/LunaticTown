import { LUNAR_HOURS_PER_CYCLE } from './sun';
import type { GameState, ScenarioConfig } from './types';

/**
 * Advances the simulation. Pure: returns a new state.
 * For now only the clock moves; resource processes and crew consumption plug in here.
 */
export function step(state: GameState, config: ScenarioConfig, dtRealSeconds: number): GameState {
  const lunarHoursPerRealSecond = LUNAR_HOURS_PER_CYCLE / (config.time.realMinutesPerLunarCycle * 60);
  return {
    ...state,
    elapsedLunarHours: state.elapsedLunarHours + dtRealSeconds * lunarHoursPerRealSecond,
  };
}
