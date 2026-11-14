// Side-view world settings. All values are game feel (pixels, px/s), not real physics.

export const TILE = 32;
export const WORLD_COLUMNS = 120;

export const PLAYER = {
  width: 22,
  height: 44,
  speed: 200,
  jumpVelocity: 380,
  /** Low gravity so jumps feel floaty. Tuned by hand, not a real lunar value. */
  gravity: 500,
};

export const TERRAIN_STYLE = {
  surface: 0x9a9da6,
  rock: 0x5d606a,
  outline: 0x3d3f47,
};

export const BASE_MODULE = {
  widthTiles: 6,
  heightTiles: 3,
  color: 0xd8dde8,
};
