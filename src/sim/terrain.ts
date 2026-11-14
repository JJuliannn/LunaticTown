// Pure terrain generation for the side view. Returns surface height (in tiles,
// measured from the bottom of the world) for each column. No rendering here.

export interface TerrainOptions {
  seed: number;
  columns: number;
  baseHeight: number;
  amplitude: number;
  /** Columns around the center kept flat for the base. */
  flatRadius: number;
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
  const centerHeight = opts.baseHeight;

  const heights: number[] = [];
  for (let x = 0; x < opts.columns; x++) {
    const noise = waves.reduce((s, w) => s + Math.sin(x * w.freq + w.phase) * w.weight, 0) / totalWeight;
    let h = Math.round(opts.baseHeight + noise * opts.amplitude);
    const dist = Math.abs(x - center);
    if (dist <= opts.flatRadius) {
      h = centerHeight;
    } else if (dist <= opts.flatRadius + 4) {
      // Blend from flat pad into the hills.
      const t = (dist - opts.flatRadius) / 4;
      h = Math.round(centerHeight * (1 - t) + h * t);
    }
    heights.push(Math.max(1, h));
  }
  return heights;
}
