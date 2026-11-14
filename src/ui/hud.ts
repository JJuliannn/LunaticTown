import Phaser from 'phaser';
import type { GameState, ZoneConfig } from '../sim/types';
import { COLORS, FONT, GAME_WIDTH, TEXT } from './theme';
import { addBar } from './widgets';

/** Fixed-to-screen overlay with the base resources. Rebuilt on refresh(). */
export class Hud {
  private objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly zone: ZoneConfig) {}

  refresh(state: GameState): void {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    const s = this.scene;

    const panel = s.add.rectangle(12, 12, 360, 250, COLORS.panel, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.border);
    this.objects.push(panel);

    const r = state.resources;
    const rows: [string, number][] = [
      ['Energía', r.energy],
      ['O₂ tanques', r.oxygenTanks],
      ['O₂ producción', r.oxygenProduction],
      ['Agua', r.water],
      ['Comida', r.food],
      ['Nitrógeno', r.nitrogen],
    ];
    this.objects.push(s.add.text(28, 22, 'Base', { fontFamily: FONT, fontSize: '18px', color: TEXT.accent }));
    rows.forEach(([label, v], i) => this.objects.push(...addBar(s, 28, 56 + i * 32, label, v / 100, 160)));

    this.objects.push(
      s.add
        .text(GAME_WIDTH - 20, 20, `${this.zone.nameEs} · Hora ${state.hour}`, {
          fontFamily: FONT,
          fontSize: '20px',
          color: TEXT.primary,
        })
        .setOrigin(1, 0),
      s.add
        .text(GAME_WIDTH - 20, 48, '← → / A D: moverse · ↑ / W / Espacio: saltar · Esc: menú', {
          fontFamily: FONT,
          fontSize: '14px',
          color: TEXT.muted,
        })
        .setOrigin(1, 0),
    );

    this.objects.forEach((o) => (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0));
    this.objects.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(100));
  }
}
