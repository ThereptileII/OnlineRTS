import type {
  ConvoyTemplate,
  IslandBuildingState,
  IslandDefinition,
  LogisticsPreset,
  StormTemplate,
  Vector2
} from "./index.js";

const lane = (points: [number, number][]): Vector2[] =>
  points.map(([x, y]) => ({ x, y }));

const buildings = (entries: Array<[IslandBuildingState["type"], IslandBuildingState["tier"]]>): IslandBuildingState[] =>
  entries.map(([type, tier]) => ({ type, tier }));

export const createDefaultLogistics = (): LogisticsPreset => {
  const islands: IslandDefinition[] = [
    {
      id: "blue-hq",
      name: "Blue Anchorage",
      owner: "player",
      position: { x: 4, y: 14.5 },
      baseDemand: 12,
      baseCapacity: 38,
      initialPressure: 68,
      storage: 60,
      buildings: buildings([
        ["hqHarbor", 1],
        ["warehouse", 2],
        ["powerWind", 1],
        ["shipyard", 1]
      ])
    },
    {
      id: "blue-forward",
      name: "Seaglass Outpost",
      owner: "player",
      position: { x: 9.5, y: 9.5 },
      baseDemand: 9,
      baseCapacity: 24,
      initialPressure: 52,
      storage: 36,
      buildings: buildings([
        ["warehouse", 1],
        ["coastalBattery", 1],
        ["powerSolar", 1]
      ])
    },
    {
      id: "trade-atoll",
      name: "Trader's Cay",
      owner: "neutral",
      position: { x: 12, y: 4 },
      baseDemand: 7,
      baseCapacity: 18,
      initialPressure: 40,
      storage: 28,
      buildings: buildings([
        ["tradePost", 1],
        ["powerSolar", 1]
      ])
    },
    {
      id: "red-hq",
      name: "Crimson Pier",
      owner: "computer",
      position: { x: 20, y: 5 },
      baseDemand: 13,
      baseCapacity: 38,
      initialPressure: 65,
      storage: 60,
      buildings: buildings([
        ["hqHarbor", 1],
        ["warehouse", 2],
        ["powerWave", 1],
        ["shipyard", 1]
      ])
    },
    {
      id: "red-forward",
      name: "Stormgate Battery",
      owner: "computer",
      position: { x: 16.5, y: 10.5 },
      baseDemand: 10,
      baseCapacity: 26,
      initialPressure: 50,
      storage: 40,
      buildings: buildings([
        ["coastalBattery", 1],
        ["radar", 1],
        ["powerWind", 1]
      ])
    }
  ];

  const convoys: ConvoyTemplate[] = [
    {
      id: "blue-supply-main",
      owner: "player",
      origin: "blue-hq",
      destination: "blue-forward",
      lane: lane([
        [4, 14],
        [6, 13],
        [7.5, 12],
        [8.6, 10.5],
        [9.4, 9.6]
      ]),
      throughput: 4.5,
      speed: 1.4,
      resilience: 0.65
    },
    {
      id: "blue-trade",
      owner: "player",
      origin: "blue-forward",
      destination: "trade-atoll",
      lane: lane([
        [9.4, 9.6],
        [10.5, 8.1],
        [11.5, 6.5],
        [12, 4.5]
      ]),
      throughput: 2.2,
      speed: 1.2,
      resilience: 0.45
    },
    {
      id: "red-supply-main",
      owner: "computer",
      origin: "red-hq",
      destination: "red-forward",
      lane: lane([
        [20, 5],
        [18.7, 6.8],
        [17.4, 8.6],
        [16.6, 9.9]
      ]),
      throughput: 4.2,
      speed: 1.35,
      resilience: 0.65
    },
    {
      id: "red-trade",
      owner: "computer",
      origin: "red-forward",
      destination: "trade-atoll",
      lane: lane([
        [16.6, 9.9],
        [15.2, 8.5],
        [13.8, 6.8],
        [12, 4.5]
      ]),
      throughput: 2.1,
      speed: 1.15,
      resilience: 0.45
    }
  ];

  const storms: StormTemplate[] = [
    {
      id: "squall-east",
      center: { x: 14, y: 7 },
      radius: 2.8,
      intensity: 0.55,
      velocity: { x: -0.12, y: 0.04 },
      duration: 32
    },
    {
      id: "gale-west",
      center: { x: 6, y: 11 },
      radius: 2.2,
      intensity: 0.48,
      velocity: { x: 0.09, y: -0.06 },
      duration: 28
    }
  ];

  return {
    islands,
    convoys,
    storms
  } satisfies LogisticsPreset;
};

