import Phaser from 'phaser';
import { currentPhase, missingForPhase, PHASE_NAMES_ES } from '../sim/actions';
import { crewNeedsPerHour, NEED_SOURCES } from '../sim/crew';
import { stationStatus } from '../sim/processes';
import { LUNAR_HOURS_PER_CYCLE } from '../sim/sun';
import { BUILDING_IDS, type GameState, type ScenarioConfig, type ZoneConfig } from '../sim/types';
import { StatBar } from './statBar';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT } from './theme';

const HUD_DEPTH = 100;

export interface EnvironmentReadout {
  localHour: number;
  isDay: boolean;
  cycleNumber: number;
  surfaceKelvin: number;
  /** False while the temperature model still needs a human check against its source. */
  temperatureVerified: boolean;
  /** Footnote shown when the temperature is not verified. */
  temperatureNoteEs: string;
  speed: number;
}

const n = (value: number) => Math.floor(value).toString();

const PANEL_X = 12;
const PANEL_Y = 12;
const PANEL_W = 400;
const ROW = 22;
const BAR_COLORS = {
  oxygen: 0x7fd4ff,
  water: 0x4d9bff,
  food: 0xffa05a,
  energy: 0xffe066,
};

/** Hours of reserve that fill a base bar: two full lunar day/night cycles, so the starting stock does not max it out. */
const RESERVE_FULL_HOURS = 2 * LUNAR_HOURS_PER_CYCLE;

