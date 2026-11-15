// Tutorial given by Mission Control on the communicator. Each step stays until its goal is met.

import { currentPhase } from '../../sim/actions';
import type { GameState, ScenarioConfig } from '../../sim/types';

interface Step {
  done: (s: GameState, c: ScenarioConfig) => boolean;
  textEs: (s: GameState, c: ScenarioConfig) => string;
}

const built = (s: GameState, id: keyof GameState['stations']) => s.stations[id].built;

const STEPS: Step[] = [
  {
    done: (s) => s.shipUnpacked,
    textEs: (s, c) =>
      `Aquí Control de Misión. Aterrizaste en: ${c.zones[s.zoneId].nameEs}. La misión dura ${c.victory.missionDays} días; ` +
      'el último día, con la base en buen estado, construyes el laboratorio de investigación. Primero desarma la nave: ' +
      'el casco será tu base y el resto, titanio. Párate en la nave y presiona E (cada trabajo toma tiempo; moverte lo cancela).',
  },
  {
    done: (s) => built(s, 'solar_panels'),
    textEs: (s, c) =>
      'Sin energía no funciona nada. Construye los paneles solares (traen baterías).' +
      (c.zones[s.zoneId].permanentShadow
        ? ' Aquí el Sol nunca llega al fondo del cráter: el sitio está arriba, en el borde, a la izquierda.'
        : ' Camina a su sitio y presiona E.'),
  },
  {
    done: (s) => built(s, 'oxygenator'),
    textEs: () =>
      'Tus tanques de oxígeno son una reserva finita. Construye el oxigenador: por reducción carbotérmica saca O2 del regolito.',
  },
  {
    done: (s, c) => built(s, 'ice_extractor') || !c.zones[s.zoneId].hasIce,
    textEs: () => 'Construye el extractor de hielo: saca hielo de los cráteres en sombra y lo purifica con minerales.',
  },
  {
    done: (s, c) => currentPhase(s, c) >= 3,
    textEs: () =>
      'Nada llega solo a la base: ve a cada estación a iniciar tandas y a recoger lo producido (E). ' +
      'Los paneles muestran "¡Listo!" cuando conviene recoger la energía.',
  },
  {
    done: (s, c) => currentPhase(s, c) >= 4,
    textEs: (s, c) =>
      'Fase 3: hidroponía (rábano, lechuga, pak choi), cultivo de grillos para proteína y baño procesador, que recupera agua y nitrógeno.' +
      (c.zones[s.zoneId].hasIce ? '' : ' Aquí no hay hielo: el baño es tu única forma de recuperar agua.'),
  },
  {
    done: (s) => s.shelterBuilt,
    textEs: () =>
      'Base completa. Da mantenimiento a las estaciones (R): cada semana sin mantenimiento sube el riesgo de falla. ' +
      'Te recomendamos excavar el refugio contra tormentas solares (a la izquierda de la pista).',
  },
];

/** Text of the current tutorial step, or null when the tutorial is over. */
export function tutorialStepEs(state: GameState, config: ScenarioConfig): string | null {
  const step = STEPS.find((s) => !s.done(state, config));
  return step ? step.textEs(state, config) : null;
}
