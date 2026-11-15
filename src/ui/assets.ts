import Phaser from 'phaser';
import type { BuildingId } from '../sim/types';

// Sprites in assets/sprites/. The current PNGs are placeholders made by tools/make_sprites.py.
// To use final art, replace a PNG with one of the SAME size (or change the size here and the scale in the code).

/** Art is drawn at half size and shown at 2x, with no smoothing (pixelArt in main.ts). */
export const SPRITE_SCALE = 2;

export const SPRITES = {
  groundTop: 'ground_top', // 32x32, one tile (already at full size)
  groundRock: 'ground_rock', // 32x32
  sun: 'sun', // 32x32
  astronaut: 'astronaut', // spritesheet, 16x24 frames: idle, walk1, walk2, jump, work1, work2
  ship: 'ship', // 96x48, arrival ship before dismantling
  base: 'base', // 96x48, the hull as a base
  supplyShip: 'supply_ship', // 32x32
  lab: 'lab', // 48x32
  shelter: 'shelter', // 48x24: rows 0-7 above ground, 8-23 below
} as const;

/** One 48x32 sprite per station, named like its id. */
export const STATION_SPRITE: Record<BuildingId, string> = {
  solar_panels: 'solar_panels',
  oxygenator: 'oxygenator',
  ice_extractor: 'ice_extractor',
  waste_processor: 'waste_processor',
  hydroponics: 'hydroponics',
  cricket_farm: 'cricket_farm',
};

export const ASTRONAUT_FRAME = { width: 16, height: 24 };

export function loadGameAssets(scene: Phaser.Scene): void {
  const images = [...Object.values(SPRITES).filter((k) => k !== SPRITES.astronaut), ...Object.values(STATION_SPRITE)];
  for (const key of images) scene.load.image(key, `sprites/${key}.png`);
  scene.load.spritesheet(SPRITES.astronaut, `sprites/${SPRITES.astronaut}.png`, {
    frameWidth: ASTRONAUT_FRAME.width,
    frameHeight: ASTRONAUT_FRAME.height,
  });
}

export const ANIMS = { idle: 'astro-idle', walk: 'astro-walk', jump: 'astro-jump', work: 'astro-work' } as const;

/** Animations are global; created once. */
export function createAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists(ANIMS.idle)) return;
  const frames = (list: number[]) => list.map((frame) => ({ key: SPRITES.astronaut, frame }));
  scene.anims.create({ key: ANIMS.idle, frames: frames([0]), frameRate: 1 });
  scene.anims.create({ key: ANIMS.walk, frames: frames([1, 0, 2, 0]), frameRate: 8, repeat: -1 });
  scene.anims.create({ key: ANIMS.jump, frames: frames([3]), frameRate: 1 });
  scene.anims.create({ key: ANIMS.work, frames: frames([4, 5]), frameRate: 4, repeat: -1 });
}
