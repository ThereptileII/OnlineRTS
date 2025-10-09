export type UnitRole =
  | "scout"
  | "escort"
  | "transport"
  | "line"
  | "siege"
  | "capital"
  | "support"
  | "special";

export type UnitType =
  | "sloop"
  | "corvette"
  | "transport"
  | "frigate"
  | "submarine"
  | "artilleryBarge"
  | "destroyer"
  | "cruiser"
  | "escortCarrier"
  | "marineDetachment"
  | "decoyFloat";

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
  },
  frigate: {
    type: "frigate",
    displayName: "Frigate",
    role: "line",
    maxSpeed: 3.1,
    visionRange: 6.5,
    hitpoints: 180,
    acceleration: 11
  },
  submarine: {
    type: "submarine",
    displayName: "Submarine",
    role: "special",
    maxSpeed: 2.4,
    visionRange: 5.5,
    hitpoints: 140,
    acceleration: 8
  },
  artilleryBarge: {
    type: "artilleryBarge",
    displayName: "Artillery Barge",
    role: "siege",
    maxSpeed: 1.8,
    visionRange: 5,
    hitpoints: 170,
    acceleration: 6
  },
  destroyer: {
    type: "destroyer",
    displayName: "Destroyer",
    role: "line",
    maxSpeed: 3.4,
    visionRange: 6.8,
    hitpoints: 260,
    acceleration: 10
  },
  cruiser: {
    type: "cruiser",
    displayName: "Cruiser",
    role: "capital",
    maxSpeed: 2.9,
    visionRange: 7.4,
    hitpoints: 420,
    acceleration: 7
  },
  escortCarrier: {
    type: "escortCarrier",
    displayName: "Escort Carrier",
    role: "support",
    maxSpeed: 2.6,
    visionRange: 7.8,
    hitpoints: 360,
    acceleration: 6
  },
  marineDetachment: {
    type: "marineDetachment",
    displayName: "Marine Detachment",
    role: "special",
    maxSpeed: 2.1,
    visionRange: 4.5,
    hitpoints: 65,
    acceleration: 8
  },
  decoyFloat: {
    type: "decoyFloat",
    displayName: "Decoy Float",
    role: "special",
    maxSpeed: 3.2,
    visionRange: 0,
    hitpoints: 20,
    acceleration: 14
  }
};

export type BuildingType =
  | "hqHarbor"
  | "warehouse"
  | "powerWind"
  | "powerSolar"
  | "powerWave"
  | "shipyard"
  | "drydock"
  | "tradePost"
  | "coastalBattery"
  | "radar"
  | "airDock"
  | "mineDepot"
  | "commsJammer";

