// How the mission is won. Pure functions.
// The mission lasts N Earth days (Artemis Surface Habitat nominal mission). On that day, if the
// base is complete and the astronaut and the stocks are in good shape, the research lab can be
// built, and building it wins.

import { currentPhase, missingForPhase, type ActionResult } from './actions';
import { reserveHours } from './crew';
import { missionDay } from './time';
import type { GameState, ResourceId, ScenarioConfig } from './types';

export { missionDay };

const NEED_NAMES_ES = { oxygen: 'oxígeno', water: 'agua', food: 'comida' } as const;

/** Everything still standing between the player and the lab, in Spanish. Empty list = it can be built. */
export function labBlockers(state: GameState, config: ScenarioConfig): string[] {
  const v = config.victory;
  const reasons: string[] = [];

  const day = missionDay(state, config);
  if (day < v.missionDays) reasons.push(`Se desbloquea el día ${v.missionDays} (hoy es el día ${Math.floor(day) + 1})`);

  if (currentPhase(state, config) < 4) {
    const missing = missingForPhase(state, config).map((id) => config.buildings[id].nameEs);
    reasons.push(`Falta construir: ${missing.join(', ')}`);
  }

  const astronaut = state.crew[0];
  const weak = (['oxygen', 'water', 'food'] as const).filter((n) => astronaut[n] < v.minCrewBar);
  if (weak.length > 0) {
    reasons.push(`El astronauta necesita ${weak.map((n) => NEED_NAMES_ES[n]).join(', ')} al ${v.minCrewBar} % o más`);
  }

  const alive = state.crew.filter((a) => a.alive).length;
  const hours = reserveHours(state.resources, config, alive);
  const low = (['oxygen', 'water', 'food'] as const).filter((n) => hours[n] < v.minReserveHours);
  if (low.length > 0) {
    reasons.push(`Reservas de ${low.map((n) => NEED_NAMES_ES[n]).join(', ')} para menos de ${v.minReserveHours} h`);
  }

  const lacking = (Object.entries(v.lab.cost) as [ResourceId, number][]).find(([res, amount]) => state.resources[res] < amount);
  if (lacking) reasons.push('Faltan materiales');

  return reasons;
}

export function buildLab(state: GameState, config: ScenarioConfig): ActionResult {
  const blockers = labBlockers(state, config);
  if (blockers.length > 0) return { state, ok: false, messageEs: `${blockers[0]}.` };
  const resources = { ...state.resources };
  for (const [res, amount] of Object.entries(config.victory.lab.cost) as [ResourceId, number][]) resources[res] -= amount;
  return {
    state: { ...state, resources, status: 'won' },
    ok: true,
    messageEs: `Construido: ${config.victory.lab.nameEs}. ¡Misión cumplida!`,
  };
}
