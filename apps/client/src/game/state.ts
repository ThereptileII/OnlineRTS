import type {
  ConvoyTemplate,
  IslandDefinition,
  Order,
  OrderTargetUnit,
  StormTemplate,
  UnitDefinition,
  UnitSnapshot,
  UnitType,
  Vector2,
  WorldMap
} from "@seelines/shared";
import {
  BUILDING_DEFINITIONS,
  UNIT_DEFINITIONS,
  clamp,
  createDefaultLogistics,
  distance
} from "@seelines/shared";
import { generateId } from "./id";

export type SimulationOrder = Order & { createdAt: number };
export type UnitOwner = "player" | "computer";

interface IslandState extends IslandDefinition {
  pressure: number;
  supply: number;
  targetPressure: number;
  powerReserve: number;
  lastPressureDelta: number;
}

interface ConvoyState extends ConvoyTemplate {
  progress: number;
  length: number;
  disrupted: boolean;
  wasDisrupted: boolean;
  weatherPenalty: number;
}

interface StormState extends StormTemplate {
  remaining: number;
}

export type GameEvent =
  | { type: "convoyDisrupted"; convoyId: string; owner: UnitOwner }
  | { type: "convoyRestored"; convoyId: string; owner: UnitOwner }
  | { type: "convoyDelivered"; convoyId: string; owner: UnitOwner }
  | { type: "islandCritical"; islandId: string; owner: IslandState["owner"]; pressure: number };

export interface UnitEntity {
  id: number;
  type: UnitType;
  definition: UnitDefinition;
  position: Vector2;
  velocity: Vector2;
  hitpoints: number;
  orderQueue: SimulationOrder[];
  escortTarget?: number;
  selected: boolean;
  owner: UnitOwner;
}

export interface SimulationConfig {
  map: WorldMap;
  tickRate: number;
}

export class GameState {
  #nextEntityId = 1;
  public readonly map: WorldMap;
  public readonly tickRate: number;
  public tick = 0;
  public units: Map<number, UnitEntity> = new Map();
  public readonly islands: Map<string, IslandState> = new Map();
  public readonly convoys: Map<string, ConvoyState> = new Map();
  public readonly storms: Map<string, StormState> = new Map();
  private readonly events: GameEvent[] = [];
  private readonly criticalIslands = new Set<string>();

  constructor(config: SimulationConfig) {
    this.map = config.map;
    this.tickRate = config.tickRate;
    this.bootstrapStrategicState();
  }

  private bootstrapStrategicState(): void {
    const preset = createDefaultLogistics();
    for (const island of preset.islands) {
      this.islands.set(island.id, {
        ...island,
        pressure: island.initialPressure,
        targetPressure: island.initialPressure,
        supply: island.storage * 0.6,
        powerReserve: island.baseCapacity * 0.4,
        lastPressureDelta: 0
      });
    }
    for (const convoy of preset.convoys) {
      const length = this.computeLaneLength(convoy.lane);
      this.convoys.set(convoy.id, {
        ...convoy,
        length,
        progress: Math.random() * length,
        disrupted: false,
        wasDisrupted: false,
        weatherPenalty: 1
      });
    }
    for (const storm of preset.storms) {
      this.storms.set(storm.id, {
        ...storm,
        remaining: storm.duration
      });
    }
  }

  createUnit(type: UnitType, position: Vector2, owner: UnitOwner = "player"): UnitEntity {
    const definition = UNIT_DEFINITIONS[type];
    const entity: UnitEntity = {
      id: this.#nextEntityId++,
      type,
      definition,
      position: { ...position },
      velocity: { x: 0, y: 0 },
      hitpoints: definition.hitpoints,
      orderQueue: [],
      selected: false,
      owner
    };
    this.units.set(entity.id, entity);
    return entity;
  }

  enqueueOrder(unitIds: number[], order: Order, options: { append?: boolean } = {}): void {
    const createdAt = performance.now();
    for (const id of unitIds) {
      const unit = this.units.get(id);
      if (!unit) continue;
      const metadataClone = order.metadata ? JSON.parse(JSON.stringify(order.metadata)) : undefined;
      const enriched: SimulationOrder = {
        ...order,
        createdAt,
        metadata: metadataClone
      };
      if (!options.append) {
        switch (order.type) {
          case "move":
          case "patrol":
            unit.escortTarget = undefined;
            break;
          case "escort":
            unit.escortTarget = (order.target as OrderTargetUnit).unitId;
            break;
          default:
            break;
        }
        unit.orderQueue = [enriched];
      } else {
        if (order.type === "escort") {
          unit.escortTarget = (order.target as OrderTargetUnit).unitId;
        }
        unit.orderQueue = [...unit.orderQueue, enriched];
      }
    }
  }

