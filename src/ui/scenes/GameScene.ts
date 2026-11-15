import Phaser from 'phaser';
import { buildMoonScenario } from '../../scenarios/moon';
import { build, unpackShip } from '../../sim/actions';
import { createInitialState } from '../../sim/state';
import { step } from '../../sim/step';
import { LUNAR_HOURS_PER_CYCLE, localHourOf, sunAt } from '../../sim/sun';
import { surfaceTemperatureKelvin } from '../../sim/temperature';
import { generateTerrain } from '../../sim/terrain';
import type { GameState, ScenarioConfig, ZoneConfig, ZoneId } from '../../sim/types';
import { BuildMenu } from '../buildMenu';
import { Hud } from '../hud';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../theme';
import { PLAYER, TILE, WORLD_COLUMNS } from '../world/constants';
import { Player } from '../world/Player';
import { Sky } from '../world/sky';
import { PAD_RADIUS_TILES, Structures } from '../world/structures';
import { buildTerrain, surfaceY } from '../world/terrain';

// Terrain shape per zone. Game design values, not real topography (LOLA later).
const ZONE_TERRAIN: Record<ZoneId, { seed: number; amplitude: number }> = {
  south_pole: { seed: 1101, amplitude: 6 },
  equator: { seed: 2202, amplitude: 3 },
};

/** Time speeds cycled with T. Useful for playtesting. */
const SPEEDS = [1, 5, 20];

/** Side-view game screen: runs the simulation and draws the world, HUD and build menu. */
export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private scenario!: ScenarioConfig;
  private zone!: ZoneConfig;
  private player!: Player;
  private hud!: Hud;
  private sky!: Sky;
  private structures!: Structures;
  private menu!: BuildMenu;
  private speedIndex = 0;
  private gameOverShown = false;

  constructor() {
    super('Game');
  }

  init(data: { zoneId: ZoneId }): void {
    this.scenario = buildMoonScenario();
    this.zone = this.scenario.zones[data.zoneId];
    this.state = createInitialState(this.scenario, data.zoneId);
    this.speedIndex = 0;
    this.gameOverShown = false;
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
      flatRadius: PAD_RADIUS_TILES,
    });
    const ground = buildTerrain(this, heights, worldHeight);

    const centerX = worldWidth / 2;
    const groundY = surfaceY(heights, worldHeight, centerX);
    this.structures = new Structures(this, centerX, groundY);

    this.player = new Player(this, centerX, groundY - PLAYER.height);
    this.physics.add.collider(this.player.body, ground);

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player.body, true, 0.1, 0.1);

    this.hud = new Hud(this, this.zone);
    this.menu = new BuildMenu(this);

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.scene.start('Menu'));
    kb.on('keydown-E', () => this.menu.toggle());
    kb.on('keydown-T', () => (this.speedIndex = (this.speedIndex + 1) % SPEEDS.length));
    kb.on('keydown', (event: KeyboardEvent) => this.onDigit(Number(event.key)));
  }

  update(_time: number, deltaMs: number): void {
    this.player.update();

    const speed = SPEEDS[this.speedIndex];
    this.state = step(this.state, this.scenario, (deltaMs / 1000) * speed);

    const localHour = localHourOf(this.state, this.scenario.time);
    const latitude = this.zone.latitudeDeg.value;
    const sun = sunAt(localHour, latitude);
    this.sky.update(sun);
    this.structures.update(this.state, this.scenario);
    this.menu.update(this.state, this.scenario);
    this.hud.updateBase(this.state, this.scenario);
    this.hud.updateEnvironment({
      localHour,
      isDay: sun.isDay,
      cycleNumber:
        Math.floor((this.scenario.time.startLocalHour + this.state.elapsedLunarHours) / LUNAR_HOURS_PER_CYCLE) + 1,
      surfaceKelvin: surfaceTemperatureKelvin(this.scenario.temperature, latitude, localHour),
      temperatureVerified: this.scenario.temperature.verified,
      speed,
    });

    if (this.state.status === 'lost' && !this.gameOverShown) this.showGameOver();
  }

  private onDigit(digit: number): void {
    if (!this.menu.isOpen || !Number.isInteger(digit) || digit < 1) return;
    const choice = this.menu.choiceFor(digit, this.state);
    if (!choice) return;
    const result =
      choice.kind === 'unpack' ? unpackShip(this.state, this.scenario) : build(this.state, this.scenario, choice.id);
    this.state = result.state;
    this.hud.showMessage(result.messageEs);
  }

  private showGameOver(): void {
    this.gameOverShown = true;
    if (this.menu.isOpen) this.menu.toggle();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const cycles = (this.state.elapsedLunarHours / LUNAR_HOURS_PER_CYCLE).toFixed(1);
    const objects = [
      this.add.rectangle(cx, cy, 720, 220, COLORS.panel, 0.95).setStrokeStyle(2, COLORS.warning),
      this.add.text(cx, cy - 60, 'Misión fallida', { fontFamily: FONT, fontSize: '40px', color: TEXT.warning }).setOrigin(0.5),
      this.add
        .text(cx, cy + 5, `${this.state.lostReasonEs ?? ''}\nSobrevivieron ${cycles} ciclos lunares.`, {
          fontFamily: FONT,
          fontSize: '20px',
          color: TEXT.primary,
          align: 'center',
        })
        .setOrigin(0.5),
      this.add.text(cx, cy + 75, 'Esc: volver al menú', { fontFamily: FONT, fontSize: '16px', color: TEXT.muted }).setOrigin(0.5),
    ];
    objects.forEach((o) => o.setScrollFactor(0).setDepth(300));
  }

  private addParallaxStars(worldWidth: number): void {
    const g = this.add.graphics().setScrollFactor(0.2).setDepth(-2);
    const span = worldWidth * 0.2 + this.scale.width;
    for (let i = 0; i < 220; i++) {
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      g.fillCircle(
        Phaser.Math.Between(0, span),
        Phaser.Math.Between(0, GAME_HEIGHT * 0.7),
        Phaser.Math.FloatBetween(0.5, 1.5),
      );
    }
  }
}
