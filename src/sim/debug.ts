// Test menu: force the general events instead of waiting for the dice. Pure functions.
// Opened with I in the game; only for playtesting.

import { kill, METEOR_DEATH_ES, startStorm } from './events';
import { withLog } from './random';
import { LUNAR_HOURS_PER_CYCLE } from './sun';
import { missionDay } from './time';
import { BUILDING_IDS, type GameState, type ScenarioConfig } from './types';
import { injure } from './work';

export interface DebugEvent {
  labelEs: string;
  run: (state: GameState, config: ScenarioConfig) => GameState;
}

/** First built station that is working, if any. */
function workingStation(state: GameState) {
  return BUILDING_IDS.find((id) => state.stations[id].built && !state.stations[id].broken);
}

export const DEBUG_EVENTS: DebugEvent[] = [
  {
    labelEs: 'Tormenta solar (empieza el aviso de 3 días)',
    run: (s, c) => (s.storm ? withLog(s, 'Ya hay una tormenta en curso.') : startStorm(s, c)),
  },
  {
    labelEs: 'Tormenta solar: saltar al pico',
    run: (s) => (s.storm?.phase === 'warning' ? { ...s, storm: { ...s.storm, hoursLeft: 0.001 } } : withLog(s, 'No hay aviso de tormenta.')),
  },
  {
    labelEs: 'Falla de una estación',
    run: (s, c) => {
      const id = workingStation(s);
      if (!id) return withLog(s, 'No hay estaciones construidas funcionando.');
      const stations = { ...s.stations, [id]: { ...s.stations[id], broken: true } };
      return withLog({ ...s, stations }, `Falla: ${c.buildings[id].nameEs} dejó de funcionar. Ve a repararla (E).`, true);
    },
  },
  {
    labelEs: 'Error humano (arruina una tanda en curso)',
    run: (s, c) => {
      const id = BUILDING_IDS.find((b) => s.stations[b].hoursLeft !== null);
      if (!id) return withLog(s, 'No hay tandas en curso.');
      const stations = { ...s.stations, [id]: { ...s.stations[id], hoursLeft: null } };
      return withLog({ ...s, stations }, `Error humano: se arruinó la tanda de ${c.buildings[id].nameEs} y se perdieron los insumos.`, true);
    },
  },
  { labelEs: 'Lesión', run: (s, c) => injure(s, c) },
  { labelEs: 'Meteorito (muerte)', run: (s) => kill(s, METEOR_DEATH_ES) },
  {
    labelEs: 'Eclipse polar ahora',
    run: (s, c) =>
      c.zones[s.zoneId].continuousLight
        ? { ...s, eclipseStartDay: missionDay(s, c) }
        : withLog(s, 'En esta zona no hay eclipse polar (hay noche normal).'),
  },
  {
    labelEs: 'Aterriza una nave de suministros',
    run: (s) => ({ ...s, resuppliesUnpacked: s.resuppliesUnpacked - 1 }),
  },
  {
    labelEs: 'Saltar al día 29',
    run: (s, c) => {
      const hours = (29 * LUNAR_HOURS_PER_CYCLE) / c.dayNightCycleLengthDays.value;
      return s.elapsedLunarHours >= hours ? withLog(s, 'Ya pasaste el día 29.') : { ...s, elapsedLunarHours: hours };
    },
  },
];
