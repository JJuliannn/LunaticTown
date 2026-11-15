import Phaser from 'phaser';
import { ANIMS, SPRITE_SCALE, SPRITES } from '../assets';
import { PLAYER } from './constants';

type Keys = Record<'left' | 'right' | 'up' | 'a' | 'd' | 'w' | 'space', Phaser.Input.Keyboard.Key>;

/**
 * Astronaut controlled by the player. The physics body is an invisible rectangle (the hitbox);
 * the animated sprite follows it with its feet on the bottom of the hitbox.
 */
export class Player {
  readonly body: Phaser.GameObjects.Rectangle;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly keys: Keys;
  private facing: 1 | -1 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.add.rectangle(x, y, PLAYER.width, PLAYER.height, 0xffffff, 0);
    scene.physics.add.existing(this.body);
    this.arcade.setCollideWorldBounds(true);
    this.arcade.setGravityY(PLAYER.gravity);

    this.sprite = scene.add.sprite(x, y, SPRITES.astronaut, 0).setOrigin(0.5, 1).setScale(SPRITE_SCALE).setDepth(5);
    this.sprite.play(ANIMS.idle);

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

  /**
   * @param opts.frozen working: the astronaut stands still (work animation).
   * @param opts.speedFactor below 1 when injured.
   * @returns true if a movement key is pressed (used to cancel work).
   */
  update(opts: { frozen?: boolean; speedFactor?: number } = {}): boolean {
    const k = this.keys;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const jump = k.up.isDown || k.w.isDown || k.space.isDown;
    const moving = left || right || jump;
    const walking = !opts.frozen && left !== right;

    if (walking) {
      this.facing = left ? -1 : 1;
      this.arcade.setVelocityX(PLAYER.speed * (opts.speedFactor ?? 1) * this.facing);
    } else {
      this.arcade.setVelocityX(0);
    }

    const onGround = this.arcade.blocked.down;
    if (!opts.frozen && jump && onGround) {
      this.arcade.setVelocityY(-PLAYER.jumpVelocity);
    }

    this.sprite.setPosition(this.body.x, this.body.y + PLAYER.height / 2).setFlipX(this.facing < 0);
    const anim = opts.frozen ? ANIMS.work : !onGround ? ANIMS.jump : walking ? ANIMS.walk : ANIMS.idle;
    this.sprite.play(anim, true);
    // Injured: the walk animation slows down too.
    this.sprite.anims.timeScale = opts.speedFactor ?? 1;
    return moving;
  }
}
