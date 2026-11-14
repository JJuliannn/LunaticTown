import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../theme';
import { addButton, addStars } from '../widgets';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);
    addStars(this);

    const cx = GAME_WIDTH / 2;

    // Placeholder Moon until we have art.
    this.add.circle(cx, 230, 110, 0xb9bcc4);
    this.add.circle(cx - 35, 200, 22, 0x9fa3ad);
    this.add.circle(cx + 40, 260, 16, 0x9fa3ad);
    this.add.circle(cx + 20, 175, 10, 0x9fa3ad);

    this.add
      .text(cx, 400, 'Lunatic Town', { fontFamily: FONT, fontSize: '64px', color: TEXT.primary })
      .setOrigin(0.5);
    this.add
      .text(cx, 455, 'Gestiona una base lunar y mantén viva a tu tripulación', {
        fontFamily: FONT,
        fontSize: '22px',
        color: TEXT.muted,
      })
      .setOrigin(0.5);

    addButton(this, cx, 550, 'Iniciar partida', () => this.scene.start('ZoneSelect'));

    this.add
      .text(cx, GAME_HEIGHT - 30, 'NASA Space Apps Challenge · Reto 03', {
        fontFamily: FONT,
        fontSize: '14px',
        color: TEXT.muted,
      })
      .setOrigin(0.5);
  }
}
