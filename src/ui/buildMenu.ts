import Phaser from 'phaser';
import { buildBlockerEs, currentPhase, PHASE_NAMES_ES } from '../sim/actions';
import { BUILDING_IDS, type BuildingId, type GameState, type ScenarioConfig } from '../sim/types';
import { formatAmounts } from './labels';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, TEXT } from './theme';

export type MenuChoice = { kind: 'unpack' } | { kind: 'build'; id: BuildingId };

/** Build menu overlay. Options are picked with the number keys. */
export class BuildMenu {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private open = false;

  constructor(scene: Phaser.Scene) {
    this.panel = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 660, 520, COLORS.panel, 0.95)
      .setStrokeStyle(2, COLORS.accent);
    this.text = scene.add.text(GAME_WIDTH / 2 - 305, GAME_HEIGHT / 2 - 215, '', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TEXT.primary,
      lineSpacing: 3,
    });
    [this.panel, this.text].forEach((o) => o.setScrollFactor(0).setDepth(200).setVisible(false));
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.open = !this.open;
    this.panel.setVisible(this.open);
    this.text.setVisible(this.open);
  }

  /** What the given number key (1-9) selects right now, or null. */
  choiceFor(digit: number, state: GameState): MenuChoice | null {
    if (!state.shipUnpacked) return digit === 1 ? { kind: 'unpack' } : null;
    const id = BUILDING_IDS[digit - 1];
    return id ? { kind: 'build', id } : null;
  }

  update(state: GameState, config: ScenarioConfig): void {
    if (!this.open) return;
    const phase = currentPhase(state, config);
    const lines = [`CONSTRUIR · Fase ${phase}: ${PHASE_NAMES_ES[phase]}`, ''];

    if (!state.shipUnpacked) {
      lines.push(
        '[1] Desarmar la nave',
        `     El casco pasa a ser la base. Obtienes: ${formatAmounts(config.shipSalvage)}.`,
      );
    } else {
      BUILDING_IDS.forEach((id, i) => {
        const def = config.buildings[id];
        const blocker = buildBlockerEs(state, config, id);
        lines.push(
          `[${i + 1}] ${def.nameEs} (${state.buildings[id]}/${def.maxCount}) · ${blocker ? `✗ ${blocker}` : '✓ disponible'}`,
          `     ${def.descriptionEs} Cuesta ${formatAmounts(def.cost)}.`,
          `     Usa ${formatAmounts(def.inputsPerHour)} → da ${formatAmounts(def.outputsPerHour)} por hora`,
        );
      });
    }
    lines.push('', 'Número: elegir · E: cerrar');
    this.text.setText(lines.join('\n'));
  }
}
