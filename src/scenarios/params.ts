import type { ParamValue } from '../sim/types';

/** Shape of one entry in data/params.json. */
export interface RawParam {
  value: number | null;
  status: string;
  playtest_value?: unknown;
  source_url?: string | null;
}

/**
 * Picks the value the game should use: the real value only when it is verified
 * and has a source, otherwise the playtest value.
 */
export function readNumber(param: RawParam, name: string): ParamValue {
  const verified = param.status === 'verified' && param.value !== null && !!param.source_url;
  const raw = verified ? param.value : param.playtest_value;
  if (typeof raw !== 'number') {
    throw new Error(`params.json: "${name}" has no numeric value to use`);
  }
  return { value: raw, verified };
}
