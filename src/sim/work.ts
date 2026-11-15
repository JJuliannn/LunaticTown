// Timed work. Every task keeps the astronaut busy for a while (durations in params.json,
// based on EVA and maintenance times from NASA sources). The effect happens when the task ends.
// Finishing a task may injure the astronaut; starting a batch may fail by human error.

import { build, operate, unpackShip, type ActionResult } from './actions';
import { humanErrorChance, maintainStation, repairStation } from './failures';
import { chance, withLog } from './random';
import { unpackSupply } from './resupply';
import { buildShelter } from './shelter';
import { earthHoursToLunar } from './time';
import type { GameState, ResourceId, ScenarioConfig, WorkAction, WorkKind } from './types';
import { buildLab } from './victory';

function kindOf(action: WorkAction): WorkKind {
  switch (action.type) {
    case 'unpackShip':
      return 'unpack_ship';
    case 'unpackSupply':
      return 'unpack_supply';
    case 'build':
      return 'build';
    case 'buildLab':
      return 'build_lab';
    case 'buildShelter':
      return 'build_shelter';
    case 'operate':
      return 'operate';
    case 'maintain':
      return 'maintain';
    case 'repair':
      return 'repair';
  }
}

function labelOf(state: GameState, config: ScenarioConfig, action: WorkAction): string {
  const name = 'id' in action ? config.buildings[action.id].nameEs : '';
  switch (action.type) {
    case 'unpackShip':
      return 'Desarmando la nave';
    case 'unpackSupply':
      return 'Desarmando la nave de suministros';
    case 'build':
      return `Construyendo: ${name}`;
    case 'buildLab':
      return `Construyendo: ${config.victory.lab.nameEs}`;
    case 'buildShelter':
      return `Excavando: ${config.events.shelter.nameEs}`;
    case 'operate': {
      const station = state.stations[action.id];
      if (config.buildings[action.id].kind === 'collector') return 'Recogiendo energía';
      return station.ready ? `Recogiendo: ${name}` : `Iniciando tanda: ${name}`;
    }
    case 'maintain':
      return `Mantenimiento: ${name}`;
    case 'repair':
      return `Reparando: ${name}`;
  }
}

/** True when operating this station now would start a new batch (the moment human error can happen). */
function startsBatch(state: GameState, config: ScenarioConfig, action: WorkAction): boolean {
  if (action.type !== 'operate') return false;
  const station = state.stations[action.id];
  return config.buildings[action.id].kind === 'processor' && !station.ready && station.hoursLeft === null;
}

/** The plain effect of a task, without chance. */
function effect(state: GameState, config: ScenarioConfig, action: WorkAction): ActionResult {
  switch (action.type) {
    case 'unpackShip':
      return unpackShip(state, config);
    case 'unpackSupply':
      return unpackSupply(state, config);
    case 'build':
      return build(state, config, action.id);
    case 'buildLab':
      return buildLab(state, config);
    case 'buildShelter':
      return buildShelter(state, config);
    case 'maintain':
      return maintainStation(state, config, action.id);
    case 'repair':
      return repairStation(state, config, action.id);
    case 'operate':
      return operate(state, config, action.id);
  }
}

/** Applies a finished task. Starting a batch can fail by human error: inputs are lost, no batch runs. */
function complete(state: GameState, config: ScenarioConfig, action: WorkAction): ActionResult {
  const result = effect(state, config, action);
  if (!result.ok || !startsBatch(state, config, action) || action.type !== 'operate') return result;
  const [error, next] = chance(result.state, humanErrorChance(config, state.crew[0]));
  if (!error) return { ...result, state: next };
  const job = config.buildings[action.id].job!;
  const resources = { ...state.resources };
  for (const [res, amount] of Object.entries(job.inputs) as [ResourceId, number][]) resources[res] -= amount;
  return {
    state: { ...state, rngSeed: next.rngSeed, resources },
    ok: false,
    messageEs: `Error humano: se arruinó la tanda de ${config.buildings[action.id].nameEs} y se perdieron los insumos.`,
  };
}

/** Starts a task if its effect would work right now; otherwise explains why not. */
export function beginWork(state: GameState, config: ScenarioConfig, action: WorkAction): ActionResult {
  if (state.work) return { state, ok: false, messageEs: 'Ya estás trabajando.' };
  const check = effect(state, config, action);
  if (!check.ok) return { state, ok: false, messageEs: check.messageEs };
  const slow = state.injuryHoursLeft > 0 ? config.events.injurySlowdown : 1;
  const hours = earthHoursToLunar(config, config.workHours[kindOf(action)]) * slow;
  const labelEs = labelOf(state, config, action);
  return {
    state: { ...state, work: { action, labelEs, hoursLeft: hours, totalHours: hours } },
    ok: true,
    messageEs: `${labelEs} (${config.workHours[kindOf(action)] * slow} h)`,
  };
}

export function cancelWork(state: GameState): GameState {
  return state.work ? withLog({ ...state, work: null }, 'Trabajo cancelado.') : state;
}

/** Advances the task in progress; when it ends, applies its effect and may injure the astronaut. */
export function runWork(state: GameState, config: ScenarioConfig, dtHours: number): GameState {
  let s: GameState = { ...state, injuryHoursLeft: Math.max(0, state.injuryHoursLeft - dtHours) };
  if (!s.work) return s;
  const hoursLeft = s.work.hoursLeft - dtHours;
  if (hoursLeft > 0) return { ...s, work: { ...s.work, hoursLeft } };

  const result = complete({ ...s, work: null }, config, s.work.action);
  s = withLog(result.state, result.messageEs);
  if (s.status !== 'playing') return s;

  const [hurt, next] = chance(s, config.events.injuryPerTask);
  s = next;
  if (hurt) {
    s = withLog(
      { ...s, injuryHoursLeft: config.events.injuryHours },
      'Te lesionaste trabajando: por un tiempo caminas más lento y los trabajos tardan el doble.',
    );
  }
  return s;
}
