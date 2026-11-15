import Phaser from 'phaser';
import { SPRITES } from '../assets';
import { TILE } from './constants';

/**
 * Draws the terrain with the ground tiles (surface on top, rock below) and creates one
 * static physics body per column (cheaper than one body per tile). Returns the group for collisions.
 * Blitters draw thousands of tiles in a single batch.
 */
export function buildTerrain(
  scene: Phaser.Scene,
  heights: number[],
  worldHeight: number,
): Phaser.Physics.Arcade.StaticGroup {
  const surface = scene.add.blitter(0, 0, SPRITES.groundTop);
  const rock = scene.add.blitter(0, 0, SPRITES.groundRock);
  const group = scene.physics.add.staticGroup();

  heights.forEach((h, col) => {
    const x = col * TILE;
    const topY = worldHeight - h * TILE;
    surface.create(x, topY);
    for (let row = 1; row < h; row++) rock.create(x, topY + row * TILE);

    const body = scene.add.zone(x + TILE / 2, topY + (h * TILE) / 2, TILE, h * TILE);
    group.add(body);
  });

  return group;
}

/** Y coordinate (top of the ground) at a given world x. */
export function surfaceY(heights: number[], worldHeight: number, x: number): number {
  const col = Phaser.Math.Clamp(Math.floor(x / TILE), 0, heights.length - 1);
  return worldHeight - heights[col] * TILE;
}
