import {
  BUILDING_IDS,
  type Astronaut,
  type BuildingId,
  type GameState,
  type ScenarioConfig,
  type StationState,
  type ZoneId,
} from './types';

function createAstronaut(id: number): Astronaut {
  return {
    id,
    name: id === 0 ? 'Astronauta' : `Astronauta ${id + 1}`,
    alive: true,
    oxygen: 100,
    water: 100,
    food: 100,
    radiationDose: 0,
    morale: 100,
  };
}

function emptyStations(): Record<BuildingId, StationState> {
  return Object.fromEntries(
    BUILDING_IDS.map((id) => [id, { built: false, hoursLeft: null, ready: false, stored: 0 }]),
  ) as Record<BuildingId, StationState>;
}

export function createInitialState(config: ScenarioConfig, zoneId: ZoneId): GameState {
  return {
    zoneId,
    elapsedLunarHours: 0,
    status: 'playing',
    lostReasonEs: null,
    shipUnpacked: false,
    resources: { ...config.startResources },
    stations: emptyStations(),
    crew: Array.from({ length: config.crewSize }, (_, i) => createAstronaut(i)),
  };
}
