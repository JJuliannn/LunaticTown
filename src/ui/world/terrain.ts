import Phaser from 'phaser';
import { TERRAIN_STYLE, TILE } from './constants';

/**
 * Draws the terrain as tiles and creates one static physics body per column
 * (cheaper than one body per tile). Returns the group for collisions.
 */
export function buildTerrain(
  scene: Phaser.Scene,
  heights: number[],
  worldHeight: number,
): Phaser.Physics.Arcade.StaticGroup {
  const g = scene.add.graphics();
  const group = scene.physics.add.staticGroup();

  heights.forEach((h, col) => {
    const x = col * TILE;
    const topY = worldHeight - h * TILE;

    for (let row = 0; row < h; row++) {
      const y = topY + row * TILE;
      g.fillStyle(row === 0 ? TERRAIN_STYLE.surface : TERRAIN_STYLE.rock);
      g.fillRect(x, y, TILE, TILE);
      g.lineStyle(1, TERRAIN_STYLE.outline);
      g.strokeRect(x, y, TILE, TILE);
    }

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
