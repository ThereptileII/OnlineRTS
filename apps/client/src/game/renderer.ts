import { Container, Graphics, Sprite, Texture } from "pixi.js";
import type { WorldMap } from "@seelines/shared";
import { TILE_SIZE } from "@seelines/shared";
import type { UnitEntity } from "./state";

const WATER_COLOR = 0x043355;
const ISLAND_COLOR = 0x2e3b22;
const PLAYER_UNIT_COLORS: Record<string, number> = {
  sloop: 0x64d4ff,
  corvette: 0x9de072,
  transport: 0xffd572
};
const COMPUTER_UNIT_COLORS: Record<string, number> = {
  sloop: 0xff7b7b,
  corvette: 0xffa36c,
  transport: 0xffe17a
};

export class MapRenderer {
  public readonly container = new Container();
  private readonly tileLayer = new Graphics();
  private readonly unitLayer = new Container();
  private readonly selectionLayer = new Graphics();
  private readonly debugLayer = new Graphics();
  private readonly unitSprites: Map<number, Sprite> = new Map();

  constructor(private readonly map: WorldMap) {
    this.container.addChild(this.tileLayer);
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
      sprite.tint = tintPalette[unit.type];
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
}
