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

export interface TimeConfig {
  /** Real minutes for one full lunar day/night cycle (24 lunar local hours). */
  realMinutesPerLunarCycle: number;
  /** Lunar local hour (0-24) at mission start. */
  startLocalHour: number;
}

/** Surface temperature model constants (Williams et al. 2017, Diviner). */
export interface TemperatureModel {
  solarConstant: number;
  emissivity: number;
  albedoNormal: number;
  albedoCoefA: number;
  albedoCoefB: number;
  /** Equator temperatures (K) near terminators and at night, by lunar local hour, sorted by hour. */
  equatorFloor: { hour: number; kelvin: number }[];
  /** Latitudes beyond this are treated as this latitude (limit of the paper's polar data). */
  polarCapLatitudeDeg: number;
  /** False while the values still need a human check against the paper. */
  verified: boolean;
}

export interface ScenarioConfig {
  id: 'moon';
  crewSize: number;
  time: TimeConfig;
  temperature: TemperatureModel;
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
  /** Lunar local hours elapsed since mission start (24 = one full day/night cycle). */
  elapsedLunarHours: number;
  resources: Resources;
  crew: Astronaut[];
}
