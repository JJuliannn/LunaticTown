import Phaser from 'phaser';
import { GameScene } from './ui/scenes/GameScene';
import { MenuScene } from './ui/scenes/MenuScene';
import { ZoneSelectScene } from './ui/scenes/ZoneSelectScene';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './ui/theme';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scene: [MenuScene, ZoneSelectScene, GameScene],
});
