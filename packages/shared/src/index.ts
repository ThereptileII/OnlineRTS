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
  supplyCost: number;
  buildTime: number;
  buildCost: number;
  productionTier: 1 | 2 | 3;
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
    acceleration: 18,
    supplyCost: 2,
    buildTime: 10,
    buildCost: 120,
    productionTier: 1
  },
  corvette: {
    type: "corvette",
    displayName: "Corvette",
    role: "escort",
    maxSpeed: 3.5,
    visionRange: 6,
    hitpoints: 120,
    acceleration: 12,
    supplyCost: 3,
    buildTime: 14,
    buildCost: 220,
    productionTier: 1
  },
  transport: {
    type: "transport",
    displayName: "Transport",
    role: "transport",
    maxSpeed: 2.75,
    visionRange: 5,
    hitpoints: 80,
    acceleration: 10,
    supplyCost: 2,
    buildTime: 12,
    buildCost: 180,
    productionTier: 1
  },
  frigate: {
    type: "frigate",
    displayName: "Frigate",
    role: "line",
    maxSpeed: 3.1,
    visionRange: 6.5,
    hitpoints: 180,
    acceleration: 11,
    supplyCost: 4,
    buildTime: 18,
    buildCost: 320,
    productionTier: 2
  },
  submarine: {
    type: "submarine",
    displayName: "Submarine",
    role: "special",
    maxSpeed: 2.4,
    visionRange: 5.5,
    hitpoints: 140,
    acceleration: 8,
    supplyCost: 4,
    buildTime: 20,
    buildCost: 360,
    productionTier: 2
  },
  artilleryBarge: {
    type: "artilleryBarge",
    displayName: "Artillery Barge",
    role: "siege",
    maxSpeed: 1.8,
    visionRange: 5,
    hitpoints: 170,
    acceleration: 6,
    supplyCost: 5,
    buildTime: 22,
    buildCost: 410,
    productionTier: 2
  },
  destroyer: {
    type: "destroyer",
    displayName: "Destroyer",
    role: "line",
    maxSpeed: 3.4,
    visionRange: 6.8,
    hitpoints: 260,
    acceleration: 10,
    supplyCost: 5,
    buildTime: 24,
    buildCost: 480,
    productionTier: 3
  },
  cruiser: {
    type: "cruiser",
    displayName: "Cruiser",
    role: "capital",
    maxSpeed: 2.9,
    visionRange: 7.4,
    hitpoints: 420,
    acceleration: 7,
    supplyCost: 6,
    buildTime: 28,
    buildCost: 620,
    productionTier: 3
  },
  escortCarrier: {
    type: "escortCarrier",
    displayName: "Escort Carrier",
    role: "support",
    maxSpeed: 2.6,
    visionRange: 7.8,
    hitpoints: 360,
    acceleration: 6,
    supplyCost: 7,
    buildTime: 32,
    buildCost: 700,
    productionTier: 3
  },
  marineDetachment: {
    type: "marineDetachment",
    displayName: "Marine Detachment",
    role: "special",
    maxSpeed: 2.1,
    visionRange: 4.5,
    hitpoints: 65,
    acceleration: 8,
    supplyCost: 1,
    buildTime: 10,
    buildCost: 140,
    productionTier: 2
  },
  decoyFloat: {
    type: "decoyFloat",
    displayName: "Decoy Float",
    role: "special",
    maxSpeed: 3.2,
    visionRange: 0,
    hitpoints: 20,
    acceleration: 14,
    supplyCost: 1,
    buildTime: 6,
    buildCost: 80,
    productionTier: 1
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
  buildCost: number;
  buildTime: number;
  creditYield: number;
  maxTier: 1 | 2 | 3;
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
    description: "Primary command harbor providing staging and logistics throughput.",
    buildCost: 0,
    buildTime: 0,
    creditYield: 2,
    maxTier: 1
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
    description: "Storage and distribution hub that boosts supply pressure via adjacency.",
    buildCost: 220,
    buildTime: 20,
    creditYield: 0,
    maxTier: 3
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
    description: "Reliable wind generation that thrives in rough weather.",
    buildCost: 160,
    buildTime: 16,
    creditYield: 0,
    maxTier: 2
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
    description: "Calm-day energy option with minimal upkeep.",
    buildCost: 150,
    buildTime: 14,
    creditYield: 0,
    maxTier: 2
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
    description: "Storm-fueled generator delivering spikes of energy during squalls.",
    buildCost: 260,
    buildTime: 24,
    creditYield: 0,
    maxTier: 2
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
    description: "Produces hulls and determines the tier of vessels available.",
    buildCost: 320,
    buildTime: 28,
    creditYield: 0,
    maxTier: 3
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
    description: "Accelerates repairs at the cost of fuel and supply throughput.",
    buildCost: 210,
    buildTime: 18,
    creditYield: 0,
    maxTier: 2
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
    description: "Generates credits by exchanging surplus goods with neutral traders.",
    buildCost: 280,
    buildTime: 26,
    creditYield: 6,
    maxTier: 2
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
    description: "Shore-based artillery requiring spotting and power to stay active.",
    buildCost: 240,
    buildTime: 24,
    creditYield: 0,
    maxTier: 2
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
    description: "Extends detection radius and improves response to stealth threats.",
    buildCost: 220,
    buildTime: 18,
    creditYield: 0,
    maxTier: 2
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
    description: "Launches recon drones and decoys providing aerial intelligence.",
    buildCost: 360,
    buildTime: 30,
    creditYield: 0,
    maxTier: 2
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
    description: "Maintains sea mine networks to disrupt hostile lanes.",
    buildCost: 300,
    buildTime: 28,
    creditYield: 0,
    maxTier: 2
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
    description: "Disrupts enemy orders and delays sensor refresh cycles.",
    buildCost: 320,
    buildTime: 28,
    creditYield: 0,
    maxTier: 2
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
