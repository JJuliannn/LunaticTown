// Pure simulation types. Nothing here knows about rendering.

export type ZoneId = 'south_pole' | 'shadowed_crater' | 'equator';

/** A number taken from data/params.json, plus whether it is real (verified) or a playtest value. */
export interface ParamValue {
  value: number;
  verified: boolean;
}

export interface ZoneConfig {
  id: ZoneId;
  nameEs: string;
  latitudeDeg: ParamValue;
  radiationFactor: ParamValue;
  /** Whether the ice extractor can work here. */
  hasIce: boolean;
  /** The base sits where sunlight never reaches (floor of a polar crater). Panels must go on the rim. */
  permanentShadow: boolean;
  /** Ground temperature in permanent shadow, constant all cycle. Null where the Sun model applies. */
  shadowFloorKelvin: ParamValue | null;
  /** Difficulty label for the zone card. */
  difficultyEs: string;
  /** One or two lines for the zone card. */
  summaryEs: string;
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

export const RESOURCE_IDS = [
  'energy',
  'oxygenReserve',
  'oxygen',
  'water',
  'minerals',
  'titanium',
  'seeds',
  'substrate',
  'rations',
  'vegetables',
  'protein',
  'plantWaste',
  'humanWaste',
  'nitrogen',
] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];
/** Stock of each resource. Mass in kg, energy in game units. */
export type Resources = Record<ResourceId, number>;
export type ResourceAmounts = Partial<Resources>;

/** Stations the player can build, in menu and layout order. */
export const BUILDING_IDS = [
  'solar_panels',
  'oxygenator',
  'ice_extractor',
  'waste_processor',
  'hydroponics',
  'cricket_farm',
] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

/** One batch of a processor station: the player starts it, waits, then collects the outputs. */
export interface JobDef {
  /** Lunar hours the batch takes (1 lunar hour = 1 real minute at normal speed). */
  hours: number;
  inputs: ResourceAmounts;
  outputs: ResourceAmounts;
}

/**
 * A station. Nothing is delivered to the base automatically:
 * - collector: fills its own storage over time (solar panels); the player collects it.
 * - processor: the player starts a batch, it runs for a while, then the player collects the result.
 */
export interface BuildingDef {
  id: BuildingId;
  nameEs: string;
  descriptionEs: string;
  /** Mission phase in which it becomes available (2 = essential, 3 = necessary). */
  phase: 2 | 3;
  cost: ResourceAmounts;
  kind: 'collector' | 'processor';
  /** Only works in zones with ice. */
  needsIce: boolean;
  /** Collector only. */
  produces: ResourceId | null;
  ratePerHour: number;
  storageCapacity: number;
  needsSunlight: boolean;
  /** Processor only. */
  job: JobDef | null;
}

export interface CrewRules {
  /** How fast a personal bar (0-100) drops per lunar hour when nothing is supplied. */
  oxygenBarDropPerHour: number;
  waterBarDropPerHour: number;
  foodBarDropPerHour: number;
  barRecoverPerHour: number;
  /** Fraction of the water a person uses that comes back as waste to process. */
  waterToWasteFraction: number;
}

export interface ScenarioConfig {
  id: 'moon';
  crewSize: number;
  time: TimeConfig;
  temperature: TemperatureModel;
  /** Length of the lunar day/night cycle in Earth days. */
  dayNightCycleLengthDays: ParamValue;
  surfaceRadiationDose: ParamValue;
  /** Per person per Earth day, kg. */
  oxygenPerCrewPerDay: ParamValue;
  waterPerCrewPerDay: ParamValue;
  foodPerCrewPerDay: ParamValue;
  radiationLimitCrew: ParamValue;
  zones: Record<ZoneId, ZoneConfig>;
  buildings: Record<BuildingId, BuildingDef>;
  startResources: Resources;
  shipSalvage: ResourceAmounts;
  /** Most energy the base can hold. */
  baseBatteryCapacity: number;
  crewRules: CrewRules;
}

export interface Astronaut {
  id: number;
  name: string;
  alive: boolean;
  oxygen: number;
  water: number;
  food: number;
  radiationDose: number;
  morale: number;
}

export interface StationState {
  built: boolean;
  /** Processor: lunar hours left in the running batch, or null if no batch is running. */
  hoursLeft: number | null;
  /** Processor: a finished batch is waiting to be collected. */
  ready: boolean;
  /** Collector: amount waiting to be collected. */
  stored: number;
}

export type MissionStatus = 'playing' | 'lost';

export interface GameState {
  zoneId: ZoneId;
  /** Lunar local hours elapsed since mission start (24 = one full day/night cycle). */
  elapsedLunarHours: number;
  status: MissionStatus;
  /** Why the mission was lost, in Spanish, for the UI. */
  lostReasonEs: string | null;
  /** False until the player dismantles the ship (phase 1). */
  shipUnpacked: boolean;
  resources: Resources;
  stations: Record<BuildingId, StationState>;
  crew: Astronaut[];
}
