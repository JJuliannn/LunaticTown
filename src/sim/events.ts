// Random events, rolled once per Earth day of the mission. Pure functions.
// - Station failures (failures.ts).
// - Meteorite: the team's rule, 4 % per year. Real data: 2024 YR4 has a 4.3 % chance of hitting
//   the Moon on 22 Dec 2032, a single event (see params.json science.moon.asteroid_2024_yr4).
// - Solar storm: 1 % per day. A warning, then a peak: in the shelter the astronaut always
//   survives, in the hull 30 %, outside never. Leaving cover during the peak is fatal.

import { rollFailures } from './failures';
import { chance, splitChance, withLog } from './random';
import { earthHoursToLunar } from './time';
import type { GameState, ScenarioConfig } from './types';

const DAYS_PER_YEAR = 365.25;

export const METEOR_DEATH_ES =
  'Un meteorito de unos 60 m cayó sobre la base. (Dato real: el asteroide 2024 YR4 tiene un 4,3 % de chocar con la Luna el 22 de diciembre de 2032.)';

export function kill(state: GameState, reasonEs: string): GameState {
  return {
    ...state,
    status: 'lost',
    lostReasonEs: reasonEs,
    crew: state.crew.map((a) => ({ ...a, alive: false })),
    work: null,
  };
}

/** Everything rolled at the start of a new Earth day. */
export function onNewDay(state: GameState, config: ScenarioConfig): GameState {
  const e = config.events;
  let s = rollFailures(state, config);

  const [meteor, afterMeteor] = chance(s, splitChance(e.meteorPerYear, DAYS_PER_YEAR));
  s = afterMeteor;
  if (meteor) return kill(s, METEOR_DEATH_ES);

  if (!s.storm) {
    const [storm, afterStorm] = chance(s, e.solarStormPerDay);
    s = afterStorm;
    if (storm) s = startStorm(s, config);
  }
  return s;
}

/** Mission Control detects a solar storm: the warning period starts. */
export function startStorm(state: GameState, config: ScenarioConfig): GameState {
  const e = config.events;
  const days = Math.round(e.solarStormWarningHours / 24);
  const hull = Math.round(e.solarStormHullSurvival * 100);
  const s: GameState = { ...state, storm: { phase: 'warning', hoursLeft: earthHoursToLunar(config, e.solarStormWarningHours) } };
  return withLog(
    s,
    `Detectamos una eyección solar: la tormenta llega en unos ${days} días. Prepárate y estate en el refugio antes del pico (en el casco solo hay ${hull} % de sobrevivir).`,
    true,
  );
}

/** Advances a solar storm under way and applies its consequences. */
export function runStorm(state: GameState, config: ScenarioConfig, dtHours: number): GameState {
  const storm = state.storm;
  if (!storm || state.status !== 'playing') return state;
  const e = config.events;

  if (storm.phase === 'peak' && state.location === 'outside') {
    return kill(state, 'Murió por la radiación de la tormenta solar: estaba fuera de refugio.');
  }

  const hoursLeft = storm.hoursLeft - dtHours;
  if (hoursLeft > 0) return { ...state, storm: { ...storm, hoursLeft } };

  if (storm.phase === 'peak') return withLog({ ...state, storm: null }, 'Terminó la tormenta solar. Ya puedes salir.', true);

  // The peak arrives: where is the astronaut?
  let s: GameState = { ...state, storm: { phase: 'peak', hoursLeft: earthHoursToLunar(config, e.solarStormPeakHours) } };
  if (s.location === 'outside') return kill(s, 'Murió por la radiación de la tormenta solar: estaba fuera de refugio.');
  if (s.location === 'hull') {
    const [survived, next] = chance(s, e.solarStormHullSurvival);
    s = next;
    if (!survived) return kill(s, 'Murió por la tormenta solar: el casco de la nave no bastó para protegerlo.');
    return withLog(s, 'La tormenta pegó de lleno y el casco aguantó (30 % de sobrevivir). No salgas hasta que termine.', true);
  }
  return withLog(s, 'La tormenta está en su pico. En el refugio estás a salvo: no salgas hasta que termine.', true);
}
