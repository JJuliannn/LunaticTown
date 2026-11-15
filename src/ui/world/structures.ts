import Phaser from 'phaser';
import { buildBlocker, startBlocker } from '../../sim/actions';
import { stationProgress, stationStatus } from '../../sim/processes';
import { BUILDING_IDS, type BuildingId, type GameState, type ScenarioConfig } from '../../sim/types';
import { formatAmounts, RESOURCE_NAMES_ES } from '../labels';
import { FONT, TEXT } from '../theme';
import { BASE_MODULE, TILE } from './constants';

// One site per station, in tiles from the base center. Boxes are placeholders until we have sprites.
export const SLOT_OFFSETS: Record<BuildingId, number> = {
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
const READY_COLOR = '#7fffa0';

/** Tiles to keep flat on each side of the base so every site fits. */
export const PAD_RADIUS_TILES = 17;

/** What the astronaut is standing at. */
export type Site = { kind: 'ship' } | { kind: 'station'; id: BuildingId };

/**
 * Draws the ship/base and the station sites, with a tag over each one that tells its state
 * ("¡Listo!" when there is something to collect). Also answers which site the player is at.
 */
export class Structures {
  private readonly hullLabel: Phaser.GameObjects.Text;
  private readonly boxes = {} as Record<BuildingId, Phaser.GameObjects.Rectangle>;
  private readonly names = {} as Record<BuildingId, Phaser.GameObjects.Text>;
  private readonly tags = {} as Record<BuildingId, Phaser.GameObjects.Text>;
  private readonly siteX = {} as Record<BuildingId, number>;
  private readonly hullHalfWidth = (BASE_MODULE.widthTiles * TILE) / 2;

  /**
   * @param groundYAt top of the ground at a world x, so sites on a crater rim sit on the rim.
   * @param slotOverrides per-zone site positions (tiles from the base) that replace SLOT_OFFSETS.
   */
  constructor(
    scene: Phaser.Scene,
    private readonly centerX: number,
    groundYAt: (x: number) => number,
    slotOverrides: Partial<Record<BuildingId, number>> = {},
  ) {
    const w = BASE_MODULE.widthTiles * TILE;
    const h = BASE_MODULE.heightTiles * TILE;
    const baseY = groundYAt(centerX);
    scene.add.rectangle(centerX, baseY - h / 2, w, h, BASE_MODULE.color, 0.12).setStrokeStyle(2, BASE_MODULE.color);
    this.hullLabel = scene.add
      .text(centerX, baseY - h - 10, '', { fontFamily: FONT, fontSize: '16px', color: TEXT.muted })
      .setOrigin(0.5, 1);

    for (const id of BUILDING_IDS) {
      const x = centerX + (slotOverrides[id] ?? SLOT_OFFSETS[id]) * TILE;
      const groundY = groundYAt(x);
      this.siteX[id] = x;
      this.boxes[id] = scene.add.rectangle(x, groundY - MACHINE_H / 2, MACHINE_W, MACHINE_H, COLOR_BY_BUILDING[id], 0);
      this.names[id] = scene.add
        .text(x, groundY - MACHINE_H - 6, '', { fontFamily: FONT, fontSize: '13px', color: TEXT.primary, align: 'center' })
        .setOrigin(0.5, 1);
      this.tags[id] = scene.add
        .text(x, groundY - MACHINE_H - 26, '', {
          fontFamily: FONT,
          fontSize: '14px',
          color: '#05060a',
          backgroundColor: READY_COLOR,
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5, 1)
        .setVisible(false);
      // The "ready" tag bobs so it catches the eye from far away.
      scene.tweens.add({ targets: this.tags[id], y: '-=6', duration: 500, yoyo: true, repeat: -1 });
    }
  }

  /** The site the astronaut can work at from world position x, or null. */
  siteAt(x: number): Site | null {
    if (Math.abs(x - this.centerX) <= this.hullHalfWidth) return { kind: 'ship' };
    for (const id of BUILDING_IDS) {
      if (Math.abs(x - this.siteX[id]) <= MACHINE_W / 2 + 8) return { kind: 'station', id };
    }
    return null;
  }

  update(state: GameState, config: ScenarioConfig): void {
    this.hullLabel.setText(state.shipUnpacked ? 'BASE' : 'NAVE');
    for (const id of BUILDING_IDS) {
      const def = config.buildings[id];
      const status = stationStatus(state, config, id);
      const color = COLOR_BY_BUILDING[id];
      const box = this.boxes[id];
      const tag = this.tags[id];

      // Sites only show up once the ship is dismantled.
      const visible = state.shipUnpacked;
      box.setVisible(visible);
      this.names[id].setVisible(visible);
      tag.setVisible(visible && status === 'ready');
      if (!visible) continue;

      if (status === 'unbuilt') {
        box.setFillStyle(color, 0).setStrokeStyle(1, color, 0.45);
        this.names[id].setText(`${def.nameEs}\n(sin construir)`).setColor(TEXT.muted);
        continue;
      }

      const percent = Math.round(stationProgress(state, config, id) * 100);
      box.setFillStyle(color, status === 'running' ? 0.35 : 0.18).setStrokeStyle(2, color, 1);
      this.names[id].setColor(TEXT.primary);
      if (def.kind === 'collector') {
        this.names[id].setText(`${def.nameEs}\n${Math.floor(state.stations[id].stored)} / ${def.storageCapacity}`);
        tag.setText('¡Listo! Recoger energía');
      } else {
        const detail = status === 'running' ? `en proceso ${percent} %` : status === 'ready' ? 'terminado' : 'en espera';
        this.names[id].setText(`${def.nameEs}\n${detail}`);
        tag.setText('¡Listo! Recoger');
      }
    }
  }

  /** Text for the prompt at the bottom of the screen: what E does here right now. */
  promptEs(site: Site, state: GameState, config: ScenarioConfig): string {
    if (site.kind === 'ship') {
      return state.shipUnpacked
        ? 'Base. Camina a un sitio para construir o trabajar.'
        : `[E] Desarmar la nave → ${formatAmounts(config.shipSalvage)}`;
    }
    if (!state.shipUnpacked) return '';
    const def = config.buildings[site.id];
    const status = stationStatus(state, config, site.id);

    if (status === 'unbuilt') {
      const blocker = buildBlocker(state, config, site.id);
      const head = `${def.nameEs}: ${def.descriptionEs}`;
      if (blocker) {
        const lacking = blocker.missing ? ` (${RESOURCE_NAMES_ES[blocker.missing]})` : '';
        return `${head}\n✗ ${blocker.textEs}${lacking} · cuesta ${formatAmounts(def.cost)}`;
      }
      return `${head}\n[E] Construir · cuesta ${formatAmounts(def.cost)}`;
    }

    if (def.kind === 'collector') {
      return `${def.nameEs}: ${Math.floor(state.stations[site.id].stored)} de energía guardada\n[E] Recoger energía`;
    }
    const job = def.job;
    if (!job) return def.nameEs;
    if (status === 'ready') return `${def.nameEs}: terminado\n[E] Recoger ${formatAmounts(job.outputs)}`;
    if (status === 'running') {
      const left = (state.stations[site.id].hoursLeft ?? 0).toFixed(1);
      return `${def.nameEs}: en proceso, faltan ${left} horas lunares`;
    }
    const lacking = startBlocker(state, config, site.id);
    const recipe = `usa ${formatAmounts(job.inputs)} → da ${formatAmounts(job.outputs)} en ${job.hours} h`;
    return lacking
      ? `${def.nameEs}: ${recipe}\n✗ Falta ${RESOURCE_NAMES_ES[lacking]}`
      : `${def.nameEs}: ${recipe}\n[E] Iniciar proceso`;
  }
}
