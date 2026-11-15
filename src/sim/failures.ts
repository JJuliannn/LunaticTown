// Station breakdowns, maintenance and human error. Pure functions.
// Rules decided by the team: 10 % per week per station, more for each week without maintenance;
// 1 % human error when starting a batch, more when the astronaut's bars are low.

import type { ActionResult } from './actions';
import { chance, splitChance, withLog } from './random';
import { missionDay } from './time';
import { BUILDING_IDS, type Astronaut, type BuildingId, type GameState, type ScenarioConfig } from './types';

const DAYS_PER_WEEK = 7;

/** Weekly failure probability of a station right now. */
export function failureChancePerWeek(state: GameState, config: ScenarioConfig, id: BuildingId): number {
  const e = config.events;
  const weeks = Math.floor((missionDay(state, config) - state.stations[id].lastMaintainedDay) / DAYS_PER_WEEK);
  return Math.min(e.stationFailureMaxPerWeek, e.stationFailurePerWeek + e.stationFailureExtraPerWeekUnmaintained * weeks);
}

/** Once per Earth day: each working station may break. */
export function rollFailures(state: GameState, config: ScenarioConfig): GameState {
  let s = state;
  for (const id of BUILDING_IDS) {
    const station = s.stations[id];
    if (!station.built || station.broken) continue;
    const [broke, next] = chance(s, splitChance(failureChancePerWeek(s, config, id), DAYS_PER_WEEK));
    s = next;
    if (broke) {
      s = { ...s, stations: { ...s.stations, [id]: { ...station, broken: true } } };
      s = withLog(s, `Falla: ${config.buildings[id].nameEs} dejó de funcionar. Ve a repararla (E).`, true);
    }
  }
  return s;
}

export function maintainStation(state: GameState, config: ScenarioConfig, id: BuildingId): ActionResult {
  const station = state.stations[id];
  const name = config.buildings[id].nameEs;
  if (!station.built) return { state, ok: false, messageEs: 'Primero hay que construirlo.' };
  if (station.broken) return { state, ok: false, messageEs: `${name} está averiada: repárala con E.` };
  const day = missionDay(state, config);
  return {
    state: { ...state, stations: { ...state.stations, [id]: { ...station, lastMaintainedDay: day } } },
    ok: true,
    messageEs: `Mantenimiento hecho: ${name}.`,
  };
}

export function repairStation(state: GameState, config: ScenarioConfig, id: BuildingId): ActionResult {
  const station = state.stations[id];
  if (!station.broken) return { state, ok: false, messageEs: 'No está averiada.' };
  const day = missionDay(state, config);
  return {
    state: { ...state, stations: { ...state.stations, [id]: { ...station, broken: false, lastMaintainedDay: day } } },
    ok: true,
    messageEs: `Reparada: ${config.buildings[id].nameEs}.`,
  };
}

/** Probability that starting a batch goes wrong: base, plus more for each low bar. */
export function humanErrorChance(config: ScenarioConfig, astronaut: Astronaut): number {
  const e = config.events;
  const low = (['oxygen', 'water', 'food'] as const).reduce(
    (sum, need) => sum + Math.max(0, (e.humanErrorBarThreshold - astronaut[need]) / e.humanErrorBarThreshold),
    0,
  );
  return e.humanErrorBase + e.humanErrorExtraPerBar * low;
}
