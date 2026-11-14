import Phaser from 'phaser';
import { buildMoonScenario } from '../../scenarios/moon';
import { createInitialState } from '../../sim/state';
import { generateTerrain } from '../../sim/terrain';
import type { GameState, ZoneConfig, ZoneId } from '../../sim/types';
import { Hud } from '../hud';
import { COLORS, FONT, GAME_HEIGHT, TEXT } from '../theme';
import { BASE_MODULE, PLAYER, TILE, WORLD_COLUMNS } from '../world/constants';
import { Player } from '../world/Player';
import { buildTerrain, surfaceY } from '../world/terrain';

// Terrain shape per zone. Game design values, not real topography (LOLA later).
const ZONE_TERRAIN: Record<ZoneId, { seed: number; amplitude: number }> = {
  south_pole: { seed: 1101, amplitude: 6 },
  equator: { seed: 2202, amplitude: 3 },
};

/** Side-view game screen: terrain, base module and the player hitbox. */
export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private zone!: ZoneConfig;
  private player!: Player;

  constructor() {
    super('Game');
  }

  init(data: { zoneId: ZoneId }): void {
    const scenario = buildMoonScenario();
    this.zone = scenario.zones[data.zoneId];
    this.state = createInitialState(scenario, data.zoneId);
  }

  create(): void {
    const worldWidth = WORLD_COLUMNS * TILE;
    const worldHeight = GAME_HEIGHT;

    this.cameras.main.setBackgroundColor(COLORS.background);
    this.addParallaxStars(worldWidth);

    const terrainShape = ZONE_TERRAIN[this.zone.id];
    const heights = generateTerrain({
      seed: terrainShape.seed,
      columns: WORLD_COLUMNS,
      baseHeight: 6,
      amplitude: terrainShape.amplitude,
      flatRadius: BASE_MODULE.widthTiles,
    });
    const ground = buildTerrain(this, heights, worldHeight);

    const centerX = worldWidth / 2;
    this.addBaseModule(centerX, surfaceY(heights, worldHeight, centerX));

    const spawnX = centerX + BASE_MODULE.widthTiles * TILE;
    this.player = new Player(this, spawnX, surfaceY(heights, worldHeight, spawnX) - PLAYER.height);
    this.physics.add.collider(this.player.body, ground);

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player.body, true, 0.1, 0.1);

    new Hud(this, this.zone).refresh(this.state);

    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  update(): void {
    this.player.update();
  }

  private addBaseModule(centerX: number, groundY: number): void {
    const w = BASE_MODULE.widthTiles * TILE;
    const h = BASE_MODULE.heightTiles * TILE;
    // Placeholder: outline of the habitat. No collision, the player walks in front of it.
    this.add.rectangle(centerX, groundY - h / 2, w, h, BASE_MODULE.color, 0.12).setStrokeStyle(2, BASE_MODULE.color);
    this.add
      .text(centerX, groundY - h / 2, 'BASE', { fontFamily: FONT, fontSize: '18px', color: TEXT.muted })
      .setOrigin(0.5);
  }

  private addParallaxStars(worldWidth: number): void {
    const g = this.add.graphics().setScrollFactor(0.2);
    const span = worldWidth * 0.2 + this.scale.width;
    for (let i = 0; i < 220; i++) {
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      g.fillCircle(Phaser.Math.Between(0, span), Phaser.Math.Between(0, GAME_HEIGHT * 0.7), Phaser.Math.FloatBetween(0.5, 1.5));
    }
  }
}
