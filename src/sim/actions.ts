// Player actions and mission phases. Pure functions.
// Every action happens at a place: the UI only calls these when the astronaut is standing there.

import { missionDay } from './time';
import {
  BUILDING_IDS,
  type BuildingId,
  type GameState,
  type ResourceAmounts,
  type ResourceId,
  type Resources,
  type ScenarioConfig,
  type StationState,
} from './types';

export type Phase = 1 | 2 | 3 | 4;

export const PHASE_NAMES_ES: Record<Phase, string> = {
  1: 'Llegada',
  2: 'Armar lo esencial',
  3: 'Armar lo necesario',
  4: 'Mantenimiento y mejoras',
};

/** Stations that count for finishing a phase in this zone (the ice extractor is useless without ice). */
function requiredFor(phase: 2 | 3, state: GameState, config: ScenarioConfig): BuildingId[] {
  const hasIce = config.zones[state.zoneId].hasIce;
  return BUILDING_IDS.filter((id) => {
    const def = config.buildings[id];
    return def.phase === phase && (!def.needsIce || hasIce);
  });
}

export function currentPhase(state: GameState, config: ScenarioConfig): Phase {
  if (!state.shipUnpacked) return 1;
  const done = (phase: 2 | 3) => requiredFor(phase, state, config).every((id) => state.stations[id].built);
  if (!done(2)) return 2;
  if (!done(3)) return 3;
  return 4;
}

/** Stations still missing to finish the current phase. */
export function missingForPhase(state: GameState, config: ScenarioConfig): BuildingId[] {
  const phase = currentPhase(state, config);
  if (phase !== 2 && phase !== 3) return [];
  return requiredFor(phase, state, config).filter((id) => !state.stations[id].built);
}

export interface ActionResult {
  state: GameState;
  ok: boolean;
  /** Message for the player, in Spanish. */
  messageEs: string;
}

const amounts = (a: ResourceAmounts) => Object.entries(a) as [ResourceId, number][];

function firstMissing(resources: Resources, needed: ResourceAmounts): ResourceId | null {
  const lacking = amounts(needed).find(([res, amount]) => resources[res] < amount);
  return lacking ? lacking[0] : null;
}

function withStation(state: GameState, id: BuildingId, station: StationState, resources: Resources): GameState {
  return { ...state, resources, stations: { ...state.stations, [id]: station } };
}

/** Phase 1: dismantle the ship. Its hull becomes the base and the rest becomes building material. */
export function unpackShip(state: GameState, config: ScenarioConfig): ActionResult {
  if (state.shipUnpacked) return { state, ok: false, messageEs: 'La nave ya está desarmada.' };
  const resources = { ...state.resources };
  for (const [res, amount] of amounts(config.shipSalvage)) resources[res] += amount;
  return {
    state: { ...state, shipUnpacked: true, resources },
    ok: true,
    messageEs: 'Nave desarmada: el casco es ahora la base.',
  };
}

/** Why a station cannot be built right now, or null. `missing` names the lacking resource, if any. */
export function buildBlocker(
  state: GameState,
  config: ScenarioConfig,
  id: BuildingId,
): { textEs: string; missing: ResourceId | null } | null {
  const def = config.buildings[id];
  if (currentPhase(state, config) < def.phase) return { textEs: `Se desbloquea en la fase ${def.phase}`, missing: null };
  if (def.needsIce && !config.zones[state.zoneId].hasIce) return { textEs: 'En esta zona no hay hielo', missing: null };
  const missing = firstMissing(state.resources, def.cost);
  if (missing) return { textEs: 'Faltan materiales', missing };
  return null;
}

export function build(state: GameState, config: ScenarioConfig, id: BuildingId): ActionResult {
  const def = config.buildings[id];
  if (state.stations[id].built) return { state, ok: false, messageEs: 'Ya está construido.' };
  const blocker = buildBlocker(state, config, id);
  if (blocker) return { state, ok: false, messageEs: `${blocker.textEs}.` };
  const resources = { ...state.resources };
  for (const [res, amount] of amounts(def.cost)) resources[res] -= amount;
  const day = missionDay(state, config);
  return {
    state: withStation(state, id, { ...state.stations[id], built: true, lastMaintainedDay: day }, resources),
    ok: true,
    messageEs: `Construido: ${def.nameEs}.`,
  };
}

/** Resource missing to start a batch at a processor, or null if it can start. */
export function startBlocker(state: GameState, config: ScenarioConfig, id: BuildingId): ResourceId | null {
  const job = config.buildings[id].job;
  return job ? firstMissing(state.resources, job.inputs) : null;
}

/**
 * The astronaut works at a built station:
 * - collector: takes what it has stored (as much as the base can hold).
 * - processor: collects a finished batch, or starts a new one if it is idle.
 */
export function operate(state: GameState, config: ScenarioConfig, id: BuildingId): ActionResult {
  const def = config.buildings[id];
  const station = state.stations[id];
  if (!station.built) return { state, ok: false, messageEs: 'Primero hay que construirlo.' };
  if (station.broken) return { state, ok: false, messageEs: `${def.nameEs} está averiada: repárala.` };
  const resources = { ...state.resources };

  if (def.kind === 'collector' && def.produces) {
    const room = def.produces === 'energy' ? config.baseBatteryCapacity - resources.energy : Infinity;
    const taken = Math.floor(Math.max(0, Math.min(station.stored, room)));
    if (taken < 1) {
      const why = station.stored < 1 ? 'Todavía no hay nada que recoger.' : 'La batería de la base está llena.';
      return { state, ok: false, messageEs: why };
    }
    resources[def.produces] += taken;
    return {
      state: withStation(state, id, { ...station, stored: station.stored - taken }, resources),
      ok: true,
      messageEs: `Recogido: ${taken} de energía.`,
    };
  }

  const job = def.job;
  if (!job) return { state, ok: false, messageEs: 'Esta estación no hace nada todavía.' };

  if (station.ready) {
    for (const [res, amount] of amounts(job.outputs)) resources[res] += amount;
    return {
      state: withStation(state, id, { ...station, ready: false }, resources),
      ok: true,
      messageEs: `Recogido de ${def.nameEs}.`,
    };
  }
  if (station.hoursLeft !== null) return { state, ok: false, messageEs: 'Todavía está en proceso.' };

  if (firstMissing(resources, job.inputs)) return { state, ok: false, messageEs: 'Faltan insumos para iniciar.' };
  for (const [res, amount] of amounts(job.inputs)) resources[res] -= amount;
  return {
    state: withStation(state, id, { ...station, hoursLeft: job.hours }, resources),
    ok: true,
    messageEs: `${def.nameEs}: proceso iniciado.`,
  };
}
