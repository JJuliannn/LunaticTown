import { runCrew } from './crew';
import { panelSunlight, radiationPerHour } from './environment';
import { onNewDay, runStorm } from './events';
import { runStations } from './processes';
import { missionDay } from './time';
import { runWork } from './work';
import { LUNAR_HOURS_PER_CYCLE, localHourOf, sunAt } from './sun';
import type { GameState, ScenarioConfig } from './types';

/** Largest slice simulated at once, so fast-forward stays accurate. */
const MAX_STEP_HOURS = 0.05;

/** Advances the simulation by real seconds. Pure: returns a new state. */
export function step(state: GameState, config: ScenarioConfig, dtRealSeconds: number): GameState {
  const lunarHoursPerRealSecond = LUNAR_HOURS_PER_CYCLE / (config.time.realMinutesPerLunarCycle * 60);
  let remaining = dtRealSeconds * lunarHoursPerRealSecond;
  let current = state;
  while (remaining > 0 && current.status === 'playing') {
    const dt = Math.min(remaining, MAX_STEP_HOURS);
    current = stepHours(current, config, dt);
    remaining -= dt;
  }
  return current;
}

function stepHours(state: GameState, config: ScenarioConfig, dtHours: number): GameState {
  const zone = config.zones[state.zoneId];
  const sun = sunAt(localHourOf(state, config.time), zone.latitudeDeg.value);

  const dayBefore = Math.floor(missionDay(state, config));

  const stations = runStations(state, config, panelSunlight(state, config, sun), dtHours);
  const crew = runCrew(state.resources, state.crew, config, dtHours);
  const dose = radiationPerHour(config, state.location !== 'outside') * dtHours;
  const irradiated = crew.crew.map((a) => (a.alive ? { ...a, radiationDose: a.radiationDose + dose } : a));

  const anyoneAlive = crew.crew.some((a) => a.alive);
  let next: GameState = {
    ...state,
    elapsedLunarHours: state.elapsedLunarHours + dtHours,
    resources: crew.resources,
    stations,
    crew: irradiated,
    status: anyoneAlive ? 'playing' : 'lost',
    lostReasonEs: anyoneAlive ? null : `El astronauta murió por ${crew.deathCauseEs ?? 'causas desconocidas'}.`,
  };
  if (next.status !== 'playing') return next;

  next = runWork(next, config, dtHours);
  next = runStorm(next, config, dtHours);
  if (next.status === 'playing' && Math.floor(missionDay(next, config)) > dayBefore) next = onNewDay(next, config);
  return next;
}
