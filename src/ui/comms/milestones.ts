// Milestones Mission Control announces: things that change between two states.

import { currentPhase, PHASE_NAMES_ES } from '../../sim/actions';
import { inEclipse } from '../../sim/environment';
import { nextSupplyDay, suppliesLanded } from '../../sim/resupply';
import type { GameState, ScenarioConfig } from '../../sim/types';
import { labBlockers, missionDay } from '../../sim/victory';

/** Messages for what happened between `before` and `after`. */
export function milestonesEs(before: GameState, after: GameState, config: ScenarioConfig): string[] {
  const out: string[] = [];

  const phaseBefore = currentPhase(before, config);
  const phaseAfter = currentPhase(after, config);
  if (phaseAfter > phaseBefore && phaseAfter > 2) {
    out.push(`Fase ${phaseBefore} completa. Empieza la fase ${phaseAfter}: ${PHASE_NAMES_ES[phaseAfter]}.`);
  }

  if (suppliesLanded(after, config) > suppliesLanded(before, config) || after.resuppliesUnpacked < before.resuppliesUnpacked) {
    out.push(
      `Aterrizó una nave de suministros en la pista: minerales, sustrato y semillas. Desármala (E) para sacar el titanio. La próxima llega el día ${nextSupplyDay(after, config)}.`,
    );
  }

  const darkBefore = inEclipse(before, config);
  const darkAfter = inEclipse(after, config);
  if (!darkBefore && darkAfter) {
    out.push(
      `Empieza el eclipse polar: unos ${config.polarEclipseDays.value} días sin Sol. Los paneles no cargan; administra la energía guardada.`,
    );
  } else if (darkBefore && !darkAfter) {
    out.push('Terminó el eclipse polar: los paneles vuelven a cargar.');
  }

  const half = config.victory.missionDays / 2;
  if (missionDay(before, config) < half && missionDay(after, config) >= half) {
    out.push(`Día ${half}: vas a la mitad de la misión. Revisa reservas y mantenimiento.`);
  }

  const labBefore = labBlockers(before, config).length === 0;
  const labAfter = labBlockers(after, config).length === 0;
  if (!labBefore && labAfter) {
    out.push(`Todo en orden: ya puedes construir el ${config.victory.lab.nameEs.toLowerCase()} (a la derecha de la base).`);
  }
  return out;
}
