import Phaser from 'phaser';
import type { Work } from '../../sim/types';
import { FONT, TEXT } from '../theme';

const BAR_W = 90;
const BAR_H = 8;
const ABOVE = 46;

/** Progress bar and label over the astronaut while a task is in progress. */
export class WorkIndicator {
  private readonly track: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.track = scene.add.rectangle(0, 0, BAR_W, BAR_H, 0x000000, 0.6).setStrokeStyle(1, 0xffffff, 0.4).setDepth(60);
    this.fill = scene.add.rectangle(0, 0, 0, BAR_H, 0x7fffa0).setOrigin(0, 0.5).setDepth(61);
    this.label = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: TEXT.primary, backgroundColor: '#141824', padding: { x: 4, y: 2 } })
      .setOrigin(0.5, 1)
      .setDepth(61);
    this.update(null, 0, 0);
  }

  /** x, y: the astronaut's center. */
  update(work: Work | null, x: number, y: number): void {
    const visible = work !== null;
    this.track.setVisible(visible);
    this.fill.setVisible(visible);
    this.label.setVisible(visible);
    if (!work) return;
    const progress = 1 - work.hoursLeft / work.totalHours;
    const barY = y - ABOVE;
    this.track.setPosition(x, barY);
    this.fill.setPosition(x - BAR_W / 2, barY).setSize(BAR_W * Phaser.Math.Clamp(progress, 0, 1), BAR_H);
    this.label.setPosition(x, barY - 8).setText(`${work.labelEs} · moverse cancela`);
  }
}
