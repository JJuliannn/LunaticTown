import Phaser from 'phaser';
import { buildMoonScenario } from '../../scenarios/moon';
import { build, operate, unpackShip, type ActionResult } from '../../sim/actions';
import { createInitialState } from '../../sim/state';
import { step } from '../../sim/step';
import { LUNAR_HOURS_PER_CYCLE, localHourOf, sunAt } from '../../sim/sun';
import { zoneSurfaceKelvin, zoneTemperatureVerified } from '../../sim/temperature';
import { generateTerrain, type CraterOptions } from '../../sim/terrain';
import type { BuildingId, GameState, ScenarioConfig, ZoneConfig, ZoneId } from '../../sim/types';
import { Hud } from '../hud';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../theme';
import { PLAYER, TILE, WORLD_COLUMNS } from '../world/constants';
import { Player } from '../world/Player';
import { Sky } from '../world/sky';
import { PAD_RADIUS_TILES, Structures } from '../world/structures';
import { buildTerrain, surfaceY } from '../world/terrain';

// World layout per zone. Game design values, not real topography (LOLA later).
interface ZoneWorld {
  seed: number;
  amplitude: number;
  crater?: CraterOptions;
  /** Site positions (tiles from the base) that differ from the default layout. */
  slots?: Partial<Record<BuildingId, number>>;
}
const ZONE_WORLD: Record<ZoneId, ZoneWorld> = {
  south_pole: { seed: 1101, amplitude: 6 },
  // Base on the dark floor next to the ice; the panels sit up on the sunlit rim.
  shadowed_crater: {
    seed: 3303,
    amplitude: 4,
    crater: { depth: 9, wallWidth: 9, rimWidth: 10 },
    slots: { solar_panels: -32 },
  },
  equator: { seed: 2202, amplitude: 3 },
};

/** Time speeds cycled with T. Useful for playtesting. */
const SPEEDS = [1, 5, 20];

/** How far above the crater floor the astronaut must climb to leave the shadow. */
const SHADE_CLEARANCE_PX = 4 * TILE;

/**
 * Side-view game screen. One astronaut walks to each site and presses E to build,
 * start a batch or collect. Nothing reaches the base unless the player collects it.
 */
export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private scenario!: ScenarioConfig;
  private zone!: ZoneConfig;
  private player!: Player;
  private hud!: Hud;
  private sky!: Sky;
  private structures!: Structures;
  private speedIndex = 0;
  private gameOverShown = false;
  /** Top of the ground under the base. */
  private floorY = 0;

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

    const layout = ZONE_WORLD[this.zone.id];
    const heights = generateTerrain({
      seed: layout.seed,
      columns: WORLD_COLUMNS,
      baseHeight: 6,
      amplitude: layout.amplitude,
      flatRadius: PAD_RADIUS_TILES,
      crater: layout.crater,
    });
    const ground = buildTerrain(this, heights, worldHeight);

    const centerX = worldWidth / 2;
    const groundY = surfaceY(heights, worldHeight, centerX);
    this.floorY = groundY;
    this.structures = new Structures(this, centerX, (x) => surfaceY(heights, worldHeight, x), layout.slots);

    this.player = new Player(this, centerX, groundY - PLAYER.height);
    this.physics.add.collider(this.player.body, ground);

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player.body, true, 0.1, 0.1);

    this.hud = new Hud(this, this.zone);

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.scene.start('Menu'));
    kb.on('keydown-E', () => this.interact());
    kb.on('keydown-T', () => (this.speedIndex = (this.speedIndex + 1) % SPEEDS.length));
  }

  update(_time: number, deltaMs: number): void {
    this.player.update();

    const speed = SPEEDS[this.speedIndex];
    this.state = step(this.state, this.scenario, (deltaMs / 1000) * speed);

    const localHour = localHourOf(this.state, this.scenario.time);
    const latitude = this.zone.latitudeDeg.value;
    const sun = sunAt(localHour, latitude);
    // In a shadowed crater only the rim sees the Sun: dark while the astronaut is down on the floor.
    const playerFeetY = this.player.body.y + PLAYER.height;
    this.sky.update(sun, this.zone.permanentShadow && playerFeetY > this.floorY - SHADE_CLEARANCE_PX);
    this.structures.update(this.state, this.scenario);
    this.hud.updateBase(this.state, this.scenario, deltaMs);
    this.hud.updateEnvironment({
      localHour,
      isDay: sun.isDay,
      cycleNumber:
        Math.floor((this.scenario.time.startLocalHour + this.state.elapsedLunarHours) / LUNAR_HOURS_PER_CYCLE) + 1,
      surfaceKelvin: zoneSurfaceKelvin(this.scenario.temperature, this.zone, localHour),
      temperatureVerified: zoneTemperatureVerified(this.scenario.temperature, this.zone),
      temperatureNoteEs: this.zone.shadowFloorKelvin
        ? 'Fondo del cráter: valor de prueba, sin fuente todavía'
        : 'Modelo basado en Diviner, pendiente de revisión',
      speed,
    });

    const site = this.state.status === 'playing' ? this.structures.siteAt(this.player.body.x) : null;
    this.hud.setPrompt(site ? this.structures.promptEs(site, this.state, this.scenario) : '');

    if (this.state.status === 'lost' && !this.gameOverShown) this.showGameOver();
  }

  /** E key: do whatever makes sense at the site where the astronaut is standing. */
  private interact(): void {
    if (this.state.status !== 'playing') return;
    const site = this.structures.siteAt(this.player.body.x);
    if (!site) return;

    let result: ActionResult;
    if (site.kind === 'ship') {
      if (this.state.shipUnpacked) return;
      result = unpackShip(this.state, this.scenario);
    } else {
      if (!this.state.shipUnpacked) return;
      result = this.state.stations[site.id].built
        ? operate(this.state, this.scenario, site.id)
        : build(this.state, this.scenario, site.id);
    }
    this.state = result.state;
    this.hud.showMessage(result.messageEs);
  }

  private showGameOver(): void {
    this.gameOverShown = true;
    this.hud.setPrompt('');
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const cycles = (this.state.elapsedLunarHours / LUNAR_HOURS_PER_CYCLE).toFixed(1);
    const objects = [
      this.add.rectangle(cx, cy, 720, 220, COLORS.panel, 0.95).setStrokeStyle(2, COLORS.warning),
      this.add.text(cx, cy - 60, 'Misión fallida', { fontFamily: FONT, fontSize: '40px', color: TEXT.warning }).setOrigin(0.5),
      this.add
        .text(cx, cy + 5, `${this.state.lostReasonEs ?? ''}\nSobrevivió ${cycles} ciclos lunares.`, {
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
