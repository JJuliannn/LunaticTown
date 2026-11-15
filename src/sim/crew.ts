// Crew consumption and personal bars. Pure functions.

import { LUNAR_HOURS_PER_CYCLE } from './sun';
import type { Astronaut, ResourceId, Resources, ScenarioConfig } from './types';

/** Takes `amount` from the listed stocks in order. Returns the fraction (0-1) that could be supplied. */
function draw(resources: Resources, from: ResourceId[], amount: number): number {
  if (amount <= 0) return 1;
  let missing = amount;
  for (const id of from) {
    const taken = Math.min(resources[id], missing);
    resources[id] -= taken;
    missing -= taken;
  }
  return 1 - missing / amount;
}

function updateBar(value: number, supplied: number, dropPerHour: number, recoverPerHour: number, dtHours: number): number {
  const change = supplied >= 0.999 ? recoverPerHour : -dropPerHour * (1 - supplied);
  return Math.max(0, Math.min(100, value + change * dtHours));
}

export interface CrewResult {
  resources: Resources;
  crew: Astronaut[];
  /** Cause of the first death in this step, in Spanish, or null. */
  deathCauseEs: string | null;
}

/** Stocks each need draws from, in order. Produced oxygen is used first; the reserve tanks are the safety net. */
export const NEED_SOURCES: Record<'oxygen' | 'water' | 'food', ResourceId[]> = {
  oxygen: ['oxygen', 'oxygenReserve'],
  water: ['water'],
  food: ['vegetables', 'protein', 'rations'],
};

/** kg the living crew uses per lunar hour. Consumption data is per Earth day; one lunar hour is cycleDays / 24 Earth days. */
export function crewNeedsPerHour(config: ScenarioConfig, aliveCount: number): Record<'oxygen' | 'water' | 'food', number> {
  const earthDaysPerHour = config.dayNightCycleLengthDays.value / LUNAR_HOURS_PER_CYCLE;
  const k = aliveCount * earthDaysPerHour;
  return {
    oxygen: config.oxygenPerCrewPerDay.value * k,
    water: config.waterPerCrewPerDay.value * k,
    food: config.foodPerCrewPerDay.value * k,
  };
}

export function runCrew(resources: Resources, crew: Astronaut[], config: ScenarioConfig, dtHours: number): CrewResult {
  const next = { ...resources };
  const rules = config.crewRules;
  const needs = crewNeedsPerHour(config, crew.filter((a) => a.alive).length);

  const waterNeeded = needs.water * dtHours;
  const oxygen = draw(next, NEED_SOURCES.oxygen, needs.oxygen * dtHours);
  const water = draw(next, NEED_SOURCES.water, waterNeeded);
  const food = draw(next, NEED_SOURCES.food, needs.food * dtHours);
  next.humanWaste += waterNeeded * water * rules.waterToWasteFraction;

  let deathCauseEs: string | null = null;
  const nextCrew = crew.map((a) => {
    if (!a.alive) return a;
    const updated = {
      ...a,
      oxygen: updateBar(a.oxygen, oxygen, rules.oxygenBarDropPerHour, rules.barRecoverPerHour, dtHours),
      water: updateBar(a.water, water, rules.waterBarDropPerHour, rules.barRecoverPerHour, dtHours),
      food: updateBar(a.food, food, rules.foodBarDropPerHour, rules.barRecoverPerHour, dtHours),
    };
    const cause = updated.oxygen <= 0 ? 'falta de oxígeno' : updated.water <= 0 ? 'falta de agua' : updated.food <= 0 ? 'falta de comida' : null;
    if (cause) {
      updated.alive = false;
      deathCauseEs ??= cause;
    }
    return updated;
  });

  return { resources: next, crew: nextCrew, deathCauseEs };
}
