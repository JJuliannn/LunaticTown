import Phaser from 'phaser';
import { COLORS, FONT, TEXT } from './theme';

const LABEL_W = 92;
const BAR_H = 12;
const DANGER_COLOR = 0xff5d5d;
const WARN_COLOR = 0xffc857;

export interface StatBarOptions {
  width: number;
  color: number;
  /** Below this ratio the bar turns amber; below half of it, red and blinking. */
  warnBelow?: number;
}

/**
 * A labeled bar for the HUD. Fixed to the screen. The fill slides toward its new value
 * instead of jumping, and turns amber/red when low so trouble is visible at a glance.
 */
export class StatBar {
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly valueText: Phaser.GameObjects.Text;
  private readonly objects: Phaser.GameObjects.GameObject[];
  private shown = 0;
  private target = 0;
  private readonly barW: number;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    private readonly opts: StatBarOptions,
  ) {
    this.barW = opts.width - LABEL_W - 64;
    const barX = x + LABEL_W;
    const labelText = scene.add.text(x, y - 1, label, { fontFamily: FONT, fontSize: '14px', color: TEXT.muted });
    const track = scene.add.rectangle(barX, y + 8, this.barW, BAR_H, COLORS.barTrack).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(barX, y + 8, 0, BAR_H, opts.color).setOrigin(0, 0.5);
    const frame = scene.add.rectangle(barX, y + 8, this.barW, BAR_H).setOrigin(0, 0.5).setStrokeStyle(1, 0x000000, 0.5);
    this.valueText = scene.add.text(barX + this.barW + 8, y - 1, '', { fontFamily: FONT, fontSize: '14px', color: TEXT.primary });
    this.objects = [labelText, track, this.fill, frame, this.valueText];
  }

  setDepth(depth: number): this {
    this.objects.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(depth));
    this.objects.forEach((o) => (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0));
    return this;
  }

  /** ratio 0-1 and the short text shown to the right of the bar. */
  set(ratio: number, valueText: string): void {
    this.target = Phaser.Math.Clamp(ratio, 0, 1);
    this.valueText.setText(valueText);
  }

  /** Call every frame. */
  tick(deltaMs: number): void {
    // Ease toward the target; fast enough to feel live, slow enough to see the change.
    const t = 1 - Math.exp(-deltaMs / 120);
    this.shown += (this.target - this.shown) * t;
    this.fill.width = this.barW * this.shown;

    const warn = this.opts.warnBelow ?? 0;
    let color = this.opts.color;
    let alpha = 1;
    if (this.target < warn / 2) {
      color = DANGER_COLOR;
      alpha = 0.55 + 0.45 * Math.abs(Math.sin(this.scene.time.now / 220));
    } else if (this.target < warn) {
      color = WARN_COLOR;
    }
    this.fill.setFillStyle(color, alpha);
  }
}
