import Phaser from 'phaser';
import type { SunState } from '../../sim/sun';
import { GAME_HEIGHT, GAME_WIDTH } from '../theme';

// Screen-space path of the Sun. The horizon sits above the station labels so a low polar Sun never covers them.
const HORIZON_Y = 320;
const ARC_HEIGHT = 250;
const NIGHT_ALPHA = 0.6;

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

  /** @param shaded the astronaut is somewhere the Sun never reaches (crater floor): always dark, no Sun disk. */
  update(sun: SunState, shaded = false): void {
    // Hour 6 = left edge, 12 = center, 18 = right edge. Height follows the Sun's real elevation,
    // so at the pole it only skims the horizon.
    const x = ((sun.localHour - 6) / 12) * GAME_WIDTH;
    const y = HORIZON_Y - Math.max(0, sun.cosIncidence) * ARC_HEIGHT;
    this.sun.setPosition(x, y).setVisible(sun.isDay && !shaded);

    // Fade in/out over roughly the half hour around sunrise and sunset.
    const light = shaded ? 0 : Phaser.Math.Clamp(sun.cosIncidence / 0.12 + 0.5, 0, 1);
    this.veil.setAlpha(NIGHT_ALPHA * (1 - light));
  }
}
