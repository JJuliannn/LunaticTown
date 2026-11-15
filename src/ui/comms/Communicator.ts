import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../theme';

const W = 760;
const H = 104;
const DEPTH = 110;
/** One-way radio delay Earth-Moon, ~2.5 s round trip (Kessler et al. 2022). Shown as "receiving". */
const SIGNAL_DELAY_MS = 2500;
/** An event message closes by itself after this long if the player does not press Enter. */
const AUTO_CLOSE_MS = 20000;

interface Incoming {
  textEs: string;
  /** ms until it can be read. */
  delayMs: number;
}

/**
 * The ship's communicator: the radio link with Mission Control on Earth, bottom center.
 * It shows event messages one at a time (Enter for the next one) and, when there is nothing
 * new, the current tutorial step.
 */
export class Communicator {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly header: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly footer: Phaser.GameObjects.Text;
  private readonly queue: Incoming[] = [];
  private shownMs = 0;
  private tutorialEs: string | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    const x = GAME_WIDTH / 2;
    const top = GAME_HEIGHT - H - 10;
    this.panel = scene.add.rectangle(x, top, W, H, COLORS.panel, 0.94).setOrigin(0.5, 0).setStrokeStyle(2, COLORS.accent);
    const left = x - W / 2 + 14;
    this.header = scene.add.text(left, top + 8, '', { fontFamily: FONT, fontSize: '12px', color: TEXT.accent, fontStyle: 'bold' });
    this.body = scene.add.text(left, top + 28, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: TEXT.primary,
      wordWrap: { width: W - 28 },
      lineSpacing: 2,
    });
    this.footer = scene.add
      .text(x + W / 2 - 14, top + 8, '', { fontFamily: FONT, fontSize: '12px', color: TEXT.muted })
      .setOrigin(1, 0);
    [this.panel, this.header, this.body, this.footer].forEach((o) => o.setScrollFactor(0).setDepth(DEPTH));
    this.render();
  }

  /** A message from Mission Control. Arrives after the radio delay. */
  push(textEs: string): void {
    this.queue.push({ textEs, delayMs: SIGNAL_DELAY_MS });
    if (this.queue.length === 1) this.shownMs = 0;
  }

  /** Current tutorial step, shown when there are no messages. Null when the tutorial is over. */
  setTutorial(textEs: string | null): void {
    this.tutorialEs = textEs;
  }

  /** Enter: next message. */
  next(): void {
    if (this.queue.length > 0 && this.queue[0].delayMs <= 0) {
      this.queue.shift();
      this.shownMs = 0;
    }
  }

  update(deltaMs: number): void {
    const current = this.queue[0];
    if (current) {
      if (current.delayMs > 0) current.delayMs -= deltaMs;
      else {
        this.shownMs += deltaMs;
        if (this.shownMs > AUTO_CLOSE_MS) this.next();
      }
    }
    this.render();
  }

  private render(): void {
    const current = this.queue[0];
    const visible = current !== undefined || this.tutorialEs !== null;
    [this.panel, this.header, this.body, this.footer].forEach((o) => o.setVisible(visible));
    if (!visible) return;

    if (current) {
      // A new message blinks the border until read.
      const blink = current.delayMs > 0 || this.shownMs < 1500;
      const on = !blink || Math.floor(this.scene.time.now / 250) % 2 === 0;
      this.panel.setStrokeStyle(2, on ? COLORS.warning : COLORS.accent);
      this.header.setText('📡 CONTROL DE MISIÓN · TIERRA');
      if (current.delayMs > 0) {
        this.body.setText('Recibiendo señal… (la radio tarda unos segundos en ir y volver entre la Tierra y la Luna)');
        this.footer.setText('');
      } else {
        this.body.setText(current.textEs);
        const more = this.queue.length - 1;
        this.footer.setText(`[Enter] ${more > 0 ? `siguiente (${more} más)` : 'cerrar'}`);
      }
      return;
    }
    this.panel.setStrokeStyle(2, COLORS.accent);
    this.header.setText('📡 CONTROL DE MISIÓN · TIERRA · tutorial');
    this.body.setText(this.tutorialEs ?? '');
    this.footer.setText('');
  }
}
