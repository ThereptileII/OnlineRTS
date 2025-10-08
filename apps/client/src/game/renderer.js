import { TILE_SIZE } from "../../../packages/shared/index.js";

const WATER_COLOR = "#043355";
const ISLAND_COLOR = "#2e3b22";
const UNIT_COLORS = {
  sloop: "#64d4ff",
  corvette: "#9de072",
  transport: "#ffd572"
};

export class MapRenderer {
  constructor(map) {
    this.map = map;
    this.tileCanvas = document.createElement("canvas");
    this.tileCanvas.width = map.width * TILE_SIZE;
    this.tileCanvas.height = map.height * TILE_SIZE;
    this.tileCtx = this.tileCanvas.getContext("2d");
    this.drawTiles();
  }

  drawTiles() {
    const ctx = this.tileCtx;
    ctx.fillStyle = WATER_COLOR;
    ctx.fillRect(0, 0, this.tileCanvas.width, this.tileCanvas.height);
    for (const tile of this.map.tiles) {
      if (!tile.walkable) {
        ctx.fillStyle = ISLAND_COLOR;
        ctx.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  drawTerrain(ctx) {
    ctx.drawImage(this.tileCanvas, 0, 0);
  }

  drawUnits(ctx, units) {
    for (const unit of units) {
      ctx.save();
      ctx.translate(unit.position.x * TILE_SIZE, unit.position.y * TILE_SIZE);
      ctx.beginPath();
      ctx.fillStyle = UNIT_COLORS[unit.type] ?? "#ffffff";
      const radius = (unit.selected ? 0.34 : 0.28) * TILE_SIZE;
      ctx.globalAlpha = unit.selected ? 1 : 0.85;
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawSelections(ctx, units) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    for (const unit of units) {
      if (!unit.selected) continue;
      ctx.beginPath();
      ctx.arc(unit.position.x * TILE_SIZE, unit.position.y * TILE_SIZE, TILE_SIZE * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDebugPath(ctx, path) {
    if (!path || path.length <= 1) return;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(96,240,255,0.7)";
    ctx.beginPath();
    for (let i = 0; i < path.length; i += 1) {
      const point = path[i];
      const x = point.x * TILE_SIZE;
      const y = point.y * TILE_SIZE;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}
