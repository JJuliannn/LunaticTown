// Stations over time. They never deliver to the base on their own: collectors fill their
// own storage and processors count down their batch. The player collects (see actions.ts).

import type { SunState } from './sun';
import { BUILDING_IDS, type BuildingId, type GameState, type ScenarioConfig, type StationState } from './types';

/** Panels track the Sun, so they give full power whenever it is above the horizon (short fade at the terminators). */
export function sunlightFactor(sun: SunState): number {
  return Math.max(0, Math.min(1, sun.cosIncidence / 0.05));
}

export function runStations(
  state: GameState,
  config: ScenarioConfig,
  sun: SunState,
  dtHours: number,
): Record<BuildingId, StationState> {
  const next = { ...state.stations };
  for (const id of BUILDING_IDS) {
    const station = state.stations[id];
    if (!station.built) continue;
    const def = config.buildings[id];

    if (def.kind === 'collector') {
      const factor = def.needsSunlight ? sunlightFactor(sun) : 1;
      const stored = Math.min(def.storageCapacity, station.stored + def.ratePerHour * factor * dtHours);
      next[id] = { ...station, stored };
    } else if (station.hoursLeft !== null) {
      const hoursLeft = station.hoursLeft - dtHours;
      next[id] = hoursLeft <= 0 ? { ...station, hoursLeft: null, ready: true } : { ...station, hoursLeft };
    }
  }
  return next;
}

export type StationStatus = 'unbuilt' | 'idle' | 'running' | 'ready';

/** A collector counts as ready once it holds at least this fraction of its storage. */
const COLLECTOR_READY_FRACTION = 0.5;

export function stationStatus(state: GameState, config: ScenarioConfig, id: BuildingId): StationStatus {
  const station = state.stations[id];
  const def = config.buildings[id];
  if (!station.built) return 'unbuilt';
  if (def.kind === 'collector') {
    return station.stored >= def.storageCapacity * COLLECTOR_READY_FRACTION ? 'ready' : 'running';
  }
  if (station.ready) return 'ready';
  return station.hoursLeft !== null ? 'running' : 'idle';
}

/** 0-1 progress of the running batch, or fill level of a collector. */
export function stationProgress(state: GameState, config: ScenarioConfig, id: BuildingId): number {
  const station = state.stations[id];
  const def = config.buildings[id];
  if (def.kind === 'collector') return def.storageCapacity > 0 ? station.stored / def.storageCapacity : 0;
  if (station.ready) return 1;
  if (station.hoursLeft === null || !def.job) return 0;
  return 1 - station.hoursLeft / def.job.hours;
}
