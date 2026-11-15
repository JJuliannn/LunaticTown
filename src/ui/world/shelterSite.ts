import Phaser from 'phaser';
import { shelterBlocker } from '../../sim/shelter';
import type { GameState, ScenarioConfig } from '../../sim/types';
import { formatAmounts } from '../labels';
import { FONT, TEXT } from '../theme';
import { SPRITE_SCALE, SPRITES } from '../assets';
import { TILE } from './constants';

/** Tiles from the base center: past the landing pad, on the flat ground. */
const SHELTER_OFFSET = -23;
const SHELTER_W = 3 * TILE;
/** Rows of the sprite above the ground line (the rest is the pit, drawn into the ground). */
const ROWS_ABOVE_GROUND = 8;
const SPRITE_ROWS = 24;

/** The storm shelter: a hole dug in the regolith, drawn as a dark pit with a hatch. */
export class ShelterSite {
  readonly x: number;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly name: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, centerX: number, groundYAt: (x: number) => number) {
    this.x = centerX + SHELTER_OFFSET * TILE;
    const y = groundYAt(this.x);
    // Partly drawn into the ground: the shelter is a pit below the surface, with a berm and a hatch above.
    this.sprite = scene.add
      .image(this.x, y, SPRITES.shelter)
      .setOrigin(0.5, ROWS_ABOVE_GROUND / SPRITE_ROWS)
      .setScale(SPRITE_SCALE)
      .setDepth(1);
    this.name = scene.add
      .text(this.x, y - 20, '', { fontFamily: FONT, fontSize: '16px', color: TEXT.muted, align: 'center' })
      .setOrigin(0.5, 1);
  }

  isAt(x: number): boolean {
    return Math.abs(x - this.x) <= SHELTER_W / 2 + 8;
  }

  update(state: GameState, config: ScenarioConfig): void {
    const visible = state.shipUnpacked;
    this.sprite.setVisible(visible);
    this.name.setVisible(visible);
    const shelter = config.events.shelter;
    this.name
      .setText(state.shelterBuilt ? shelter.nameEs : `${shelter.nameEs}\n(sin excavar)`)
      .setColor(state.shelterBuilt ? TEXT.primary : TEXT.muted);
    if (state.shelterBuilt) this.sprite.clearTint().setAlpha(1);
    else this.sprite.setTint(0x7fb2ff).setAlpha(0.35);
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
