// Pure terrain generation for the side view. Returns surface height (in tiles,
// measured from the bottom of the world) for each column. No rendering here.

export interface CraterOptions {
  /** Tiles the rim rises above the crater floor. */
  depth: number;
  /** Columns the wall takes to climb from the floor to the rim (one step per column). */
  wallWidth: number;
  /** Flat columns on top of the rim before the hills start. */
  rimWidth: number;
}

export interface TerrainOptions {
  seed: number;
  columns: number;
  baseHeight: number;
  amplitude: number;
  /** Columns around the center kept flat for the base. */
  flatRadius: number;
  /** When set, the flat pad is the floor of a crater and walls climb to a flat rim on both sides. */
  crater?: CraterOptions;
}

/** Small deterministic PRNG so the same zone always gets the same terrain. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function generateTerrain(opts: TerrainOptions): number[] {
  const rand = mulberry32(opts.seed);
  // Sum of a few sine waves with random phase: smooth hills, cheap and deterministic.
  const waves = [0.05, 0.11, 0.23].map((freq, i) => ({
    freq,
    phase: rand() * Math.PI * 2,
    weight: 1 / (i + 1),
  }));
  const totalWeight = waves.reduce((s, w) => s + w.weight, 0);
  const center = Math.floor(opts.columns / 2);
  const crater = opts.crater;

  const heights: number[] = [];
  for (let x = 0; x < opts.columns; x++) {
    const noise = (waves.reduce((s, w) => s + Math.sin(x * w.freq + w.phase) * w.weight, 0) / totalWeight) * opts.amplitude;
    const dist = Math.abs(x - center);
    let h: number;
    if (crater) {
      // Floor, then a stepped wall, then a flat rim, then hills fading in.
      const wallStart = opts.flatRadius + 1;
      const rise = Math.round(crater.depth * clamp01((dist - wallStart) / crater.wallWidth));
      const hillsStart = wallStart + crater.wallWidth + crater.rimWidth;
      h = Math.round(opts.baseHeight + rise + noise * clamp01((dist - hillsStart) / 4));
    } else {
      // Flat pad for the base, blended into the hills over 4 columns.
      h = Math.round(opts.baseHeight + noise * clamp01((dist - opts.flatRadius) / 4));
    }
    heights.push(Math.max(1, h));
  }
  return heights;
}
