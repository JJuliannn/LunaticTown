// Lunar surface temperature by latitude and local hour. Pure functions.
//
// Daytime: radiative equilibrium, equation 1 of Williams et al. 2017 (Diviner):
//   T = [S (1 - A) cos(i) / (emissivity * sigma)]^(1/4),  A(i) = A0 + a (i/45)^3 + b (i/90)^8
// Night and terminators: the paper's equator temperatures by local hour, joined with
// straight lines and scaled to other latitudes with cos(lat)^(1/4). That scaling and the
// straight lines are OUR assumptions (see data/params.json), not the paper's.

import { LUNAR_HOURS_PER_CYCLE, sunAt } from './sun';
import type { TemperatureModel } from './types';

/** Stefan-Boltzmann constant, W m^-2 K^-4 (exact SI value). */
const SIGMA = 5.670374419e-8;
const DEG = Math.PI / 180;

function equilibriumKelvin(model: TemperatureModel, cosIncidence: number, incidenceDeg: number): number {
  if (cosIncidence <= 0) return 0;
  const albedo =
    model.albedoNormal +
    model.albedoCoefA * Math.pow(incidenceDeg / 45, 3) +
    model.albedoCoefB * Math.pow(incidenceDeg / 90, 8);
  const absorbed = model.solarConstant * (1 - albedo) * cosIncidence;
  return Math.pow(Math.max(0, absorbed) / (model.emissivity * SIGMA), 0.25);
}

/** Equator floor temperature at a local hour: linear interpolation around the 24 h cycle. */
function equatorFloorKelvin(model: TemperatureModel, localHour: number): number {
  const pts = model.equatorFloor;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const span = (b.hour - a.hour + LUNAR_HOURS_PER_CYCLE) % LUNAR_HOURS_PER_CYCLE || LUNAR_HOURS_PER_CYCLE;
    const offset = (localHour - a.hour + LUNAR_HOURS_PER_CYCLE) % LUNAR_HOURS_PER_CYCLE;
    if (offset <= span) {
      return a.kelvin + ((b.kelvin - a.kelvin) * offset) / span;
    }
  }
  return pts[0].kelvin;
}

export function surfaceTemperatureKelvin(model: TemperatureModel, latitudeDeg: number, localHour: number): number {
  const lat = Math.min(Math.abs(latitudeDeg), model.polarCapLatitudeDeg);
  const sun = sunAt(localHour, lat);
  const day = equilibriumKelvin(model, sun.cosIncidence, sun.incidenceDeg);
  const floor = equatorFloorKelvin(model, localHour) * Math.pow(Math.cos(lat * DEG), 0.25);
  return Math.max(day, floor);
}

export function kelvinToCelsius(kelvin: number): number {
  return kelvin - 273.15;
}
