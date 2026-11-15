// Player actions and mission phases. Pure functions.

import { BUILDING_IDS, type BuildingId, type GameState, type ResourceAmounts, type ResourceId, type ScenarioConfig } from './types';

export type Phase = 1 | 2 | 3 | 4;

export const PHASE_NAMES_ES: Record<Phase, string> = {
  1: 'Llegada',
  2: 'Armar lo esencial',
  3: 'Armar lo necesario',
  4: 'Mantenimiento y mejoras',
};

/** Machine types that count for finishing a phase in this zone (the ice extractor is useless without ice). */
function requiredFor(phase: 2 | 3, state: GameState, config: ScenarioConfig): BuildingId[] {
  const hasIce = config.zones[state.zoneId].hasIce;
  return BUILDING_IDS.filter((id) => {
    const def = config.buildings[id];
    return def.phase === phase && (!def.needsIce || hasIce);
  });
}

export function currentPhase(state: GameState, config: ScenarioConfig): Phase {
  if (!state.shipUnpacked) return 1;
  const done = (phase: 2 | 3) => requiredFor(phase, state, config).every((id) => state.buildings[id] > 0);
  if (!done(2)) return 2;
  if (!done(3)) return 3;
  return 4;
}

/** Machine types still missing to finish the current phase. */
export function missingForPhase(state: GameState, config: ScenarioConfig): BuildingId[] {
  const phase = currentPhase(state, config);
  if (phase !== 2 && phase !== 3) return [];
  return requiredFor(phase, state, config).filter((id) => state.buildings[id] === 0);
}

export interface ActionResult {
  state: GameState;
  ok: boolean;
  /** Message for the player, in Spanish. */
  messageEs: string;
}

/** Phase 1: dismantle the ship. Its hull becomes the base and the rest becomes building material. */
export function unpackShip(state: GameState, config: ScenarioConfig): ActionResult {
  if (state.shipUnpacked) return { state, ok: false, messageEs: 'La nave ya está desarmada.' };
  const resources = { ...state.resources };
  for (const [res, amount] of Object.entries(config.shipSalvage) as [ResourceId, number][]) {
    resources[res] += amount;
  }
  return {
    state: { ...state, shipUnpacked: true, resources },
    ok: true,
    messageEs: 'Nave desarmada: el casco es ahora la base.',
  };
}

function missingCost(state: GameState, cost: ResourceAmounts): ResourceId[] {
  return (Object.entries(cost) as [ResourceId, number][])
    .filter(([res, amount]) => state.resources[res] < amount)
    .map(([res]) => res);
}

/** Why a machine cannot be built right now, in Spanish, or null if it can. */
export function buildBlockerEs(state: GameState, config: ScenarioConfig, id: BuildingId): string | null {
  const def = config.buildings[id];
  if (state.status !== 'playing') return 'La misión terminó.';
  if (currentPhase(state, config) < def.phase) return `Se desbloquea en la fase ${def.phase}.`;
  if (state.buildings[id] >= def.maxCount) return 'Máximo alcanzado.';
  if (def.needsIce && !config.zones[state.zoneId].hasIce) return 'En esta zona no hay hielo.';
  if (missingCost(state, def.cost).length > 0) return 'Faltan materiales.';
  return null;
}

export function build(state: GameState, config: ScenarioConfig, id: BuildingId): ActionResult {
  const blocker = buildBlockerEs(state, config, id);
  if (blocker) return { state, ok: false, messageEs: blocker };
  const def = config.buildings[id];
  const resources = { ...state.resources };
  for (const [res, amount] of Object.entries(def.cost) as [ResourceId, number][]) {
    resources[res] -= amount;
  }
  return {
    state: { ...state, resources, buildings: { ...state.buildings, [id]: state.buildings[id] + 1 } },
    ok: true,
    messageEs: `Construido: ${def.nameEs}.`,
  };
}
