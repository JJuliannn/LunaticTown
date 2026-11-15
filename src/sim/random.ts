// Deterministic random numbers kept in the game state, so the simulation stays pure:
// the same seed and the same player actions replay the same events.

import type { GameState } from './types';

/** One step of mulberry32. */
function next(seed: number): { value: number; seed: number } {
  const a = (seed + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: a };
}

/** True with probability p. Returns the state with the advanced seed. */
export function chance(state: GameState, p: number): [boolean, GameState] {
  const r = next(state.rngSeed);
  return [r.value < p, { ...state, rngSeed: r.seed }];
}

/** Probability per shorter period from a probability per longer one (e.g. per day from per week: periods = 7). */
export function splitChance(p: number, periods: number): number {
  return 1 - Math.pow(1 - p, 1 / periods);
}

/** Adds a message. comms = true for important news that Mission Control relays on the communicator. */
export function withLog(state: GameState, textEs: string, comms = false): GameState {
  return { ...state, log: [...state.log, { textEs, comms }] };
}
