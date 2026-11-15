import type { Astronaut, GameState, ScenarioConfig, ZoneId } from './types';

// Starting amounts are game units chosen for playtesting, not real quantities.
const START_RESOURCES = {
  energy: 100,
  oxygenTanks: 100,
  oxygenProduction: 0,
  water: 100,
  food: 100,
  nitrogen: 100,
};

const CREW_NAMES = ['Ana', 'Luis', 'Sofía', 'Mateo', 'Valeria', 'Diego'];

function createAstronaut(id: number): Astronaut {
  return {
    id,
    name: CREW_NAMES[id % CREW_NAMES.length],
    oxygen: 100,
    water: 100,
    food: 100,
    radiationDose: 0,
    morale: 100,
  };
}

export function createInitialState(config: ScenarioConfig, zoneId: ZoneId): GameState {
  const crew = Array.from({ length: config.crewSize }, (_, i) => createAstronaut(i));
  return {
    zoneId,
    elapsedLunarHours: 0,
    resources: { ...START_RESOURCES },
    crew,
  };
}
