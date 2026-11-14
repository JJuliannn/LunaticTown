import Phaser from 'phaser';
import { PLAYER } from './constants';

type Keys = Record<'left' | 'right' | 'up' | 'a' | 'd' | 'w' | 'space', Phaser.Input.Keyboard.Key>;

/**
 * Astronaut controlled by the player. For now it is only its hitbox
 * (a rectangle) plus a small visor that shows which way it faces.
 * Replace the rectangle with a sprite in milestone 3; the physics body stays.
 */
export class Player {
  readonly body: Phaser.GameObjects.Rectangle;
  private readonly visor: Phaser.GameObjects.Rectangle;
  private readonly keys: Keys;
  private facing: 1 | -1 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.add
      .rectangle(x, y, PLAYER.width, PLAYER.height, 0xffffff, 0.15)
      .setStrokeStyle(2, 0x7fffa0);
    scene.physics.add.existing(this.body);
    this.arcade.setCollideWorldBounds(true);
    this.arcade.setGravityY(PLAYER.gravity);

    this.visor = scene.add.rectangle(x, y, 8, 6, 0x7fb2ff);

    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as Keys;
  }

  private get arcade(): Phaser.Physics.Arcade.Body {
    return this.body.body as Phaser.Physics.Arcade.Body;
  }

  update(): void {
    const k = this.keys;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const jump = k.up.isDown || k.w.isDown || k.space.isDown;

    if (left === right) {
      this.arcade.setVelocityX(0);
    } else {
      this.facing = left ? -1 : 1;
      this.arcade.setVelocityX(PLAYER.speed * this.facing);
    }

    if (jump && this.arcade.blocked.down) {
      this.arcade.setVelocityY(-PLAYER.jumpVelocity);
    }

    this.visor.setPosition(
      this.body.x + this.facing * (PLAYER.width / 2 - 5),
      this.body.y - PLAYER.height / 2 + 10,
    );
  }
}
