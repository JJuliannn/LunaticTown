import Phaser from 'phaser';
import { buildMoonScenario, ZONE_IDS } from '../../scenarios/moon';
import type { ZoneConfig } from '../../sim/types';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../theme';
import { addBar, addButton, addStars } from '../widgets';

const CARD_W = 440;
const CARD_H = 380;

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
      .text(cx, 70, 'Elige dónde construir la base', {
        fontFamily: FONT,
        fontSize: '40px',
        color: TEXT.primary,
      })
      .setOrigin(0.5);

    const gap = 60;
    const startX = cx - (ZONE_IDS.length * CARD_W + (ZONE_IDS.length - 1) * gap) / 2 + CARD_W / 2;
    ZONE_IDS.forEach((id, i) => {
      this.addZoneCard(startX + i * (CARD_W + gap), 340, scenario.zones[id]);
    });

    const anyUnverified = ZONE_IDS.some((id) => hasUnverified(scenario.zones[id]));
    if (anyUnverified) {
      this.add
        .text(cx, 580, '* Valores de prueba del juego. Todavía no son datos verificados de la NASA.', {
          fontFamily: FONT,
          fontSize: '15px',
          color: TEXT.warning,
        })
        .setOrigin(0.5);
    }

    addButton(this, cx, GAME_HEIGHT - 60, 'Volver', () => this.scene.start('Menu'), 180, 44);
  }

  private addZoneCard(x: number, y: number, zone: ZoneConfig): void {
    const card = this.add
      .rectangle(x, y, CARD_W, CARD_H, COLORS.panel)
      .setStrokeStyle(2, COLORS.border)
      .setInteractive({ useHandCursor: true });

    const left = x - CARD_W / 2 + 30;
    const top = y - CARD_H / 2 + 25;

    this.add.text(left, top, zone.nameEs, { fontFamily: FONT, fontSize: '30px', color: TEXT.primary });
    const unverifiedMark = hasUnverified(zone) ? ' *' : '';
    this.add.text(left, top + 45, `Latitud: ${zone.latitudeDeg.value}°${unverifiedMark}`, {
      fontFamily: FONT,
      fontSize: '16px',
      color: TEXT.muted,
    });

    addBar(this, left, top + 100, 'Horas de luz', zone.sunlightShare.value);
    addBar(this, left, top + 140, 'Calor de día', zone.dayHeatPeak.value / 100);
    addBar(this, left, top + 180, 'Calor de noche', zone.nightHeatFloor.value / 100);
    addBar(this, left, top + 220, 'Radiación', zone.radiationFactor.value / 2);

    this.add
      .text(x, y + CARD_H / 2 - 40, 'Elegir zona', { fontFamily: FONT, fontSize: '20px', color: TEXT.accent })
      .setOrigin(0.5);

    card
      .on('pointerover', () => card.setStrokeStyle(3, COLORS.accent))
      .on('pointerout', () => card.setStrokeStyle(2, COLORS.border))
      .on('pointerup', () => this.scene.start('Game', { zoneId: zone.id }));
  }
}

function hasUnverified(zone: ZoneConfig): boolean {
  return [zone.latitudeDeg, zone.sunlightShare, zone.dayHeatPeak, zone.nightHeatFloor, zone.radiationFactor].some(
    (p) => !p.verified,
  );
}
