// Machines: each lunar hour every built machine turns inputs into outputs. Pure functions.

import { zeroPerBuilding } from './state';
import type { SunState } from './sun';
import {
  BUILDING_IDS,
  type BuildingId,
  type GameState,
  type ResourceAmounts,
  type ResourceId,
  type Resources,
  type ScenarioConfig,
} from './types';

/** Panels track the Sun, so they give full power whenever it is above the horizon (short fade at the terminators). */
export function sunlightFactor(sun: SunState): number {
  return Math.max(0, Math.min(1, sun.cosIncidence / 0.05));
}

export function energyCapacity(state: GameState, config: ScenarioConfig): number {
  return BUILDING_IDS.reduce(
    (cap, id) => cap + state.buildings[id] * config.buildings[id].batteryCapacity,
    config.hullBatteryCapacity,
  );
}

function entries(amounts: ResourceAmounts): [ResourceId, number][] {
  return Object.entries(amounts) as [ResourceId, number][];
}

/** Runs all machines for dtHours. Returns new resources and how active each machine type was. */
export function runBuildings(
  state: GameState,
  config: ScenarioConfig,
  sun: SunState,
  dtHours: number,
): { resources: Resources; activity: Record<BuildingId, number> } {
  const resources = { ...state.resources };
  const activity = zeroPerBuilding();
  const zone = config.zones[state.zoneId];

  for (const id of BUILDING_IDS) {
    const count = state.buildings[id];
    if (count === 0) continue;
    const def = config.buildings[id];

    let scale = 1;
    if (def.needsIce && !zone.hasIce) scale = 0;
    if (def.needsSunlight) scale *= sunlightFactor(sun);
    // A machine slows down to whatever its scarcest input allows.
    for (const [res, perHour] of entries(def.inputsPerHour)) {
      const needed = perHour * count * dtHours;
      if (needed > 0) scale = Math.min(scale, resources[res] / needed);
    }
    scale = Math.max(0, scale);

    for (const [res, perHour] of entries(def.inputsPerHour)) {
      resources[res] = Math.max(0, resources[res] - perHour * count * dtHours * scale);
    }
    for (const [res, perHour] of entries(def.outputsPerHour)) {
      resources[res] += perHour * count * dtHours * scale;
    }
    activity[id] = scale;
  }

  resources.energy = Math.min(resources.energy, energyCapacity(state, config));
  return { resources, activity };
}
