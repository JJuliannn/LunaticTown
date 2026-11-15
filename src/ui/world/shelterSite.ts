import Phaser from 'phaser';
import { shelterBlocker } from '../../sim/shelter';
import type { GameState, ScenarioConfig } from '../../sim/types';
import { formatAmounts } from '../labels';
import { FONT, TEXT } from '../theme';
import { TILE } from './constants';

/** Tiles from the base center: past the landing pad, on the flat ground. */
const SHELTER_OFFSET = -23;
const SHELTER_W = 3 * TILE;
const SHELTER_COLOR = 0x8a7a5a;

/** The storm shelter: a hole dug in the regolith, drawn as a dark pit with a hatch. */
export class ShelterSite {
  readonly x: number;
  private readonly pit: Phaser.GameObjects.Rectangle;
  private readonly hatch: Phaser.GameObjects.Rectangle;
  private readonly name: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, centerX: number, groundYAt: (x: number) => number) {
    this.x = centerX + SHELTER_OFFSET * TILE;
    const y = groundYAt(this.x);
    // Drawn into the ground: the shelter is below the surface.
    this.pit = scene.add.rectangle(this.x, y + TILE / 2, SHELTER_W, TILE, 0x000000, 0.7).setStrokeStyle(1, SHELTER_COLOR, 0.5);
    this.hatch = scene.add.rectangle(this.x, y - 4, SHELTER_W * 0.6, 8, SHELTER_COLOR, 1);
    this.name = scene.add
      .text(this.x, y - 20, '', { fontFamily: FONT, fontSize: '13px', color: TEXT.muted, align: 'center' })
      .setOrigin(0.5, 1);
  }

  isAt(x: number): boolean {
    return Math.abs(x - this.x) <= SHELTER_W / 2 + 8;
  }

  update(state: GameState, config: ScenarioConfig): void {
    const visible = state.shipUnpacked;
    this.pit.setVisible(visible);
    this.hatch.setVisible(visible && state.shelterBuilt);
    this.name.setVisible(visible);
    const shelter = config.events.shelter;
    this.name
      .setText(state.shelterBuilt ? shelter.nameEs : `${shelter.nameEs}\n(sin excavar)`)
      .setColor(state.shelterBuilt ? TEXT.primary : TEXT.muted);
    this.pit.setStrokeStyle(state.shelterBuilt ? 2 : 1, SHELTER_COLOR, state.shelterBuilt ? 1 : 0.5);
  }

  promptEs(state: GameState, config: ScenarioConfig): string {
    if (!state.shipUnpacked) return '';
    const shelter = config.events.shelter;
    if (state.shelterBuilt) {
      return `${shelter.nameEs}: aquí sobrevives a una tormenta solar. Quédate quieto aquí hasta que termine.`;
    }
    const blocker = shelterBlocker(state, config);
    const cost = `cuesta ${formatAmounts(shelter.cost)}`;
    return blocker
      ? `${shelter.nameEs}: ${shelter.descriptionEs}\n✗ ${blocker} · ${cost}`
      : `${shelter.nameEs}: ${shelter.descriptionEs}\n[E] Excavar (${config.workHours.build_shelter} h) · ${cost}`;
  }
}
