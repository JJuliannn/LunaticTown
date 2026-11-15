import Phaser from 'phaser';
import { COLORS, FONT, TEXT } from './theme';

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 260,
  height = 56,
): Phaser.GameObjects.Container {
  const bg = scene.add
    .rectangle(0, 0, width, height, COLORS.panel)
    .setStrokeStyle(2, COLORS.accent);
  const text = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: '22px', color: TEXT.primary })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]);

  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setFillStyle(COLORS.panelHover))
    .on('pointerout', () => bg.setFillStyle(COLORS.panel))
    .on('pointerup', onClick);

  return container;
}

/** Horizontal bar for a 0-1 ratio, with label on the left. */
export function addBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  ratio: number,
  width = 180,
): Phaser.GameObjects.GameObject[] {
  const clamped = Phaser.Math.Clamp(ratio, 0, 1);
  const labelText = scene.add.text(x, y, label, {
    fontFamily: FONT,
    fontSize: '20px',
    color: TEXT.muted,
  });
  const barX = x + 150;
  const track = scene.add.rectangle(barX, y + 10, width, 10, COLORS.barTrack).setOrigin(0, 0.5);
  const fill = scene.add
    .rectangle(barX, y + 10, width * clamped, 10, COLORS.barFill)
    .setOrigin(0, 0.5);
  return [labelText, track, fill];
}

/** Small starfield so screens are not a flat color. */
export function addStars(scene: Phaser.Scene, count = 120): void {
  const g = scene.add.graphics();
  const { width, height } = scene.scale;
  for (let i = 0; i < count; i++) {
    g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
    g.fillCircle(
      Phaser.Math.Between(0, width),
      Phaser.Math.Between(0, height),
      Phaser.Math.FloatBetween(0.5, 1.6),
    );
  }
}
