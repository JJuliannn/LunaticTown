// Storm shelter: a hole dug in the regolith. The only place where a solar storm is always survivable.

import type { ActionResult } from './actions';
import type { GameState, ResourceId, ScenarioConfig } from './types';

/** Why the shelter cannot be built now, or null. */
export function shelterBlocker(state: GameState, config: ScenarioConfig): string | null {
  if (state.shelterBuilt) return 'Ya está construido';
  if (!state.shipUnpacked) return 'Primero desarma la nave';
  const lacking = (Object.entries(config.events.shelter.cost) as [ResourceId, number][]).find(
    ([res, amount]) => state.resources[res] < amount,
  );
  return lacking ? 'Faltan materiales' : null;
}

export function buildShelter(state: GameState, config: ScenarioConfig): ActionResult {
  const blocker = shelterBlocker(state, config);
  if (blocker) return { state, ok: false, messageEs: `${blocker}.` };
  const resources = { ...state.resources };
  for (const [res, amount] of Object.entries(config.events.shelter.cost) as [ResourceId, number][]) resources[res] -= amount;
  return {
    state: { ...state, resources, shelterBuilt: true },
    ok: true,
    messageEs: `Construido: ${config.events.shelter.nameEs}.`,
  };
}