/** Fixed-to-screen overlay: base resources (left), clock (right), site prompt (bottom). */
export class Hud {
  private readonly phaseText: Phaser.GameObjects.Text;
  private readonly goalText: Phaser.GameObjects.Text;
  private readonly materialsText: Phaser.GameObjects.Text;
  private readonly readyText: Phaser.GameObjects.Text;
  private readonly crewBars: Record<'oxygen' | 'water' | 'food', StatBar>;
  private readonly energyBar: StatBar;
  private readonly reserveBars: Record<'oxygen' | 'water' | 'food', StatBar>;
  private readonly clockText: Phaser.GameObjects.Text;
  private readonly envText: Phaser.GameObjects.Text;
  private readonly messageText: Phaser.GameObjects.Text;
  private readonly promptText: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene, zone: ZoneConfig) {
    const x = PANEL_X + 14;
    const w = PANEL_W - 28;
    const panel = scene.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, 372, COLORS.panel, 0.88).setOrigin(0).setStrokeStyle(1, COLORS.border);
    this.phaseText = scene.add.text(x, 22, '', { fontFamily: FONT, fontSize: '16px', color: TEXT.accent });
    this.goalText = scene.add.text(x, 44, '', { fontFamily: FONT, fontSize: '13px', color: TEXT.primary, wordWrap: { width: w } });

    const section = (y: number, label: string) =>
      scene.add.text(x, y, label, { fontFamily: FONT, fontSize: '11px', color: TEXT.muted, fontStyle: 'bold' });
    const crewHeader = section(82, 'ASTRONAUTA');
    let y = 100;
    const bar = (label: string, color: number, warnBelow: number) => {
      const b = new StatBar(scene, x, y, label, { width: w, color, warnBelow }).setDepth(HUD_DEPTH);
      y += ROW;
      return b;
    };
    this.crewBars = {
      oxygen: bar('Oxígeno', BAR_COLORS.oxygen, 0.4),
      water: bar('Agua', BAR_COLORS.water, 0.4),
      food: bar('Comida', BAR_COLORS.food, 0.4),
    };

    y += 12;
    const baseHeader = section(y, 'RESERVAS DE LA BASE · cuánto alcanzan');
    y += 18;
    this.energyBar = bar('Energía', BAR_COLORS.energy, 0.2);
    this.reserveBars = {
      oxygen: bar('Oxígeno', BAR_COLORS.oxygen, 0.25),
      water: bar('Agua', BAR_COLORS.water, 0.25),
      food: bar('Comida', BAR_COLORS.food, 0.25),
    };

    y += 12;
    const materialsHeader = section(y, 'MATERIALES');
    this.materialsText = scene.add.text(x, y + 18, '', {
      fontFamily: FONT,
      fontSize: '13px',
      color: TEXT.primary,
      lineSpacing: 3,
      wordWrap: { width: w },
    });
    this.readyText = scene.add.text(x, y + 62, '', { fontFamily: FONT, fontSize: '13px', color: '#7fffa0', wordWrap: { width: w } });

    const right = GAME_WIDTH - 20;
    const title = scene.add.text(right, 16, zone.nameEs, { fontFamily: FONT, fontSize: '20px', color: TEXT.accent }).setOrigin(1, 0);
    this.clockText = scene.add.text(right, 42, '', { fontFamily: FONT, fontSize: '20px', color: TEXT.primary }).setOrigin(1, 0);
    this.envText = scene.add
      .text(right, 70, '', { fontFamily: FONT, fontSize: '16px', color: TEXT.primary, align: 'right' })
      .setOrigin(1, 0);
    const help = scene.add
      .text(
        right,
        118,
        [
          '← → / A D: moverse · ↑ / W / Espacio: saltar',
          'E: construir, iniciar o recoger en el sitio donde estás',
          'T: velocidad · Esc: menú',
        ].join('\n'),
        { fontFamily: FONT, fontSize: '13px', color: TEXT.muted, align: 'right' },
      )
      .setOrigin(1, 0);
    this.messageText = scene.add
      .text(GAME_WIDTH / 2, 24, '', { fontFamily: FONT, fontSize: '20px', color: TEXT.warning })
      .setOrigin(0.5, 0);
    this.promptText = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, '', {
        fontFamily: FONT,
        fontSize: '17px',
        color: TEXT.primary,
        align: 'center',
        backgroundColor: '#141824',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);

    [panel, this.phaseText, this.goalText, crewHeader, baseHeader, materialsHeader, this.materialsText, this.readyText, title, this.clockText, this.envText, help, this.messageText, this.promptText].forEach((o) =>
      o.setScrollFactor(0).setDepth(HUD_DEPTH),
    );
  }

  /** Shows a short message at the top for a few seconds. */
  showMessage(text: string): void {
    this.messageText.setText(text).setAlpha(1);
    this.scene.tweens.killTweensOf(this.messageText);
    this.scene.tweens.add({ targets: this.messageText, alpha: 0, delay: 2500, duration: 600 });
  }

  /** What the astronaut can do where they stand. Empty string hides it. */
  setPrompt(text: string): void {
    this.promptText.setText(text).setVisible(text.length > 0);
  }

  updateEnvironment(env: EnvironmentReadout): void {
    const hh = Math.floor(env.localHour);
    const mm = Math.floor((env.localHour - hh) * 60);
    const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const speed = env.speed === 1 ? '' : ` · ×${env.speed}`;
    this.clockText.setText(`Ciclo ${env.cycleNumber} · Hora lunar ${clock} · ${env.isDay ? 'Día' : 'Noche'}${speed}`);

    const celsius = env.surfaceKelvin - 273.15;
    const mark = env.temperatureVerified ? '' : ' *';
    const note = env.temperatureVerified ? '' : `\n* ${env.temperatureNoteEs}`;
    this.envText.setText(`Superficie: ${celsius.toFixed(0)} °C (${env.surfaceKelvin.toFixed(0)} K)${mark}${note}`);
  }

  updateBase(state: GameState, config: ScenarioConfig, deltaMs: number): void {
    const r = state.resources;
    const phase = currentPhase(state, config);
    const missing = missingForPhase(state, config).map((id) => config.buildings[id].nameEs);
    this.phaseText.setText(`Fase ${phase}: ${PHASE_NAMES_ES[phase]}`);
    this.goalText.setText(
      phase === 1
        ? 'Ve a la nave y desármala (E)'
        : missing.length > 0
          ? `Falta construir: ${missing.join(', ')}`
          : 'Mantente con vida',
    );

    // The player is the first (and only) astronaut.
    const astronaut = state.crew[0];
    for (const need of ['oxygen', 'water', 'food'] as const) {
      const value = astronaut.alive ? astronaut[need] : 0;
      this.crewBars[need].set(value / 100, `${n(value)} %`);
    }

    this.energyBar.set(r.energy / config.baseBatteryCapacity, `${n(r.energy)}/${n(config.baseBatteryCapacity)}`);
    const needs = crewNeedsPerHour(config, state.crew.filter((a) => a.alive).length);
    for (const need of ['oxygen', 'water', 'food'] as const) {
      const stock = NEED_SOURCES[need].reduce((sum, id) => sum + r[id], 0);
      const hours = needs[need] > 0 ? stock / needs[need] : Infinity;
      const label = hours >= 99 ? '99+ h' : `${n(hours)} h`;
      this.reserveBars[need].set(hours / RESERVE_FULL_HOURS, label);
    }

    this.materialsText.setText(
      [
        `Titanio ${n(r.titanium)} · Minerales ${n(r.minerals)} · Nitrógeno ${n(r.nitrogen)}`,
        `Semillas ${n(r.seeds)} · Sustrato ${n(r.substrate)} · Desechos ${n(r.humanWaste)} · Restos ${n(r.plantWaste)}`,
      ].join('\n'),
    );

    const ready = BUILDING_IDS.filter((id) => stationStatus(state, config, id) === 'ready').map(
      (id) => config.buildings[id].nameEs,
    );
    this.readyText.setText(ready.length > 0 ? `● Listo para recoger: ${ready.join(', ')}` : '');

    for (const b of [...Object.values(this.crewBars), this.energyBar, ...Object.values(this.reserveBars)]) b.tick(deltaMs);
  }
}
