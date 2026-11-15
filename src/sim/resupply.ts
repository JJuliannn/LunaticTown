// Supply ships. Pure functions.
// Every N mission days a smaller ship lands with minerals, substrate and seeds. Like the first
// ship, nothing reaches the base until the astronaut walks to it and dismantles it (titanium).

import type { ActionResult } from './actions';
import type { GameState, ResourceId, ScenarioConfig } from './types';
import { missionDay } from './victory';

/** Supply ships that have landed so far. */
export function suppliesLanded(state: GameState, config: ScenarioConfig): number {
  return Math.floor(missionDay(state, config) / config.resupply.intervalDays);
}

/** Landed ships still waiting to be dismantled. */
export function pendingSupplies(state: GameState, config: ScenarioConfig): number {
  return Math.max(0, suppliesLanded(state, config) - state.resuppliesUnpacked);
}

/** Mission day the next ship lands. */
export function nextSupplyDay(state: GameState, config: ScenarioConfig): number {
  return (suppliesLanded(state, config) + 1) * config.resupply.intervalDays;
}

export function unpackSupply(state: GameState, config: ScenarioConfig): ActionResult {
  if (pendingSupplies(state, config) === 0) {
    return { state, ok: false, messageEs: `La próxima nave de suministros llega el día ${nextSupplyDay(state, config)}.` };
  }
  const resources = { ...state.resources };
  for (const [res, amount] of Object.entries(config.resupply.contents) as [ResourceId, number][]) resources[res] += amount;
  return {
    state: { ...state, resources, resuppliesUnpacked: state.resuppliesUnpacked + 1 },
    ok: true,
    messageEs: 'Nave de suministros desarmada.',
  };
}
