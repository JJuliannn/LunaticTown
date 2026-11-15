import Phaser from 'phaser';
import { buildMoonScenario } from '../../scenarios/moon';
import { createInitialState } from '../../sim/state';
import { step } from '../../sim/step';
import { LUNAR_HOURS_PER_CYCLE, localHourOf, sunAt } from '../../sim/sun';
import { surfaceTemperatureKelvin } from '../../sim/temperature';
import { generateTerrain } from '../../sim/terrain';
import type { GameState, ScenarioConfig, ZoneConfig, ZoneId } from '../../sim/types';
import { Hud } from '../hud';
import { COLORS, FONT, GAME_HEIGHT, TEXT } from '../theme';
import { BASE_MODULE, PLAYER, TILE, WORLD_COLUMNS } from '../world/constants';
import { Player } from '../world/Player';
import { Sky } from '../world/sky';
import { buildTerrain, surfaceY } from '../world/terrain';

// Terrain shape per zone. Game design values, not real topography (LOLA later).
const ZONE_TERRAIN: Record<ZoneId, { seed: number; amplitude: number }> = {
  south_pole: { seed: 1101, amplitude: 6 },
  equator: { seed: 2202, amplitude: 3 },
};

/** Side-view game screen: terrain, base module and the player hitbox. */
export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private scenario!: ScenarioConfig;
  private hud!: Hud;
  private sky!: Sky;
  private zone!: ZoneConfig;
  private player!: Player;

  constructor() {
    super('Game');
  }

  init(data: { zoneId: ZoneId }): void {
    this.scenario = buildMoonScenario();
    this.zone = this.scenario.zones[data.zoneId];
    this.state = createInitialState(this.scenario, data.zoneId);
  }

  create(): void {
    const worldWidth = WORLD_COLUMNS * TILE;
    const worldHeight = GAME_HEIGHT;

    this.cameras.main.setBackgroundColor(COLORS.background);
    this.addParallaxStars(worldWidth);
    this.sky = new Sky(this);

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

    this.hud = new Hud(this, this.zone);
    this.hud.refreshResources(this.state);

    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  update(_time: number, deltaMs: number): void {
    this.player.update();

    this.state = step(this.state, this.scenario, deltaMs / 1000);
    const localHour = localHourOf(this.state, this.scenario.time);
    const latitude = this.zone.latitudeDeg.value;
    const sun = sunAt(localHour, latitude);
    this.sky.update(sun);
    this.hud.updateEnvironment({
      localHour,
      isDay: sun.isDay,
      cycleNumber: Math.floor((this.scenario.time.startLocalHour + this.state.elapsedLunarHours) / LUNAR_HOURS_PER_CYCLE) + 1,
      surfaceKelvin: surfaceTemperatureKelvin(this.scenario.temperature, latitude, localHour),
      temperatureVerified: this.scenario.temperature.verified,
    });
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
    const g = this.add.graphics().setScrollFactor(0.2).setDepth(-2);
    const span = worldWidth * 0.2 + this.scale.width;
    for (let i = 0; i < 220; i++) {
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      g.fillCircle(Phaser.Math.Between(0, span), Phaser.Math.Between(0, GAME_HEIGHT * 0.7), Phaser.Math.FloatBetween(0.5, 1.5));
    }
  }
}
