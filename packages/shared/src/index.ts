export type UnitRole = "scout" | "escort" | "transport";

export type UnitType = "sloop" | "corvette" | "transport";

export interface UnitDefinition {
  type: UnitType;
  displayName: string;
  role: UnitRole;
  maxSpeed: number;
  visionRange: number;
  hitpoints: number;
  acceleration: number;
}

export interface OrderTargetPoint {
  kind: "point";
  x: number;
  y: number;
}

export interface OrderTargetUnit {
  kind: "unit";
  unitId: number;
}

export type OrderTarget = OrderTargetPoint | OrderTargetUnit;

export type OrderType = "move" | "patrol" | "escort";

export interface Order {
  id: string;
  type: OrderType;
  target: OrderTarget;
  metadata?: Record<string, unknown>;
}

export interface MapTile {
  x: number;
  y: number;
  walkable: boolean;
  kind: "water" | "island";
}

export interface WorldMap {
  width: number;
  height: number;
  tiles: MapTile[];
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface UnitSnapshot {
  id: number;
  type: UnitType;
  position: Vector2;
  velocity: Vector2;
  orders: Order[];
}

export interface GameSnapshot {
  tick: number;
  units: UnitSnapshot[];
}

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
  sloop: {
    type: "sloop",
    displayName: "Sloop",
    role: "scout",
    maxSpeed: 4.5,
    visionRange: 7,
    hitpoints: 60,
    acceleration: 18
  },
  corvette: {
    type: "corvette",
    displayName: "Corvette",
    role: "escort",
    maxSpeed: 3.5,
    visionRange: 6,
    hitpoints: 120,
    acceleration: 12
  },
  transport: {
    type: "transport",
    displayName: "Transport",
    role: "transport",
    maxSpeed: 2.75,
    visionRange: 5,
    hitpoints: 80,
    acceleration: 10
  }
};

export const TILE_SIZE = 32;

export const mapTileIndex = (map: WorldMap, x: number, y: number): number => y * map.width + x;

export const getTile = (map: WorldMap, x: number, y: number): MapTile | undefined => {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return undefined;
  }
  const tile = map.tiles[mapTileIndex(map, x, y)];
  return tile;
};

export const isWalkable = (map: WorldMap, x: number, y: number): boolean => {
  const tile = getTile(map, x, y);
  return tile ? tile.walkable : false;
};

export const manhattan = (a: Vector2, b: Vector2): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const distance = (a: Vector2, b: Vector2): number => Math.hypot(a.x - b.x, a.y - b.y);

export { createSkirmishMap } from "./maps.js";
