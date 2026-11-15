import Phaser from 'phaser';
import { BUILDING_IDS, type BuildingId, type GameState, type ScenarioConfig } from '../../sim/types';
import { FONT, TEXT } from '../theme';
import { BASE_MODULE, TILE } from './constants';

// One slot per machine type, in tiles from the base center. Placeholders until we have sprites.
const SLOT_OFFSETS: Record<BuildingId, number> = {
  solar_panels: -6,
  oxygenator: 6,
  ice_extractor: -10,
  waste_processor: 10,
  hydroponics: -14,
  cricket_farm: 14,
};
const COLOR_BY_BUILDING: Record<BuildingId, number> = {
  solar_panels: 0x4d7cff,
  oxygenator: 0x7fe0ff,
  ice_extractor: 0xbfe8ff,
  waste_processor: 0xb08a5a,
  hydroponics: 0x6fd08c,
  cricket_farm: 0xd9c46a,
};
const MACHINE_W = 3 * TILE;
const MACHINE_H = 2 * TILE;

/** Tiles to keep flat on each side of the base so every slot fits. */
export const PAD_RADIUS_TILES = 17;

/** Draws the ship/base and one placeholder box per machine type, synced with the game state. */
export class Structures {
  private readonly hullLabel: Phaser.GameObjects.Text;
  private readonly boxes = {} as Record<BuildingId, Phaser.GameObjects.Rectangle>;
  private readonly labels = {} as Record<BuildingId, Phaser.GameObjects.Text>;

  constructor(scene: Phaser.Scene, centerX: number, groundY: number) {
    const w = BASE_MODULE.widthTiles * TILE;
    const h = BASE_MODULE.heightTiles * TILE;
    scene.add.rectangle(centerX, groundY - h / 2, w, h, BASE_MODULE.color, 0.12).setStrokeStyle(2, BASE_MODULE.color);
    this.hullLabel = scene.add
      .text(centerX, groundY - h / 2, '', { fontFamily: FONT, fontSize: '18px', color: TEXT.muted })
      .setOrigin(0.5);

    for (const id of BUILDING_IDS) {
      const x = centerX + SLOT_OFFSETS[id] * TILE;
      this.boxes[id] = scene.add
        .rectangle(x, groundY - MACHINE_H / 2, MACHINE_W, MACHINE_H, COLOR_BY_BUILDING[id], 0.2)
        .setStrokeStyle(2, COLOR_BY_BUILDING[id])
        .setVisible(false);
      this.labels[id] = scene.add
        .text(x, groundY - MACHINE_H - 8, '', { fontFamily: FONT, fontSize: '13px', color: TEXT.primary, align: 'center' })
        .setOrigin(0.5, 1)
        .setVisible(false);
    }
  }

  update(state: GameState, config: ScenarioConfig): void {
    this.hullLabel.setText(state.shipUnpacked ? 'BASE' : 'NAVE');
    for (const id of BUILDING_IDS) {
      const count = state.buildings[id];
      const built = count > 0;
      this.boxes[id].setVisible(built);
      this.labels[id].setVisible(built);
      if (!built) continue;
      const activity = state.buildingActivity[id];
      const status = activity >= 0.99 ? '' : activity <= 0.01 ? '\n(parado)' : `\n(${Math.round(activity * 100)} %)`;
      this.labels[id].setText(`${config.buildings[id].nameEs} ×${count}${status}`);
      this.boxes[id].setFillStyle(COLOR_BY_BUILDING[id], 0.08 + 0.3 * activity);
    }
  }
}
