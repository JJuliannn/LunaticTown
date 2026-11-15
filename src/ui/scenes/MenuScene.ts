import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../theme';
import { addButton, addStars } from '../widgets';

const LOGO_KEY = 'logo';
const LOGO_MAX_W = 640;
const LOGO_MAX_H = 340;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  preload(): void {
    // assets/logo.png. If it is missing, the menu falls back to a drawn placeholder.
    this.load.image(LOGO_KEY, 'logo.png');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);
    addStars(this);

    const cx = GAME_WIDTH / 2;

    if (this.textures.exists(LOGO_KEY)) {
      const logo = this.add.image(cx, 250, LOGO_KEY);
      logo.setScale(Math.min(1, LOGO_MAX_W / logo.width, LOGO_MAX_H / logo.height));
    } else {
      this.addPlaceholderLogo(cx);
    }
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

  private addPlaceholderLogo(cx: number): void {
    this.add.circle(cx, 200, 90, 0xb9bcc4);
    this.add.circle(cx - 30, 175, 18, 0x9fa3ad);
    this.add.circle(cx + 35, 225, 13, 0x9fa3ad);
    this.add.circle(cx + 18, 150, 8, 0x9fa3ad);
    this.add
      .text(cx, 345, 'Lunatic Town', { fontFamily: FONT, fontSize: '56px', color: TEXT.primary })
      .setOrigin(0.5);
  }
}
