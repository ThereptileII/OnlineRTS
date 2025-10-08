import { createSkirmishMap } from "./maps.js";
import { findPath } from "./pathfinding.js";

export const UNIT_DEFINITIONS = {
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

export const mapTileIndex = (map, x, y) => y * map.width + x;

export const getTile = (map, x, y) => {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return undefined;
  }
  return map.tiles[mapTileIndex(map, x, y)];
};

export const isWalkable = (map, x, y) => {
  const tile = getTile(map, x, y);
  return tile ? tile.walkable : false;
};

export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const createId = (length = 8) => {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  const randomSource = typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues
    ? () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
    : () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  for (let i = 0; i < length; i += 1) {
    const value = randomSource();
    const index = value % alphabet.length;
    result += alphabet.charAt(index);
  }
  return result;
};

export { createSkirmishMap, findPath };
