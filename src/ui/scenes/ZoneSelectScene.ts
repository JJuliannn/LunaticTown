import Phaser from 'phaser';
import { buildMoonScenario, ZONE_IDS } from '../../scenarios/moon';
import { zoneSurfaceKelvin, zoneTemperatureVerified } from '../../sim/temperature';
import type { TemperatureModel, ZoneConfig } from '../../sim/types';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../theme';
import { addBar, addButton, addStars } from '../widgets';

const CARD_W = 370;
const CARD_H = 420;
const CARD_GAP = 30;

const DIFFICULTY_COLOR: Record<string, string> = {
  Normal: '#7fffa0',
  Difícil: '#ffc857',
  Hardcore: '#ff5d5d',
};

export class ZoneSelectScene extends Phaser.Scene {
  constructor() {
    super('ZoneSelect');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);
    addStars(this, 80);

    const scenario = buildMoonScenario();
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 60, 'Elige dónde construir la base', { fontFamily: FONT, fontSize: '40px', color: TEXT.primary })
      .setOrigin(0.5);

    const startX = cx - (ZONE_IDS.length * CARD_W + (ZONE_IDS.length - 1) * CARD_GAP) / 2 + CARD_W / 2;
    ZONE_IDS.forEach((id, i) => {
      this.addZoneCard(startX + i * (CARD_W + CARD_GAP), 335, scenario.zones[id], scenario.temperature);
    });

    const zones = ZONE_IDS.map((id) => scenario.zones[id]);
    const anyUnverified = zones.some((z) => !zoneTemperatureVerified(scenario.temperature, z) || !z.radiationFactor.verified);
    if (anyUnverified) {
      this.add
        .text(
          cx,
          578,
          '* Temperaturas según un modelo basado en Diviner, pendientes de revisión. El fondo del cráter y la radiación son valores de prueba.',
          { fontFamily: FONT, fontSize: '14px', color: TEXT.warning, align: 'center', wordWrap: { width: GAME_WIDTH - 120 } },
        )
        .setOrigin(0.5, 0);
    }

    addButton(this, cx, GAME_HEIGHT - 50, 'Volver', () => this.scene.start('Menu'), 180, 44);
  }

  private addZoneCard(x: number, y: number, zone: ZoneConfig, model: TemperatureModel): void {
    const card = this.add
      .rectangle(x, y, CARD_W, CARD_H, COLORS.panel)
      .setStrokeStyle(2, COLORS.border)
      .setInteractive({ useHandCursor: true });

    const left = x - CARD_W / 2 + 24;
    const top = y - CARD_H / 2 + 20;
    const width = CARD_W - 48;

    this.add.text(left, top, zone.nameEs, { fontFamily: FONT, fontSize: '28px', color: TEXT.primary });
    this.add.text(left, top + 40, `Latitud: ${zone.latitudeDeg.value}°`, { fontFamily: FONT, fontSize: '15px', color: TEXT.muted });
    this.add.text(left + width, top + 40, zone.difficultyEs, {
      fontFamily: FONT,
      fontSize: '15px',
      fontStyle: 'bold',
      color: DIFFICULTY_COLOR[zone.difficultyEs] ?? TEXT.primary,
    }).setOrigin(1, 0);

    const mark = zoneTemperatureVerified(model, zone) ? '' : ' *';
    const celsius = (hour: number) => (zoneSurfaceKelvin(model, zone, hour) - 273.15).toFixed(0);
    const rows = zone.permanentShadow
      ? [`Siempre: ${celsius(12)} °C${mark}`, 'Nunca sale el Sol en el fondo']
      : [`Mediodía: ${celsius(12)} °C${mark}`, `Antes del amanecer: ${celsius(5)} °C${mark}`];
    rows.forEach((row, i) =>
      this.add.text(left, top + 80 + i * 30, row, { fontFamily: FONT, fontSize: '18px', color: TEXT.primary }),
    );

    this.add.text(left, top + 150, zone.summaryEs, {
      fontFamily: FONT,
      fontSize: '15px',
      color: TEXT.muted,
      wordWrap: { width },
      lineSpacing: 3,
    });
    addBar(this, left, top + 265, 'Radiación', zone.radiationFactor.value / 2);

    this.add
      .text(x, y + CARD_H / 2 - 36, 'Elegir zona', { fontFamily: FONT, fontSize: '20px', color: TEXT.accent })
      .setOrigin(0.5);

    card
      .on('pointerover', () => card.setStrokeStyle(3, COLORS.accent))
      .on('pointerout', () => card.setStrokeStyle(2, COLORS.border))
      .on('pointerup', () => this.scene.start('Game', { zoneId: zone.id }));
  }
}
