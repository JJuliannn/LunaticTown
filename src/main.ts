import Phaser from 'phaser';
import { GameScene } from './ui/scenes/GameScene';
import { MenuScene } from './ui/scenes/MenuScene';
import { ZoneSelectScene } from './ui/scenes/ZoneSelectScene';
import { COLORS, FONT_FACE, GAME_HEIGHT, GAME_WIDTH } from './ui/theme';

/** Phaser draws text on a canvas once, so the font must be ready before the first scene. */
async function waitForFont(): Promise<void> {
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
  try {
    await Promise.race([document.fonts.load(`700 16px "${FONT_FACE}"`).then(() => undefined), timeout]);
  } catch {
    // Without the font the game still works with the fallback.
  }
}

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
