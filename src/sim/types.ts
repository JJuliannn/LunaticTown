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
  radiationFactor: ParamValue;
  /** Whether the ice extractor can work here. */
  hasIce: boolean;
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

/** Order matters: step() runs the machines in this order. */
export const BUILDING_IDS = [
  'solar_panels',
  'oxygenator',
  'ice_extractor',
  'waste_processor',
  'hydroponics',
  'cricket_farm',
] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

/** A machine: every lunar hour it turns inputs into outputs. */
export interface BuildingDef {
  id: BuildingId;
  nameEs: string;
  descriptionEs: string;
  /** Mission phase in which it becomes available (2 = essential, 3 = necessary). */
  phase: 2 | 3;
  maxCount: number;
  cost: ResourceAmounts;
  inputsPerHour: ResourceAmounts;
  outputsPerHour: ResourceAmounts;
  /** Output scales with sunlight (solar panels). */
  needsSunlight: boolean;
  /** Only works in zones with ice. */
  needsIce: boolean;
  /** Energy storage added by each unit. */
  batteryCapacity: number;
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
  hullBatteryCapacity: number;
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
  buildings: Record<BuildingId, number>;
  /** 0-1: how much of its full rate each machine type ran in the last step. */
  buildingActivity: Record<BuildingId, number>;
  crew: Astronaut[];
}