  clearSelection(): void {
    for (const unit of this.units.values()) {
      unit.selected = false;
    }
  }

  selectUnits(ids: number[], mode: "replace" | "add" | "toggle" = "replace"): void {
    const idSet = new Set(ids);
    if (mode === "replace") {
      for (const unit of this.units.values()) {
        unit.selected = idSet.has(unit.id);
      }
      return;
    }

    if (mode === "add") {
      for (const unit of this.units.values()) {
        if (idSet.has(unit.id)) {
          unit.selected = true;
        }
      }
      return;
    }

    for (const unit of this.units.values()) {
      if (idSet.has(unit.id)) {
        unit.selected = !unit.selected;
      }
    }
  }

  selectedUnits(): UnitEntity[] {
    return [...this.units.values()].filter(u => u.selected);
  }

  unitsByType(owner: UnitOwner, type: UnitType): UnitEntity[] {
    const matches: UnitEntity[] = [];
    for (const unit of this.units.values()) {
      if (unit.owner !== owner) continue;
      if (unit.type !== type) continue;
      matches.push(unit);
    }
    return matches;
  }

  snapshot(): UnitSnapshot[] {
    return [...this.units.values()].map(unit => ({
      id: unit.id,
      type: unit.type,
      position: { ...unit.position },
      velocity: { ...unit.velocity },
      orders: unit.orderQueue.map(order => ({
        id: order.id ?? generateId(6),
        type: order.type,
        target: order.target,
        metadata: order.metadata
      }))
    }));
  }

  distanceBetween(aId: number, bId: number): number | undefined {
    const a = this.units.get(aId);
    const b = this.units.get(bId);
    if (!a || !b) return undefined;
    return distance(a.position, b.position);
  }

  updateStrategicSystems(dt: number): void {
    this.updateStorms(dt);
    this.updateConvoys(dt);
    this.updateIslands(dt);
  }

  consumeEvents(): GameEvent[] {
    const emitted = [...this.events];
    this.events.length = 0;
    return emitted;
  }

  getStrategicOverview(owner: UnitOwner): {
    islands: Array<{
      id: string;
      name: string;
      pressure: number;
      targetPressure: number;
      supply: number;
      storage: number;
      lastPressureDelta: number;
    }>;
    convoys: Array<{
      id: string;
      disrupted: boolean;
      weatherPenalty: number;
      throughput: number;
      resilience: number;
    }>;
  } {
    const islands = [...this.islands.values()]
      .filter(island => island.owner === owner)
      .map(island => ({
        id: island.id,
        name: island.name,
        pressure: island.pressure,
        targetPressure: island.targetPressure,
        supply: island.supply,
        storage: island.storage,
        lastPressureDelta: island.lastPressureDelta
      }))
      .sort((a, b) => a.pressure - b.pressure);

    const convoys = [...this.convoys.values()]
      .filter(convoy => convoy.owner === owner)
      .map(convoy => ({
        id: convoy.id,
        disrupted: convoy.disrupted,
        weatherPenalty: convoy.weatherPenalty,
        throughput: convoy.throughput,
        resilience: convoy.resilience
      }));

    return { islands, convoys };
  }

  getRenderableLogistics(): {
    convoys: Array<{
      id: string;
      lane: Vector2[];
      owner: UnitOwner;
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
      owner: IslandState["owner"];
    }>;
  } {
    const convoys = [...this.convoys.values()].map(convoy => ({
      id: convoy.id,
      lane: convoy.lane,
      owner: convoy.owner,
      disrupted: convoy.disrupted,
      weatherPenalty: convoy.weatherPenalty,
      progressPoint: this.sampleLane(convoy.lane, convoy.progress, convoy.length)
    }));
    const storms = [...this.storms.values()].map(storm => ({
      id: storm.id,
      center: { ...storm.center },
      radius: storm.radius,
      intensity: storm.intensity
    }));
    const islands = [...this.islands.values()].map(island => ({
      id: island.id,
      position: { ...island.position },
      pressure: island.pressure,
      owner: island.owner
    }));
    return { convoys, storms, islands };
  }

