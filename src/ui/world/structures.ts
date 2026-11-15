import Phaser from 'phaser';
import { buildBlocker, startBlocker } from '../../sim/actions';
import { stationProgress, stationStatus } from '../../sim/processes';
import { nextSupplyDay, pendingSupplies } from '../../sim/resupply';
import { labBlockers } from '../../sim/victory';
import { failureChancePerWeek } from '../../sim/failures';
import { BUILDING_IDS, type BuildingId, type GameState, type ScenarioConfig, type WorkKind } from '../../sim/types';
import { formatAmounts, RESOURCE_NAMES_ES } from '../labels';
import { FONT, TEXT } from '../theme';
import { BASE_MODULE, TILE } from './constants';

// One site per station, in tiles from the base center. Boxes are placeholders until we have sprites.
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
/** The research lab: the last thing built, it wins the mission. */
const LAB_OFFSET = 19;
const LAB_COLOR = 0xc58cff;
/** Landing pad for the supply ships, mirrored on the other side of the base. */
const PAD_OFFSET = -19;
const PAD_COLOR = 0xd8dde8;
const MACHINE_W = 3 * TILE;
const MACHINE_H = 2 * TILE;
const READY_COLOR = '#7fffa0';
const BROKEN_COLOR = '#ff8a8a';

/** "8 h" for a task, from its duration in Earth hours. */
const taskHours = (config: ScenarioConfig, kind: WorkKind) => `${config.workHours[kind]} h`;

/** Tiles to keep flat on each side of the base so every site fits. */
export const PAD_RADIUS_TILES = 25;

