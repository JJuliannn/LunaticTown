import params from '../../data/params.json';
import type { ScenarioConfig, TemperatureModel, ZoneConfig, ZoneId } from '../sim/types';
import { isConfirmed, readNumber, type RawParam } from './params';

type RawZone = Record<string, RawParam> & { name_es: string };

function buildZone(id: ZoneId): ZoneConfig {
  const z = params.science.moon.zones[id] as unknown as RawZone;
  const n = (key: string) => readNumber(z[key], `moon.zones.${id}.${key}`);
  return {
    id,
    nameEs: z.name_es,
    latitudeDeg: n('latitude_deg'),
    sunlightShare: n('sunlight_share'),
    dayHeatPeak: n('day_heat_peak'),
    nightHeatFloor: n('night_heat_floor'),
    radiationFactor: n('radiation_factor'),
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

export const ZONE_IDS: ZoneId[] = ['south_pole', 'equator'];

export function buildMoonScenario(): ScenarioConfig {
  const s = params.science;
  const d = params.design;
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
  };
}
