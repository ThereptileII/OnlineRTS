import { Container, Graphics, Sprite, Texture } from "pixi.js";
import type { Vector2, WorldMap } from "@seelines/shared";
import { TILE_SIZE } from "@seelines/shared";
import type { UnitEntity } from "./state";

const WATER_COLOR = 0x043355;
const ISLAND_COLOR = 0x2e3b22;
const PLAYER_UNIT_COLORS: Record<string, number> = {
  sloop: 0x64d4ff,
  corvette: 0x9de072,
  transport: 0xffd572,
  frigate: 0x7ef6ff,
  submarine: 0x7cb5ff,
  artilleryBarge: 0xc5f76f,
  destroyer: 0x7ee0c8,
  cruiser: 0x9fd6ff,
  escortCarrier: 0xffe0a0,
  marineDetachment: 0xfff1a8,
  decoyFloat: 0x9bb7ff
};
const COMPUTER_UNIT_COLORS: Record<string, number> = {
  sloop: 0xff7b7b,
  corvette: 0xffa36c,
  transport: 0xffe17a,
  frigate: 0xff9378,
  submarine: 0xffa4c0,
  artilleryBarge: 0xffd889,
  destroyer: 0xffad76,
  cruiser: 0xffc2a8,
  escortCarrier: 0xfff0ac,
  marineDetachment: 0xfff5bd,
  decoyFloat: 0xffbde3
};

interface RenderLogistics {
  convoys: Array<{
    id: string;
    lane: Vector2[];
    owner: UnitEntity["owner"];
    disrupted: boolean;
    weatherPenalty: number;
    progressPoint: Vector2;
  }>;
  storms: Array<{
    id: string;
    center: Vector2;
    radius: number;
    intensity: number;
  }>;
  islands: Array<{
    id: string;
    position: Vector2;
    pressure: number;
    owner: UnitEntity["owner"] | "neutral";
  }>;
}

export class MapRenderer {
  public readonly container = new Container();
  private readonly tileLayer = new Graphics();
  private readonly weatherLayer = new Graphics();
  private readonly logisticsLayer = new Graphics();
  private readonly unitLayer = new Container();
  private readonly selectionLayer = new Graphics();
  private readonly debugLayer = new Graphics();
  private readonly unitSprites: Map<number, Sprite> = new Map();

  constructor(private readonly map: WorldMap) {
    this.container.addChild(this.tileLayer);
    this.container.addChild(this.weatherLayer);
    this.container.addChild(this.logisticsLayer);
    this.container.addChild(this.unitLayer);
    this.container.addChild(this.selectionLayer);
    this.container.addChild(this.debugLayer);
    this.drawTiles();
  }

  private drawTiles(): void {
    this.tileLayer.clear();
    for (const tile of this.map.tiles) {
      this.tileLayer.beginFill(tile.walkable ? WATER_COLOR : ISLAND_COLOR);
      this.tileLayer.drawRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      this.tileLayer.endFill();
    }
  }

  updateUnits(units: UnitEntity[]): void {
    const existingIds = new Set(this.unitSprites.keys());
    for (const unit of units) {
      existingIds.delete(unit.id);
      let sprite = this.unitSprites.get(unit.id);
      if (!sprite) {
        sprite = new Sprite(Texture.WHITE);
        sprite.anchor.set(0.5);
        sprite.width = TILE_SIZE * 0.6;
        sprite.height = TILE_SIZE * 0.6;
        this.unitLayer.addChild(sprite);
        this.unitSprites.set(unit.id, sprite);
      }
      const tintPalette = unit.owner === "computer" ? COMPUTER_UNIT_COLORS : PLAYER_UNIT_COLORS;
      sprite.tint = tintPalette[unit.type] ?? 0xffffff;
      sprite.position.set(unit.position.x * TILE_SIZE, unit.position.y * TILE_SIZE);
      sprite.alpha = unit.selected ? 1 : 0.85;
      sprite.scale.set(unit.selected ? 0.75 : 0.6);
    }

    for (const staleId of existingIds) {
      const sprite = this.unitSprites.get(staleId);
      if (sprite) {
        sprite.destroy();
      }
      this.unitSprites.delete(staleId);
    }
  }

  renderSelections(units: UnitEntity[]): void {
    this.selectionLayer.clear();
    for (const unit of units) {
      if (!unit.selected) continue;
      this.selectionLayer.lineStyle({ width: 2, color: 0xffffff, alpha: 0.8 });
      this.selectionLayer.drawCircle(unit.position.x * TILE_SIZE, unit.position.y * TILE_SIZE, TILE_SIZE * 0.45);
    }
  }

  renderDebugPath(path: { x: number; y: number }[] | undefined): void {
    this.debugLayer.clear();
    if (!path || path.length <= 1) {
      return;
    }
    this.debugLayer.lineStyle({ width: 2, color: 0x60f0ff, alpha: 0.7 });
    for (let i = 0; i < path.length - 1; i += 1) {
      const from = path[i];
      const to = path[i + 1];
      this.debugLayer.moveTo(from.x * TILE_SIZE, from.y * TILE_SIZE);
      this.debugLayer.lineTo(to.x * TILE_SIZE, to.y * TILE_SIZE);
    }
  }

  renderStrategic(logistics: RenderLogistics): void {
    this.weatherLayer.clear();
    this.logisticsLayer.clear();

    for (const storm of logistics.storms) {
      const color = 0x4bbdff;
      const alpha = 0.12 + storm.intensity * 0.18;
      this.weatherLayer.beginFill(color, alpha);
      this.weatherLayer.drawCircle(storm.center.x * TILE_SIZE, storm.center.y * TILE_SIZE, storm.radius * TILE_SIZE);
      this.weatherLayer.endFill();
      this.weatherLayer.lineStyle({ width: 2, color: 0x7ee6ff, alpha: 0.35 });
      this.weatherLayer.drawCircle(storm.center.x * TILE_SIZE, storm.center.y * TILE_SIZE, storm.radius * TILE_SIZE);
    }

    for (const convoy of logistics.convoys) {
      const color = convoy.owner === "player" ? 0x6cf0ff : 0xff9c66;
      const alpha = convoy.disrupted ? 0.4 : 0.8;
      this.logisticsLayer.lineStyle({ width: 3, color, alpha });
      for (let i = 0; i < convoy.lane.length - 1; i += 1) {
        const from = convoy.lane[i]!;
        const to = convoy.lane[i + 1]!;
        this.logisticsLayer.moveTo(from.x * TILE_SIZE, from.y * TILE_SIZE);
        this.logisticsLayer.lineTo(to.x * TILE_SIZE, to.y * TILE_SIZE);
      }
      const marker = convoy.progressPoint;
      this.logisticsLayer.beginFill(color, convoy.disrupted ? 0.35 : 0.9);
      this.logisticsLayer.drawCircle(marker.x * TILE_SIZE, marker.y * TILE_SIZE, TILE_SIZE * 0.25);
      this.logisticsLayer.endFill();
    }

    for (const island of logistics.islands) {
      const pressureAlpha = Math.min(1, Math.max(0, island.pressure / 100));
      const color = island.owner === "player" ? 0x6be1ff : island.owner === "computer" ? 0xff8a64 : 0xb7bfc4;
      this.logisticsLayer.lineStyle({ width: 2, color, alpha: 0.5 + pressureAlpha * 0.4 });
      this.logisticsLayer.drawCircle(island.position.x * TILE_SIZE, island.position.y * TILE_SIZE, TILE_SIZE * 0.65);
    }
  }
}
