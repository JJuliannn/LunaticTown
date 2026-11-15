import Phaser from 'phaser';
import type { GameState, ZoneConfig } from '../sim/types';
import { COLORS, FONT, GAME_WIDTH, TEXT } from './theme';
import { addBar } from './widgets';

const HUD_DEPTH = 100;

export interface EnvironmentReadout {
  localHour: number;
  isDay: boolean;
  cycleNumber: number;
  surfaceKelvin: number;
  /** False while the temperature model still needs a human check against its source. */
  temperatureVerified: boolean;
}

/** Fixed-to-screen overlay: base resources (left) and clock/environment (right). */
export class Hud {
  private resourceObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly clockText: Phaser.GameObjects.Text;
  private readonly envText: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene, zone: ZoneConfig) {
    const right = GAME_WIDTH - 20;
    const title = scene.add
      .text(right, 16, zone.nameEs, { fontFamily: FONT, fontSize: '20px', color: TEXT.accent })
      .setOrigin(1, 0);
    this.clockText = scene.add
      .text(right, 42, '', { fontFamily: FONT, fontSize: '20px', color: TEXT.primary })
      .setOrigin(1, 0);
    this.envText = scene.add
      .text(right, 70, '', { fontFamily: FONT, fontSize: '16px', color: TEXT.primary, align: 'right' })
      .setOrigin(1, 0);
    const help = scene.add
      .text(right, 118, '← → / A D: moverse · ↑ / W / Espacio: saltar · Esc: menú', {
        fontFamily: FONT,
        fontSize: '13px',
        color: TEXT.muted,
      })
      .setOrigin(1, 0);
    [title, this.clockText, this.envText, help].forEach((t) => t.setScrollFactor(0).setDepth(HUD_DEPTH));
  }

  /** Cheap, call every frame. */
  updateEnvironment(env: EnvironmentReadout): void {
    const hh = Math.floor(env.localHour);
    const mm = Math.floor((env.localHour - hh) * 60);
    const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    this.clockText.setText(`Ciclo ${env.cycleNumber} · Hora lunar ${clock} · ${env.isDay ? 'Día' : 'Noche'}`);

    const celsius = env.surfaceKelvin - 273.15;
    const mark = env.temperatureVerified ? '' : ' *';
    const note = env.temperatureVerified ? '' : '\n* Modelo basado en Diviner, pendiente de revisión';
    this.envText.setText(`Superficie: ${celsius.toFixed(0)} °C (${env.surfaceKelvin.toFixed(0)} K)${mark}${note}`);
  }

  /** Rebuilds the resource panel. Call only when resources change. */
  refreshResources(state: GameState): void {
    this.resourceObjects.forEach((o) => o.destroy());
    const s = this.scene;
    const objs: Phaser.GameObjects.GameObject[] = [];

    objs.push(s.add.rectangle(12, 12, 360, 250, COLORS.panel, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.border));
    objs.push(s.add.text(28, 22, 'Base', { fontFamily: FONT, fontSize: '18px', color: TEXT.accent }));

    const r = state.resources;
    const rows: [string, number][] = [
      ['Energía', r.energy],
      ['O₂ tanques', r.oxygenTanks],
      ['O₂ producción', r.oxygenProduction],
      ['Agua', r.water],
      ['Comida', r.food],
      ['Nitrógeno', r.nitrogen],
    ];
    rows.forEach(([label, v], i) => objs.push(...addBar(s, 28, 56 + i * 32, label, v / 100, 160)));

    objs.forEach((o) => {
      (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
      (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(HUD_DEPTH);
    });
    this.resourceObjects = objs;
  }
}