  private updateStorms(dt: number): void {
    for (const storm of this.storms.values()) {
      storm.center.x += storm.velocity.x * dt;
      storm.center.y += storm.velocity.y * dt;
      storm.remaining -= dt;
      if (storm.remaining <= 0) {
        storm.velocity.x *= -1;
        storm.velocity.y *= -1;
        storm.remaining = storm.duration;
      }
      storm.center.x = clamp(storm.center.x, 1.5, this.map.width - 1.5);
      storm.center.y = clamp(storm.center.y, 1.5, this.map.height - 1.5);
    }
  }

  private updateConvoys(dt: number): void {
    const hostileCache = {
      player: [...this.units.values()].filter(unit => unit.owner === "computer"),
      computer: [...this.units.values()].filter(unit => unit.owner === "player")
    } as const;

    for (const convoy of this.convoys.values()) {
      convoy.wasDisrupted = convoy.disrupted;
      const hostiles = hostileCache[convoy.owner];
      const disruption = this.detectDisruption(convoy, hostiles);
      convoy.disrupted = disruption > 0;
      convoy.weatherPenalty = this.computeWeatherPenalty(convoy);
      const effectiveSpeed = convoy.speed * dt * convoy.weatherPenalty * (convoy.disrupted ? 0.4 : 1);
      const previousProgress = convoy.progress;
      const traversed = previousProgress + effectiveSpeed;
      convoy.progress = convoy.length > 0 ? traversed % convoy.length : 0;
      if (convoy.disrupted && !convoy.wasDisrupted) {
        this.events.push({ type: "convoyDisrupted", convoyId: convoy.id, owner: convoy.owner });
      }
      if (!convoy.disrupted && convoy.wasDisrupted) {
        this.events.push({ type: "convoyRestored", convoyId: convoy.id, owner: convoy.owner });
      }
      if (convoy.length > 0) {
        const loops = Math.floor(traversed / convoy.length);
        if (loops > 0) {
          for (let i = 0; i < loops; i += 1) {
            if (convoy.disrupted) {
              this.applyDisruptedDelivery(convoy);
            } else {
              this.applyDelivery(convoy);
            }
          }
        }
      }
    }
  }

  private updateIslands(dt: number): void {
    for (const island of this.islands.values()) {
      const buildingEffects = island.buildings.reduce(
        (accumulator, entry) => {
          const definition = BUILDING_DEFINITIONS[entry.type];
          const tierMultiplier = entry.tier / Math.max(1, definition.baseTier || 1);
          accumulator.demand += definition.supplyDemand * tierMultiplier;
          accumulator.capacity += definition.supplyCapacity * tierMultiplier;
          accumulator.pressure += definition.pressureBonus * tierMultiplier;
          accumulator.power += definition.powerOutput * tierMultiplier;
          return accumulator;
        },
        { demand: 0, capacity: 0, pressure: 0, power: 0 }
      );

      const supplyCapacity = island.baseCapacity + buildingEffects.capacity;
      island.supply = clamp(island.supply, 0, supplyCapacity);

      const demand = island.baseDemand + buildingEffects.demand;
      island.powerReserve = clamp(island.powerReserve + buildingEffects.power * dt, 0, supplyCapacity * 0.6);

      const convoyBonus = [...this.convoys.values()].reduce((value, convoy) => {
        if (convoy.destination !== island.id) return value;
        const throughput = convoy.disrupted ? convoy.throughput * 0.2 : convoy.throughput;
        return value + throughput * convoy.weatherPenalty;
      }, 0);

      const supplyDelta = convoyBonus * dt - demand * 0.05 * dt;
      island.supply = clamp(island.supply + supplyDelta, 0, supplyCapacity);

      const targetFromSupply = (island.supply / Math.max(1, demand)) * 70;
      const targetFromConvoys = convoyBonus * 5 + buildingEffects.pressure;
      const desired = clamp(targetFromSupply + targetFromConvoys, 5, 100);
      const delta = desired - island.pressure;
      island.pressure += delta * 0.12 * dt;
      island.lastPressureDelta = delta;
      island.targetPressure = desired;

      if (island.pressure < 20) {
        if (!this.criticalIslands.has(island.id)) {
          this.criticalIslands.add(island.id);
          this.events.push({
            type: "islandCritical",
            islandId: island.id,
            owner: island.owner,
            pressure: island.pressure
          });
        }
      } else if (island.pressure > 24 && this.criticalIslands.has(island.id)) {
        this.criticalIslands.delete(island.id);
      }
    }
  }

