import Phaser from 'phaser';
import { currentPhase, missingForPhase, PHASE_NAMES_ES } from '../sim/actions';
import { energyCapacity } from '../sim/processes';
import type { GameState, ScenarioConfig, ZoneConfig } from '../sim/types';
import { COLORS, FONT, GAME_WIDTH, TEXT } from './theme';

const HUD_DEPTH = 100;

export interface EnvironmentReadout {
  localHour: number;
  isDay: boolean;
  cycleNumber: number;
  surfaceKelvin: number;
  /** False while the temperature model still needs a human check against its source. */
  temperatureVerified: boolean;
  speed: number;
}

const n = (value: number) => Math.floor(value).toString();

/** Fixed-to-screen overlay: base resources and crew (left), clock and environment (right). */
export class Hud {
  private readonly baseText: Phaser.GameObjects.Text;
  private readonly clockText: Phaser.GameObjects.Text;
  private readonly envText: Phaser.GameObjects.Text;
  private readonly messageText: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene, zone: ZoneConfig) {
    const panel = scene.add.rectangle(12, 12, 400, 318, COLORS.panel, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.border);
    this.baseText = scene.add.text(26, 22, '', { fontFamily: FONT, fontSize: '15px', color: TEXT.primary, lineSpacing: 4 });

    const right = GAME_WIDTH - 20;
    const title = scene.add.text(right, 16, zone.nameEs, { fontFamily: FONT, fontSize: '20px', color: TEXT.accent }).setOrigin(1, 0);
    this.clockText = scene.add.text(right, 42, '', { fontFamily: FONT, fontSize: '20px', color: TEXT.primary }).setOrigin(1, 0);
    this.envText = scene.add
      .text(right, 70, '', { fontFamily: FONT, fontSize: '16px', color: TEXT.primary, align: 'right' })
      .setOrigin(1, 0);
    const help = scene.add
      .text(right, 118, '← → / A D: moverse · ↑ / W / Espacio: saltar\nE: construir · T: velocidad · Esc: menú', {
        fontFamily: FONT,
        fontSize: '13px',
        color: TEXT.muted,
        align: 'right',
      })
      .setOrigin(1, 0);
    this.messageText = scene.add
      .text(GAME_WIDTH / 2, 24, '', { fontFamily: FONT, fontSize: '20px', color: TEXT.warning })
      .setOrigin(0.5, 0);

    [panel, this.baseText, title, this.clockText, this.envText, help, this.messageText].forEach((o) =>
      o.setScrollFactor(0).setDepth(HUD_DEPTH),
    );
  }

  /** Shows a short message at the top for a few seconds. */
  showMessage(text: string): void {
    this.messageText.setText(text).setAlpha(1);
    this.scene.tweens.killTweensOf(this.messageText);
    this.scene.tweens.add({ targets: this.messageText, alpha: 0, delay: 2500, duration: 600 });
  }

  updateEnvironment(env: EnvironmentReadout): void {
    const hh = Math.floor(env.localHour);
    const mm = Math.floor((env.localHour - hh) * 60);
    const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const speed = env.speed === 1 ? '' : ` · ×${env.speed}`;
    this.clockText.setText(`Ciclo ${env.cycleNumber} · Hora lunar ${clock} · ${env.isDay ? 'Día' : 'Noche'}${speed}`);

    const celsius = env.surfaceKelvin - 273.15;
    const mark = env.temperatureVerified ? '' : ' *';
    const note = env.temperatureVerified ? '' : '\n* Modelo basado en Diviner, pendiente de revisión';
    this.envText.setText(`Superficie: ${celsius.toFixed(0)} °C (${env.surfaceKelvin.toFixed(0)} K)${mark}${note}`);
  }

  updateBase(state: GameState, config: ScenarioConfig): void {
    const r = state.resources;
    const phase = currentPhase(state, config);
    const missing = missingForPhase(state, config).map((id) => config.buildings[id].nameEs);
    const goal =
      phase === 1 ? 'Desarma la nave (E)' : missing.length > 0 ? `Falta: ${missing.join(', ')}` : 'Mantén viva a la tripulación';

    const crew = state.crew.map((a) =>
      a.alive ? `${a.name}: O₂ ${n(a.oxygen)} · agua ${n(a.water)} · comida ${n(a.food)}` : `${a.name}: fallecido`,
    );

    this.baseText.setText(
      [
        `Fase ${phase}: ${PHASE_NAMES_ES[phase]}`,
        goal,
        '',
        `Energía ${n(r.energy)} / ${n(energyCapacity(state, config))}`,
        `Oxígeno ${n(r.oxygen)} · reserva ${n(r.oxygenReserve)} kg`,
        `Agua ${n(r.water)} kg · desechos ${n(r.humanWaste)}`,
        `Comida: raciones ${n(r.rations)} · vegetales ${n(r.vegetables)} · proteína ${n(r.protein)}`,
        `Titanio ${n(r.titanium)} · minerales ${n(r.minerals)} · nitrógeno ${n(r.nitrogen)}`,
        `Semillas ${n(r.seeds)} · sustrato ${n(r.substrate)} · restos vegetales ${n(r.plantWaste)}`,
        '',
        ...crew,
      ].join('\n'),
    );
  }
}
