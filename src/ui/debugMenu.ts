import Phaser from 'phaser';
import { DEBUG_EVENTS } from '../sim/debug';
import { COLORS, FONT, TEXT } from './theme';

const NUMBER_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

/**
 * Test menu for the general events. I opens it, 1-n triggers an event, X closes it.
 * The game keeps running while it is open.
 */
export class DebugMenu {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private open = false;

  /** @param onTrigger called with the index of the chosen event in DEBUG_EVENTS. */
  constructor(scene: Phaser.Scene, onTrigger: (index: number) => void) {
    const lines = [
      'PRUEBAS · eventos',
      ...DEBUG_EVENTS.slice(0, NUMBER_KEYS.length).map((e, i) => `${i + 1}  ${e.labelEs}`),
      '',
      'X  cerrar',
    ];
    this.text = scene.add.text(440, 140, lines.join('\n'), {
      fontFamily: FONT,
      fontSize: '15px',
      color: TEXT.primary,
      lineSpacing: 6,
    });
    const b = this.text.getBounds();
    this.panel = scene.add
      .rectangle(b.x - 16, b.y - 12, b.width + 32, b.height + 24, COLORS.panel, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.warning);
    this.panel.setScrollFactor(0).setDepth(200).setVisible(false);
    this.text.setScrollFactor(0).setDepth(201).setVisible(false);

    const kb = scene.input.keyboard!;
    kb.on('keydown-I', () => this.setOpen(true));
    kb.on('keydown-X', () => this.setOpen(false));
    NUMBER_KEYS.forEach((key, i) => {
      kb.on(`keydown-${key}`, () => {
        if (this.open && i < DEBUG_EVENTS.length) onTrigger(i);
      });
    });
  }

  private setOpen(open: boolean): void {
    this.open = open;
    this.panel.setVisible(open);
    this.text.setVisible(open);
  }
}
