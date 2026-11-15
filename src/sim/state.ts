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
    BUILDING_IDS.map((id) => [
      id,
      { built: false, hoursLeft: null, ready: false, stored: 0, broken: false, lastMaintainedDay: 0 },
    ]),
  ) as Record<BuildingId, StationState>;
}

/** @param seed random seed; the same seed replays the same events. */
export function createInitialState(config: ScenarioConfig, zoneId: ZoneId, seed = Date.now()): GameState {
  return {
    zoneId,
    elapsedLunarHours: 0,
    status: 'playing',
    lostReasonEs: null,
    shipUnpacked: false,
    resuppliesUnpacked: 0,
    location: 'hull',
    shelterBuilt: false,
    work: null,
    injuryHoursLeft: 0,
    storm: null,
    rngSeed: seed >>> 0,
    log: [],
    eclipseStartDay: config.polarEclipseStartDay,
    resources: { ...config.startResources },
    stations: emptyStations(),
    crew: Array.from({ length: config.crewSize }, (_, i) => createAstronaut(i)),
  };
}
