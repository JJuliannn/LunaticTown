import params from '../../data/params.json';
import {
  BUILDING_IDS,
  type BuildingDef,
  type BuildingId,
  type ScenarioConfig,
  type TemperatureModel,
  type ZoneConfig,
  type ZoneId,
} from '../sim/types';
import { isConfirmed, readNumber } from './params';

function buildZone(id: ZoneId): ZoneConfig {
  const z = params.science.moon.zones[id];
  return {
    id,
    nameEs: z.name_es,
    latitudeDeg: readNumber(z.latitude_deg, `moon.zones.${id}.latitude_deg`),
    radiationFactor: readNumber(z.radiation_factor, `moon.zones.${id}.radiation_factor`),
    hasIce: z.has_ice.value,
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
  // Optional flags are missing on most entries, so read them through a loose shape.
  const b = params.game_balance.buildings[id] as {
    name_es: string;
    description_es: string;
    phase: number;
    max_count: number;
    cost: BuildingDef['cost'];
    inputs_per_hour: BuildingDef['inputsPerHour'];
    outputs_per_hour: BuildingDef['outputsPerHour'];
    needs_sunlight?: boolean;
    needs_ice?: boolean;
    battery_capacity?: number;
  };
  return {
    id,
    nameEs: b.name_es,
    descriptionEs: b.description_es,
    phase: b.phase === 3 ? 3 : 2,
    maxCount: b.max_count,
    cost: b.cost,
    inputsPerHour: b.inputs_per_hour,
    outputsPerHour: b.outputs_per_hour,
    needsSunlight: b.needs_sunlight ?? false,
    needsIce: b.needs_ice ?? false,
    batteryCapacity: b.battery_capacity ?? 0,
  };
}

export const ZONE_IDS: ZoneId[] = ['south_pole', 'equator'];

export function buildMoonScenario(): ScenarioConfig {
  const s = params.science;
  const d = params.design;
  const g = params.game_balance;
  return {
    id: 'moon',
    crewSize: d.crew_size.playtest_value,
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
    zones: {
      south_pole: buildZone('south_pole'),
      equator: buildZone('equator'),
    },
    buildings: Object.fromEntries(BUILDING_IDS.map((id) => [id, buildBuilding(id)])) as Record<BuildingId, BuildingDef>,
    startResources: g.start_resources,
    shipSalvage: g.ship_salvage,
    hullBatteryCapacity: g.hull_battery_capacity,
    crewRules: {
      oxygenBarDropPerHour: g.crew.oxygen_bar_drop_per_hour,
      waterBarDropPerHour: g.crew.water_bar_drop_per_hour,
      foodBarDropPerHour: g.crew.food_bar_drop_per_hour,
      barRecoverPerHour: g.crew.bar_recover_per_hour,
      waterToWasteFraction: g.crew.water_to_waste_fraction,
    },
  };
}