  private applyDelivery(convoy: ConvoyState): void {
    const destination = this.islands.get(convoy.destination);
    const origin = this.islands.get(convoy.origin);
    if (!destination || !origin) return;
    destination.supply = clamp(destination.supply + convoy.throughput * 2.4, 0, destination.storage);
    destination.pressure = clamp(destination.pressure + convoy.throughput * 2.2, 0, 100);
    origin.supply = clamp(origin.supply - convoy.throughput * 1.2, 0, origin.storage);
    this.events.push({ type: "convoyDelivered", convoyId: convoy.id, owner: convoy.owner });
  }

  private applyDisruptedDelivery(convoy: ConvoyState): void {
    const destination = this.islands.get(convoy.destination);
    if (!destination) return;
    destination.pressure = clamp(destination.pressure - convoy.throughput * 2.6, 0, 100);
  }

  private detectDisruption(convoy: ConvoyState, hostiles: UnitEntity[]): number {
    let impact = 0;
    for (const hostile of hostiles) {
      const distanceToLane = this.distanceToLane(convoy.lane, hostile.position);
      if (distanceToLane < 1.4) {
        impact = Math.max(impact, 1.2 - distanceToLane * 0.6);
      }
    }
    return impact;
  }

  private computeWeatherPenalty(convoy: ConvoyState): number {
    let penalty = 1;
    for (const storm of this.storms.values()) {
      const laneDistance = this.distanceToLane(convoy.lane, storm.center);
      if (laneDistance > storm.radius) continue;
      const normalized = clamp(1 - laneDistance / storm.radius, 0, 1);
      penalty *= clamp(1 - storm.intensity * normalized * 0.5, 0.2, 1);
    }
    return clamp(penalty, 0.2, 1);
  }

  private computeLaneLength(points: Vector2[]): number {
    if (points.length <= 1) return 1;
    let length = 0;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1]!;
      const current = points[i]!;
      length += Math.hypot(current.x - prev.x, current.y - prev.y);
    }
    return length;
  }

  private sampleLane(points: Vector2[], progress: number, length: number): Vector2 {
    if (points.length === 0) return { x: 0, y: 0 };
    if (points.length === 1) return { ...points[0]! };
    let remaining = progress % length;
    for (let i = 1; i < points.length; i += 1) {
      const previous = points[i - 1]!;
      const current = points[i]!;
      const segment = Math.hypot(current.x - previous.x, current.y - previous.y);
      if (remaining <= segment) {
        const t = segment === 0 ? 0 : remaining / segment;
        return {
          x: previous.x + (current.x - previous.x) * t,
          y: previous.y + (current.y - previous.y) * t
        };
      }
      remaining -= segment;
    }
    return { ...points[points.length - 1]! };
  }

  private distanceToLane(points: Vector2[], point: Vector2): number {
    if (points.length <= 1) {
      const first = points[0];
      if (!first) return Number.POSITIVE_INFINITY;
      return Math.hypot(first.x - point.x, first.y - point.y);
    }
    let best = Number.POSITIVE_INFINITY;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1]!;
      const b = points[i]!;
      const candidate = this.distancePointToSegment(a, b, point);
      if (candidate < best) {
        best = candidate;
      }
    }
    return best;
  }

  private distancePointToSegment(a: Vector2, b: Vector2, point: Vector2): number {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = point.x - a.x;
    const apy = point.y - a.y;
    const abLengthSquared = abx * abx + aby * aby;
    if (abLengthSquared === 0) {
      return Math.hypot(point.x - a.x, point.y - a.y);
    }
    const t = clamp((apx * abx + apy * aby) / abLengthSquared, 0, 1);
    const closestX = a.x + abx * t;
    const closestY = a.y + aby * t;
    return Math.hypot(point.x - closestX, point.y - closestY);
  }
}