/** What the astronaut is standing at. */
export type Site = { kind: 'ship' } | { kind: 'lab' } | { kind: 'supply' } | { kind: 'station'; id: BuildingId };

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
  private readonly labX: number;
  private readonly labBox: Phaser.GameObjects.Rectangle;
  private readonly labName: Phaser.GameObjects.Text;
  private readonly labTag: Phaser.GameObjects.Text;
  private readonly padX: number;
  private readonly padShip: Phaser.GameObjects.Rectangle;
  private readonly padName: Phaser.GameObjects.Text;
  private readonly padTag: Phaser.GameObjects.Text;

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

    this.labX = centerX + LAB_OFFSET * TILE;
    const labY = groundYAt(this.labX);
    this.labBox = scene.add.rectangle(this.labX, labY - MACHINE_H / 2, MACHINE_W, MACHINE_H, LAB_COLOR, 0);
    this.labName = scene.add
      .text(this.labX, labY - MACHINE_H - 6, '', { fontFamily: FONT, fontSize: '13px', color: TEXT.muted, align: 'center' })
      .setOrigin(0.5, 1);
    this.labTag = scene.add
      .text(this.labX, labY - MACHINE_H - 26, '¡Listo para construir!', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#05060a',
        backgroundColor: READY_COLOR,
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);
    scene.tweens.add({ targets: this.labTag, y: '-=6', duration: 500, yoyo: true, repeat: -1 });

    this.padX = centerX + PAD_OFFSET * TILE;
    const padY = groundYAt(this.padX);
    scene.add.rectangle(this.padX, padY - 3, MACHINE_W + TILE, 6, PAD_COLOR, 0.35);
    // The supply ship is smaller than the arrival ship: it carries no crew.
    this.padShip = scene.add.rectangle(this.padX, padY - TILE, 2 * TILE, 2 * TILE, PAD_COLOR, 0.12).setStrokeStyle(2, PAD_COLOR);
    this.padName = scene.add
      .text(this.padX, padY - MACHINE_H - 6, '', { fontFamily: FONT, fontSize: '13px', color: TEXT.muted, align: 'center' })
      .setOrigin(0.5, 1);
    this.padTag = scene.add
      .text(this.padX, padY - MACHINE_H - 26, '¡Llegó suministro!', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#05060a',
        backgroundColor: READY_COLOR,
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);
    scene.tweens.add({ targets: this.padTag, y: '-=6', duration: 500, yoyo: true, repeat: -1 });
  }

  /** The site the astronaut can work at from world position x, or null. */
  siteAt(x: number): Site | null {
    if (Math.abs(x - this.centerX) <= this.hullHalfWidth) return { kind: 'ship' };
    if (Math.abs(x - this.labX) <= MACHINE_W / 2 + 8) return { kind: 'lab' };
    if (Math.abs(x - this.padX) <= MACHINE_W / 2 + 8) return { kind: 'supply' };
    for (const id of BUILDING_IDS) {
      if (Math.abs(x - this.siteX[id]) <= MACHINE_W / 2 + 8) return { kind: 'station', id };
    }
    return null;
  }

  update(state: GameState, config: ScenarioConfig): void {
    this.hullLabel.setText(state.shipUnpacked ? 'BASE' : 'NAVE');

    const pending = pendingSupplies(state, config);
    const padVisible = state.shipUnpacked;
    this.padShip.setVisible(padVisible && pending > 0);
    this.padName.setVisible(padVisible);
    this.padTag.setVisible(padVisible && pending > 0 && state.status === 'playing');
    this.padName
      .setText(pending > 0 ? 'Nave de suministros' : `Pista de aterrizaje\n(próxima nave: día ${nextSupplyDay(state, config)})`)
      .setColor(pending > 0 ? TEXT.primary : TEXT.muted);

    const lab = config.victory.lab;
    const labVisible = state.shipUnpacked;
    const labReady = labVisible && labBlockers(state, config).length === 0;
    this.labBox.setVisible(labVisible);
    this.labName.setVisible(labVisible);
    this.labTag.setVisible(labReady && state.status === 'playing');
    if (state.status === 'won') {
      this.labBox.setFillStyle(LAB_COLOR, 0.35).setStrokeStyle(2, LAB_COLOR, 1);
      this.labName.setText(lab.nameEs).setColor(TEXT.primary);
    } else {
      this.labBox.setFillStyle(LAB_COLOR, 0).setStrokeStyle(labReady ? 2 : 1, LAB_COLOR, labReady ? 1 : 0.45);
      this.labName
        .setText(`${lab.nameEs}\n(día ${config.victory.missionDays})`)
        .setColor(labReady ? TEXT.primary : TEXT.muted);
    }

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
      tag.setVisible(visible && (status === 'ready' || status === 'broken'));
      tag.setBackgroundColor(status === 'broken' ? BROKEN_COLOR : READY_COLOR);
      if (!visible) continue;

      if (status === 'unbuilt') {
        box.setFillStyle(color, 0).setStrokeStyle(1, color, 0.45);
        this.names[id].setText(`${def.nameEs}\n(sin construir)`).setColor(TEXT.muted);
        continue;
      }
      if (status === 'broken') {
        box.setFillStyle(0xff5d5d, 0.25).setStrokeStyle(2, 0xff5d5d, 1);
        this.names[id].setText(`${def.nameEs}\nAVERIADA`).setColor(TEXT.warning);
        tag.setText('¡Averiada! Reparar');
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
        : `[E] Desarmar la nave (${taskHours(config, 'unpack_ship')}) → ${formatAmounts(config.shipSalvage)}`;
    }
    if (site.kind === 'supply') {
      if (!state.shipUnpacked) return '';
      return pendingSupplies(state, config) > 0
        ? `Nave de suministros\n[E] Desarmar (${taskHours(config, 'unpack_supply')}) → ${formatAmounts(config.resupply.contents)}`
        : `Pista de aterrizaje: cada ${config.resupply.intervalDays} días llega una nave con minerales, sustrato y semillas.\nPróxima nave: día ${nextSupplyDay(state, config)}`;
    }
    if (site.kind === 'lab') {
      if (!state.shipUnpacked) return '';
      const lab = config.victory.lab;
      const blockers = labBlockers(state, config);
      const head = `${lab.nameEs}: ${lab.descriptionEs}`;
      const cost = `cuesta ${formatAmounts(lab.cost)}`;
      return blockers.length > 0
        ? `${head}\n✗ ${blockers.join(' · ')} · ${cost}`
        : `${head}\n[E] Construir (${taskHours(config, 'build_lab')}) · ${cost}`;
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
      return `${head}\n[E] Construir (${taskHours(config, 'build')}) · cuesta ${formatAmounts(def.cost)}`;
    }
    if (status === 'broken') {
      return `${def.nameEs}: averiada, no funciona.\n[E] Reparar (${taskHours(config, 'repair')})`;
    }

    const risk = Math.round(failureChancePerWeek(state, config, site.id) * 100);
    const upkeep = `[R] Mantenimiento (${taskHours(config, 'maintain')}) · riesgo de falla ${risk} %/semana`;
    const operateHours = taskHours(config, 'operate');
    if (def.kind === 'collector') {
      const stored = Math.floor(state.stations[site.id].stored);
      return `${def.nameEs}: ${stored} de energía guardada\n[E] Recoger energía (${operateHours}) · ${upkeep}`;
    }
    const job = def.job;
    if (!job) return def.nameEs;
    if (status === 'ready') {
      return `${def.nameEs}: terminado\n[E] Recoger ${formatAmounts(job.outputs)} (${operateHours}) · ${upkeep}`;
    }
    if (status === 'running') {
      const left = (state.stations[site.id].hoursLeft ?? 0).toFixed(1);
      return `${def.nameEs}: en proceso, faltan ${left} horas lunares\n${upkeep}`;
    }
    const lacking = startBlocker(state, config, site.id);
    const recipe = `usa ${formatAmounts(job.inputs)} → da ${formatAmounts(job.outputs)} en ${job.hours} h lunares`;
    return lacking
      ? `${def.nameEs}: ${recipe}\n✗ Falta ${RESOURCE_NAMES_ES[lacking]} · ${upkeep}`
      : `${def.nameEs}: ${recipe}\n[E] Iniciar tanda (${operateHours}) · ${upkeep}`;
  }
}
