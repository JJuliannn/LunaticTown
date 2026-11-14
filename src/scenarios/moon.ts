import params from '../../data/params.json';
import type { ScenarioConfig, ZoneConfig, ZoneId } from '../sim/types';
import { readNumber, type RawParam } from './params';

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

export const ZONE_IDS: ZoneId[] = ['south_pole', 'equator'];

export function buildMoonScenario(): ScenarioConfig {
  const s = params.science;
  const crewSize = params.design.crew_size.playtest_value;
  return {
    id: 'moon',
    crewSize,
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