export interface BuildingDefinition {
  type: BuildingType;
  displayName: string;
  category: "core" | "logistics" | "defense" | "technology";
  baseTier: 0 | 1 | 2 | 3;
  supplyDemand: number;
  supplyCapacity: number;
  pressureBonus: number;
  powerOutput: number;
  description: string;
}

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDefinition> = {
  hqHarbor: {
    type: "hqHarbor",
    displayName: "HQ Harbor",
    category: "core",
    baseTier: 0,
    supplyDemand: 6,
    supplyCapacity: 28,
    pressureBonus: 8,
    powerOutput: 4,
    description: "Primary command harbor providing staging and logistics throughput."
  },
  warehouse: {
    type: "warehouse",
    displayName: "Warehouse",
    category: "logistics",
    baseTier: 1,
    supplyDemand: 2,
    supplyCapacity: 18,
    pressureBonus: 12,
    powerOutput: 0,
    description: "Storage and distribution hub that boosts supply pressure via adjacency."
  },
  powerWind: {
    type: "powerWind",
    displayName: "Wind Turbine",
    category: "core",
    baseTier: 1,
    supplyDemand: 1,
    supplyCapacity: 4,
    pressureBonus: 3,
    powerOutput: 12,
    description: "Reliable wind generation that thrives in rough weather."
  },
  powerSolar: {
    type: "powerSolar",
    displayName: "Solar Array",
    category: "core",
    baseTier: 1,
    supplyDemand: 1,
    supplyCapacity: 3,
    pressureBonus: 2,
    powerOutput: 10,
    description: "Calm-day energy option with minimal upkeep."
  },
  powerWave: {
    type: "powerWave",
    displayName: "Wave Generator",
    category: "core",
    baseTier: 1,
    supplyDemand: 2,
    supplyCapacity: 6,
    pressureBonus: 4,
    powerOutput: 16,
    description: "Storm-fueled generator delivering spikes of energy during squalls."
  },
  shipyard: {
    type: "shipyard",
    displayName: "Shipyard",
    category: "logistics",
    baseTier: 1,
    supplyDemand: 5,
    supplyCapacity: 15,
    pressureBonus: 10,
    powerOutput: -4,
    description: "Produces hulls and determines the tier of vessels available."
  },
  drydock: {
    type: "drydock",
    displayName: "Drydock",
    category: "logistics",
    baseTier: 1,
    supplyDemand: 3,
    supplyCapacity: 8,
    pressureBonus: 6,
    powerOutput: -2,
    description: "Accelerates repairs at the cost of fuel and supply throughput."
  },
  tradePost: {
    type: "tradePost",
    displayName: "Trade Post",
    category: "logistics",
    baseTier: 1,
    supplyDemand: 2,
    supplyCapacity: 4,
    pressureBonus: 8,
    powerOutput: 1,
    description: "Generates credits by exchanging surplus goods with neutral traders."
  },
  coastalBattery: {
    type: "coastalBattery",
    displayName: "Coastal Battery",
    category: "defense",
    baseTier: 1,
    supplyDemand: 4,
    supplyCapacity: 2,
    pressureBonus: 5,
    powerOutput: -3,
    description: "Shore-based artillery requiring spotting and power to stay active."
  },
  radar: {
    type: "radar",
    displayName: "Radar Station",
    category: "technology",
    baseTier: 1,
    supplyDemand: 2,
    supplyCapacity: 3,
    pressureBonus: 7,
    powerOutput: -1,
    description: "Extends detection radius and improves response to stealth threats."
  },
  airDock: {
    type: "airDock",
    displayName: "Air Dock",
    category: "technology",
    baseTier: 2,
    supplyDemand: 4,
    supplyCapacity: 6,
    pressureBonus: 11,
    powerOutput: -4,
    description: "Launches recon drones and decoys providing aerial intelligence."
  },
  mineDepot: {
    type: "mineDepot",
    displayName: "Mine Depot",
    category: "defense",
    baseTier: 2,
    supplyDemand: 3,
    supplyCapacity: 2,
    pressureBonus: 6,
    powerOutput: -2,
    description: "Maintains sea mine networks to disrupt hostile lanes."
  },
  commsJammer: {
    type: "commsJammer",
    displayName: "Comms Jammer",
    category: "technology",
    baseTier: 2,
    supplyDemand: 3,
    supplyCapacity: 2,
    pressureBonus: 9,
    powerOutput: -3,
    description: "Disrupts enemy orders and delays sensor refresh cycles."
  }
};

export interface IslandBuildingState {
  type: BuildingType;
  tier: 1 | 2 | 3;
}

export interface IslandDefinition {
  id: string;
  name: string;
  owner: "player" | "computer" | "neutral";
  position: Vector2;
  baseDemand: number;
  baseCapacity: number;
  initialPressure: number;
  storage: number;
  buildings: IslandBuildingState[];
}

export interface ConvoyTemplate {
  id: string;
  owner: "player" | "computer";
  origin: string;
  destination: string;
  lane: Vector2[];
  throughput: number;
  speed: number;
  resilience: number;
}

export interface StormTemplate {
  id: string;
  center: Vector2;
  radius: number;
  intensity: number;
  velocity: Vector2;
  duration: number;
}

export interface LogisticsPreset {
  islands: IslandDefinition[];
  convoys: ConvoyTemplate[];
  storms: StormTemplate[];
}

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
export { createDefaultLogistics } from "./logistics.js";

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
