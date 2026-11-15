import Phaser from 'phaser';
import { GameScene } from './ui/scenes/GameScene';
import { MenuScene } from './ui/scenes/MenuScene';
import { ZoneSelectScene } from './ui/scenes/ZoneSelectScene';
import { COLORS, FONT_FACE, GAME_HEIGHT, GAME_WIDTH } from './ui/theme';

/** Phaser draws text on a canvas once, so the font must be ready before the first scene. */
async function waitForFont(): Promise<void> {
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
  try {
    await Promise.race([document.fonts.load(`16px "${FONT_FACE}"`).then(() => undefined), timeout]);
  } catch {
    // Without the font the game still works with the fallback.
  }
}

/**
 * Pixel fonts can ship ligatures (Pixelify Sans had an "fi" that looked like an "A"). Keep text letter by letter.
 * Canvas text has no font-variant-ligatures, but textRendering = 'optimizeSpeed' turns ligatures off (Chrome, Edge).
 */
function disableLigatures(): void {
  const proto = Phaser.GameObjects.TextStyle.prototype;
  const syncFont = proto.syncFont;
  proto.syncFont = function (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    syncFont.call(this, canvas, context);
    (context as CanvasRenderingContext2D & { textRendering?: string }).textRendering = 'optimizeSpeed';
  };
}

disableLigatures();

waitForFont().then(() => {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORS.background,
    // Pixel art: scale textures without smoothing.
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [MenuScene, ZoneSelectScene, GameScene],
  });
});
