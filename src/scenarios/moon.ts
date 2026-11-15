import params from '../../data/params.json';
import {
  BUILDING_IDS,
  type BuildingDef,
  type BuildingId,
  type ResourceAmounts,
  type ResourceId,
  type ScenarioConfig,
  type TemperatureModel,
  type ZoneConfig,
  type ZoneId,
} from '../sim/types';
import { isConfirmed, readNumber, type RawParam } from './params';

function buildZone(id: ZoneId): ZoneConfig {
  // Zones differ in which optional fields they have, so read them through a loose shape.
  const z = params.science.moon.zones[id] as {
    name_es: string;
    difficulty_es: string;
    summary_es: string;
    latitude_deg: RawParam;
    radiation_factor: RawParam;
    has_ice: { value: boolean };
    permanent_shadow?: { value: boolean };
    shadow_floor_kelvin?: RawParam;
  };
  return {
    id,
    nameEs: z.name_es,
    latitudeDeg: readNumber(z.latitude_deg, `moon.zones.${id}.latitude_deg`),
    radiationFactor: readNumber(z.radiation_factor, `moon.zones.${id}.radiation_factor`),
    hasIce: z.has_ice.value,
    permanentShadow: z.permanent_shadow?.value ?? false,
    shadowFloorKelvin: z.shadow_floor_kelvin
      ? readNumber(z.shadow_floor_kelvin, `moon.zones.${id}.shadow_floor_kelvin`)
      : null,
    difficultyEs: z.difficulty_es,
    summaryEs: z.summary_es,
  };
}

function buildTemperatureModel(): TemperatureModel {
  const raw = params.science.moon.temperature_model;
  const v = raw.value;
  const equatorFloor = Object.entries(v.equator_floor_kelvin_by_hour)
    .map(([hour, kelvin]) => ({ hour: Number(hour), kelvin }))
    .sort((a, b) => a.hour - b.hour);
  return {
    solarConstant: v.solar_constant_w_m2,
    emissivity: v.emissivity,
    albedoNormal: v.albedo_normal,
    albedoCoefA: v.albedo_coef_a,
    albedoCoefB: v.albedo_coef_b,
    equatorFloor,
    polarCapLatitudeDeg: v.polar_cap_latitude_deg,
    verified: isConfirmed(raw),
  };
}

function buildBuilding(id: BuildingId): BuildingDef {
  // Collectors and processors have different fields, so read them through a loose shape.
  const b = params.game_balance.buildings[id] as {
    name_es: string;
    description_es: string;
    phase: number;
    cost: ResourceAmounts;
    kind: string;
    needs_ice?: boolean;
    needs_sunlight?: boolean;
    produces?: string;
    rate_per_hour?: number;
    storage_capacity?: number;
    job?: { hours: number; inputs: ResourceAmounts; outputs: ResourceAmounts };
  };
  return {
    id,
    nameEs: b.name_es,
    descriptionEs: b.description_es,
    phase: b.phase === 3 ? 3 : 2,
    cost: b.cost,
    kind: b.kind === 'collector' ? 'collector' : 'processor',
    needsIce: b.needs_ice ?? false,
    produces: (b.produces as ResourceId | undefined) ?? null,
    ratePerHour: b.rate_per_hour ?? 0,
    storageCapacity: b.storage_capacity ?? 0,
    needsSunlight: b.needs_sunlight ?? false,
    job: b.job ?? null,
  };
}

/** Zone order on the selection screen: from easiest to hardest. */
export const ZONE_IDS: ZoneId[] = ['south_pole', 'shadowed_crater', 'equator'];

export function buildMoonScenario(): ScenarioConfig {
  const s = params.science;
  const d = params.design;
  const g = params.game_balance;
  return {
    id: 'moon',
    crewSize: readNumber(d.crew_size, 'crew_size').value,
    time: {
      realMinutesPerLunarCycle: readNumber(d.real_minutes_per_lunar_cycle, 'real_minutes_per_lunar_cycle').value,
      startLocalHour: readNumber(d.start_local_hour, 'start_local_hour').value,
    },
    temperature: buildTemperatureModel(),
    dayNightCycleLengthDays: readNumber(s.moon.day_night_cycle_length, 'moon.day_night_cycle_length'),
    surfaceRadiationDose: readNumber(s.moon.surface_radiation_dose, 'moon.surface_radiation_dose'),
    oxygenPerCrewPerDay: readNumber(s.oxygen_per_crew_per_day, 'oxygen_per_crew_per_day'),
    waterPerCrewPerDay: readNumber(s.water_per_crew_per_day, 'water_per_crew_per_day'),
    foodPerCrewPerDay: readNumber(s.food_per_crew_per_day, 'food_per_crew_per_day'),
    radiationLimitCrew: readNumber(s.radiation_limit_crew, 'radiation_limit_crew'),
    zones: Object.fromEntries(ZONE_IDS.map((id) => [id, buildZone(id)])) as Record<ZoneId, ZoneConfig>,
    buildings: Object.fromEntries(BUILDING_IDS.map((id) => [id, buildBuilding(id)])) as Record<BuildingId, BuildingDef>,
    startResources: g.start_resources,
    shipSalvage: g.ship_salvage,
    baseBatteryCapacity: g.base_battery_capacity,
    crewRules: {
      oxygenBarDropPerHour: g.crew.oxygen_bar_drop_per_hour,
      waterBarDropPerHour: g.crew.water_bar_drop_per_hour,
      foodBarDropPerHour: g.crew.food_bar_drop_per_hour,
      barRecoverPerHour: g.crew.bar_recover_per_hour,
      waterToWasteFraction: g.crew.water_to_waste_fraction,
    },
  };
}
