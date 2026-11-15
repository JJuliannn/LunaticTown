import type { ParamValue } from '../sim/types';

/** Shape of one entry in data/params.json. */
export interface RawParam {
  value: unknown;
  status: string;
  playtest_value?: unknown;
  source_url?: string | null;
}

/**
 * True when the entry's own `value` can be used by the game:
 * - decided: a design decision of the team.
 * - sourced / verified: a real value with a source. "sourced" still needs a human check.
 */
export function hasUsableValue(param: RawParam): boolean {
  if (param.value === null || param.value === undefined) return false;
  if (param.status === 'decided') return true;
  return (param.status === 'verified' || param.status === 'sourced') && !!param.source_url;
}

/** Only "verified" (source + team confirmation) and design decisions count as confirmed. */
export function isConfirmed(param: RawParam): boolean {
  return hasUsableValue(param) && (param.status === 'verified' || param.status === 'decided');
}

/** Picks the value the game should use: the real one when usable, otherwise the playtest value. */
export function readNumber(param: RawParam, name: string): ParamValue {
  const raw = hasUsableValue(param) ? param.value : param.playtest_value;
  if (typeof raw !== 'number') {
    throw new Error(`params.json: "${name}" has no numeric value to use`);
  }
  return { value: raw, verified: isConfirmed(param) };
}
