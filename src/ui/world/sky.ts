import Phaser from 'phaser';
import type { SunState } from '../../sim/sun';
import { GAME_HEIGHT, GAME_WIDTH } from '../theme';

// Screen-space path of the Sun. The horizon sits above the station labels so a low polar Sun never covers them.
const HORIZON_Y = 320;
const ARC_HEIGHT = 250;
const NIGHT_ALPHA = 0.6;
/** Screen height of the polar Sun above the horizon line (it stays low). */
const POLAR_SUN_HEIGHT = 30;

/**
 * Sun disk that crosses the screen with the lunar local hour, plus a dark veil
 * over the world at night. The lunar sky stays black: there is no atmosphere.
 */
export class Sky {
  private readonly sun: Phaser.GameObjects.Arc;
  private readonly veil: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.sun = scene.add.circle(0, 0, 26, 0xfff4c2).setScrollFactor(0).setDepth(-1);
    this.veil = scene.add
      // Opaque fill; the darkness is controlled with the object's alpha in update().
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000008, 1)
      .setAlpha(0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(50);
  }

  /**
   * @param opts.shaded the astronaut is somewhere the Sun never reaches (crater floor): dark, no Sun disk.
   * @param opts.polar continuous polar light: the Sun circles just above the horizon all cycle.
   * @param opts.eclipse polar eclipse under way: no Sun.
   */
  update(sun: SunState, opts: { shaded?: boolean; polar?: boolean; eclipse?: boolean } = {}): void {
    if (opts.polar) {
      // The Sun goes all the way around the sky once per cycle, skimming the horizon.
      const x = (((sun.localHour + 6) % 24) / 24) * GAME_WIDTH;
      const visible = !opts.shaded && !opts.eclipse;
      this.sun.setPosition(x, HORIZON_Y - POLAR_SUN_HEIGHT).setVisible(visible);
      this.veil.setAlpha(visible ? 0 : NIGHT_ALPHA);
      return;
    }
    // Hour 6 = left edge, 12 = center, 18 = right edge. Height follows the Sun's elevation.
    const x = ((sun.localHour - 6) / 12) * GAME_WIDTH;
    const y = HORIZON_Y - Math.max(0, sun.cosIncidence) * ARC_HEIGHT;
    this.sun.setPosition(x, y).setVisible(sun.isDay && !opts.shaded);

    // Fade in/out over roughly the half hour around sunrise and sunset.
    const light = opts.shaded ? 0 : Phaser.Math.Clamp(sun.cosIncidence / 0.12 + 0.5, 0, 1);
    this.veil.setAlpha(NIGHT_ALPHA * (1 - light));
  }
}
