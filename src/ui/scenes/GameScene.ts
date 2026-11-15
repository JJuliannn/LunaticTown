import Phaser from 'phaser';
import { buildMoonScenario } from '../../scenarios/moon';
import { DEBUG_EVENTS } from '../../sim/debug';
import { inEclipse } from '../../sim/environment';
import { createInitialState } from '../../sim/state';
import { step } from '../../sim/step';
import { localHourOf, sunAt } from '../../sim/sun';
import { zoneSurfaceKelvin, zoneTemperatureVerified } from '../../sim/temperature';
import { generateTerrain, type CraterOptions } from '../../sim/terrain';
import type { BuildingId, GameState, Location, ScenarioConfig, WorkAction, ZoneConfig, ZoneId } from '../../sim/types';
import { missionDay } from '../../sim/victory';
import { beginWork, cancelWork } from '../../sim/work';
import { Communicator } from '../comms/Communicator';
import { milestonesEs } from '../comms/milestones';
import { tutorialStepEs } from '../comms/tutorial';
import { DebugMenu } from '../debugMenu';
import { Hud } from '../hud';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../theme';
import { PLAYER, TILE, WORLD_COLUMNS } from '../world/constants';
import { Player } from '../world/Player';
import { Sky } from '../world/sky';
import { ShelterSite } from '../world/shelterSite';
import { PAD_RADIUS_TILES, Structures } from '../world/structures';
import { WorkIndicator } from '../world/workIndicator';
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
    slots: { solar_panels: -39 },
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
  private shelter!: ShelterSite;
  private comms!: Communicator;
  private workIndicator!: WorkIndicator;
  private speedIndex = 0;
  private gameOverShown = false;
  /** Entries of state.log already shown. */
  private logShown = 0;
  /** A movement key was down last frame (a new press cancels work). */
  private wasMoving = false;
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
    this.logShown = 0;
    this.wasMoving = false;
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
    const groundYAt = (x: number) => surfaceY(heights, worldHeight, x);
    this.structures = new Structures(this, centerX, groundYAt, layout.slots);
    this.shelter = new ShelterSite(this, centerX, groundYAt);
    this.workIndicator = new WorkIndicator(this);

    this.player = new Player(this, centerX, groundY - PLAYER.height);
    this.physics.add.collider(this.player.body, ground);

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player.body, true, 0.1, 0.1);

    this.hud = new Hud(this, this.zone);
    this.comms = new Communicator(this);
    new DebugMenu(this, (i) => this.triggerDebugEvent(i));

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.scene.start('Menu'));
    kb.on('keydown-ENTER', () => this.comms.next());
    kb.on('keydown-E', () => this.interact());
    kb.on('keydown-R', () => this.maintain());
    kb.on('keydown-T', () => (this.speedIndex = (this.speedIndex + 1) % SPEEDS.length));
  }

  update(_time: number, deltaMs: number): void {
    const injured = this.state.injuryHoursLeft > 0;
    const moving = this.player.update({
      frozen: this.state.work !== null,
      speedFactor: injured ? 1 / this.scenario.events.injurySlowdown : 1,
    });
    // A new movement key press cancels the task in progress (e.g. to run from a solar storm).
    if (moving && !this.wasMoving && this.state.work) this.state = cancelWork(this.state);
    this.wasMoving = moving;

    const location = this.locationOf(this.player.body.x);
    if (location !== this.state.location) this.state = { ...this.state, location };

    const speed = SPEEDS[this.speedIndex];
    const before = this.state;
    this.state = step(this.state, this.scenario, (deltaMs / 1000) * speed);
    this.announceMilestones(before);

    const localHour = localHourOf(this.state, this.scenario.time);
    const latitude = this.zone.latitudeDeg.value;
    const sun = sunAt(localHour, latitude);
    const eclipse = inEclipse(this.state, this.scenario);
    // In a shadowed crater only the rim sees the Sun: dark while the astronaut is down on the floor.
    const playerFeetY = this.player.body.y + PLAYER.height;
    const shaded = this.zone.permanentShadow && playerFeetY > this.floorY - SHADE_CLEARANCE_PX;
    this.sky.update(sun, { shaded, polar: this.zone.continuousLight, eclipse });
    this.structures.update(this.state, this.scenario);
    this.shelter.update(this.state, this.scenario);
    this.workIndicator.update(this.state.work, this.player.body.x, this.player.body.y);
    this.hud.updateBase(this.state, this.scenario, deltaMs);
    this.hud.setAlerts(this.alertsEs());
    this.showNewLog();
    this.comms.setTutorial(this.state.status === 'playing' ? tutorialStepEs(this.state, this.scenario) : null);
    this.comms.update(deltaMs);
    const lightEs = this.zone.continuousLight
      ? eclipse
        ? 'eclipse polar'
        : 'Sol rasante'
      : sun.isDay
        ? 'de día'
        : 'de noche';
    this.hud.updateEnvironment({
      localHour,
      lightEs,
      missionDay: missionDay(this.state, this.scenario),
      missionDays: this.scenario.victory.missionDays,
      surfaceKelvin: zoneSurfaceKelvin(this.scenario.temperature, this.zone, localHour),
      temperatureVerified: zoneTemperatureVerified(this.scenario.temperature, this.zone),
      temperatureNoteEs: this.zone.shadowFloorKelvin
        ? 'Fondo del cráter: valor de prueba, sin fuente todavía'
        : 'Modelo basado en Diviner, pendiente de revisión',
      speed,
    });

    this.hud.setPrompt(this.promptHere());

    if (this.state.status !== 'playing' && !this.gameOverShown) this.showGameOver();
  }

  private promptHere(): string {
    if (this.state.status !== 'playing' || this.state.work) return '';
    const x = this.player.body.x;
    if (this.shelter.isAt(x)) return this.shelter.promptEs(this.state, this.scenario);
    const site = this.structures.siteAt(x);
    return site ? this.structures.promptEs(site, this.state, this.scenario) : '';
  }

  /** Hull and dug shelter protect; anywhere else is outside. */
  private locationOf(x: number): Location {
    if (this.state.shelterBuilt && this.shelter.isAt(x)) return 'shelter';
    return this.structures.siteAt(x)?.kind === 'ship' ? 'hull' : 'outside';
  }

  /** Persistent warnings for the HUD. */
  private alertsEs(): string[] {
    const lines: string[] = [];
    const storm = this.state.storm;
    if (storm) {
      const hours = Math.max(1, Math.round(storm.hoursLeft * this.scenario.dayNightCycleLengthDays.value));
      const left = hours >= 36 ? `~${Math.round(hours / 24)} días` : `~${hours} h`;
      lines.push(
        storm.phase === 'warning'
          ? `⚠ TORMENTA SOLAR en ${left}: ve al refugio${this.state.shelterBuilt ? '' : ' (no tienes: el casco da 30 %)'}`
          : `⚠ TORMENTA SOLAR en curso (${left}): no salgas`,
      );
    }
    if (this.state.injuryHoursLeft > 0) lines.push('Lesionado: caminas más lento y los trabajos tardan el doble');
    return lines;
  }

  /** Shows messages the simulation logged since the last frame: important ones on the communicator. */
  private showNewLog(): void {
    const fresh = this.state.log.slice(this.logShown);
    this.logShown = this.state.log.length;
    const minor = fresh.filter((e) => !e.comms).map((e) => e.textEs);
    for (const e of fresh) if (e.comms) this.comms.push(e.textEs);
    if (minor.length > 0) this.hud.showMessage(minor.join('\n'));
  }

  /** Mission Control announces milestones (phases, supply ships, eclipse, lab available) on the communicator. */
  private announceMilestones(before: GameState): void {
    for (const text of milestonesEs(before, this.state, this.scenario)) this.comms.push(text);
  }

  /** Test menu (I): force an event. */
  private triggerDebugEvent(index: number): void {
    if (this.state.status !== 'playing') return;
    const before = this.state;
    this.state = DEBUG_EVENTS[index].run(this.state, this.scenario);
    this.announceMilestones(before);
    this.hud.showMessage(`Prueba: ${DEBUG_EVENTS[index].labelEs}`);
  }

  /** E key: start the task that makes sense where the astronaut stands. The effect comes when it ends. */
  private interact(): void {
    if (this.state.status !== 'playing' || this.state.work) return;
    const action = this.actionHere();
    if (!action) return;
    this.startWork(action);
  }

  /** R key: preventive maintenance of the station here. */
  private maintain(): void {
    if (this.state.status !== 'playing' || this.state.work || !this.state.shipUnpacked) return;
    const site = this.structures.siteAt(this.player.body.x);
    if (site?.kind !== 'station' || !this.state.stations[site.id].built) return;
    this.startWork({ type: 'maintain', id: site.id });
  }

  private startWork(action: WorkAction): void {
    const result = beginWork(this.state, this.scenario, action);
    this.state = result.state;
    this.hud.showMessage(result.messageEs);
  }

  private actionHere(): WorkAction | null {
    const x = this.player.body.x;
    if (this.shelter.isAt(x)) return this.state.shipUnpacked && !this.state.shelterBuilt ? { type: 'buildShelter' } : null;
    const site = this.structures.siteAt(x);
    if (!site) return null;
    if (site.kind === 'ship') return this.state.shipUnpacked ? null : { type: 'unpackShip' };
    if (!this.state.shipUnpacked) return null;
    if (site.kind === 'lab') return { type: 'buildLab' };
    if (site.kind === 'supply') return { type: 'unpackSupply' };
    const station = this.state.stations[site.id];
    if (!station.built) return { type: 'build', id: site.id };
    return station.broken ? { type: 'repair', id: site.id } : { type: 'operate', id: site.id };
  }

  private showGameOver(): void {
    this.gameOverShown = true;
    this.hud.setPrompt('');
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const won = this.state.status === 'won';
    const days = Math.floor(missionDay(this.state, this.scenario));
    const color = won ? COLORS.accent : COLORS.warning;
    const title = won ? '¡Misión cumplida!' : 'Misión fallida';
    const body = won
      ? `Sobreviviste los ${this.scenario.victory.missionDays} días de la misión de Artemis\ny construiste el ${this.scenario.victory.lab.nameEs.toLowerCase()}.`
      : `${this.state.lostReasonEs ?? ''}\nSobrevivió ${days} días de ${this.scenario.victory.missionDays}.`;
    const objects = [
      this.add.rectangle(cx, cy, 720, 220, COLORS.panel, 0.95).setStrokeStyle(2, color),
      this.add
        .text(cx, cy - 60, title, { fontFamily: FONT, fontSize: '40px', color: won ? TEXT.accent : TEXT.warning })
        .setOrigin(0.5),
      this.add
        .text(cx, cy + 5, body, {
          fontFamily: FONT,
          fontSize: '18px',
          color: TEXT.primary,
          align: 'center',
          wordWrap: { width: 680 },
        })
        .setOrigin(0.5),
      this.add.text(cx, cy + 75, 'Esc: volver al menú', { fontFamily: FONT, fontSize: '20px', color: TEXT.muted }).setOrigin(0.5),
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
