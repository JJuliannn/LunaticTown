import { BUILDING_IDS, type Astronaut, type BuildingId, type GameState, type ScenarioConfig, type ZoneId } from './types';

const CREW_NAMES = ['Ana', 'Luis', 'Sofía', 'Mateo', 'Valeria', 'Diego'];

function createAstronaut(id: number): Astronaut {
  return {
    id,
    name: CREW_NAMES[id % CREW_NAMES.length],
    alive: true,
    oxygen: 100,
    water: 100,
    food: 100,
    radiationDose: 0,
    morale: 100,
  };
}

export function zeroPerBuilding(): Record<BuildingId, number> {
  return Object.fromEntries(BUILDING_IDS.map((id) => [id, 0])) as Record<BuildingId, number>;
}

export function createInitialState(config: ScenarioConfig, zoneId: ZoneId): GameState {
  return {
    zoneId,
    elapsedLunarHours: 0,
    status: 'playing',
    lostReasonEs: null,
    shipUnpacked: false,
    resources: { ...config.startResources },
    buildings: zeroPerBuilding(),
    buildingActivity: zeroPerBuilding(),
    crew: Array.from({ length: config.crewSize }, (_, i) => createAstronaut(i)),
  };
}
