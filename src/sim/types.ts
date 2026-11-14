// Pure simulation types. Nothing here knows about rendering.

export type ZoneId = 'south_pole' | 'equator';

/** A number taken from data/params.json, plus whether it is real (verified) or a playtest value. */
export interface ParamValue {
  value: number;
  verified: boolean;
}

export interface ZoneConfig {
  id: ZoneId;
  nameEs: string;
  latitudeDeg: ParamValue;
  /** Fraction (0-1) of the day/night cycle with sunlight. */
  sunlightShare: ParamValue;
  /** Game heat scale 0-100. */
  dayHeatPeak: ParamValue;
  nightHeatFloor: ParamValue;
  radiationFactor: ParamValue;
}

export interface ScenarioConfig {
  id: 'moon';
  crewSize: number;
  dayNightCycleLengthDays: ParamValue;
  surfaceRadiationDose: ParamValue;
  oxygenPerCrewPerDay: ParamValue;
  waterPerCrewPerDay: ParamValue;
  foodPerCrewPerDay: ParamValue;
  radiationLimitCrew: ParamValue;
  zones: Record<ZoneId, ZoneConfig>;
}

export interface Astronaut {
  id: number;
  name: string;
  oxygen: number;
  water: number;
  food: number;
  radiationDose: number;
  morale: number;
}

export interface Resources {
  energy: number;
  oxygenTanks: number;
  oxygenProduction: number;
  water: number;
  food: number;
  nitrogen: number;
}

export interface GameState {
  zoneId: ZoneId;
  /** Elapsed game hours since mission start. */
  hour: number;
  resources: Resources;
  crew: Astronaut[];
}
