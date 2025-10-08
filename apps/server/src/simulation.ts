import { performance } from "node:perf_hooks";
import { nanoid } from "nanoid";
import type { GameSnapshot, Order, UnitSnapshot, UnitType, Vector2, WorldMap } from "@seelines/shared";
import { UNIT_DEFINITIONS, createSkirmishMap } from "@seelines/shared";
import { findPath } from "@seelines/shared/pathfinding";

export interface SimulationOrder extends Order {
  createdAt: number;
}

interface SimUnit {
  id: number;
  type: UnitType;
  position: Vector2;
  velocity: Vector2;
  hitpoints: number;
  orderQueue: SimulationOrder[];
  escortTarget?: number;
}

export interface SimulationConfig {
  map?: WorldMap;
  tickRate?: number;
}

export class GameSimulation {
  public readonly map: WorldMap;
  public readonly tickRate: number;
  public tick = 0;
  private nextUnitId = 1;
  private readonly units = new Map<number, SimUnit>();

  constructor(config: SimulationConfig = {}) {
    this.map = config.map ?? createSkirmishMap();
    this.tickRate = config.tickRate ?? 30;
  }

  createUnit(type: UnitType, position: Vector2): SimUnit {
    const unit: SimUnit = {
      id: this.nextUnitId++,
      type,
      position: { ...position },
      velocity: { x: 0, y: 0 },
      hitpoints: UNIT_DEFINITIONS[type].hitpoints,
      orderQueue: []
    };
    this.units.set(unit.id, unit);
    return unit;
  }

  enqueueOrder(unitIds: number[], order: Order): void {
    const metadataClone = order.metadata ? JSON.parse(JSON.stringify(order.metadata)) : undefined;
    const enriched: SimulationOrder = {
      ...order,
      metadata: metadataClone,
      createdAt: performance.now()
    };
    for (const id of unitIds) {
      const unit = this.units.get(id);
      if (!unit) continue;
      if (order.type === "escort") {
        unit.escortTarget = (order.target as { unitId: number }).unitId;
      } else {
        unit.escortTarget = undefined;
      }
      unit.orderQueue = [enriched];
    }
  }

  step(deltaSeconds: number): void {
    this.tick += 1;
    for (const unit of this.units.values()) {
      if (unit.orderQueue.length === 0) {
        this.dampen(unit);
        continue;
      }
      const order = unit.orderQueue[0];
      switch (order.type) {
        case "move":
          this.resolveMove(unit, order, deltaSeconds);
          break;
        case "patrol":
          this.resolvePatrol(unit, order, deltaSeconds);
          break;
        case "escort":
          this.resolveEscort(unit, order, deltaSeconds);
          break;
        default:
          unit.orderQueue.shift();
          break;
      }
    }
  }

  private resolveMove(unit: SimUnit, order: SimulationOrder, dt: number): void {
    this.ensureQueue(unit, order);
    this.advanceAlongQueue(unit, order, dt, () => {
      unit.orderQueue.shift();
    });
  }

  private resolvePatrol(unit: SimUnit, order: SimulationOrder, dt: number): void {
    const metadata = this.ensureQueue(unit, order);
    const direction = (metadata.direction as "forward" | "return" | undefined) ?? "forward";
    metadata.direction = direction;
    this.advanceAlongQueue(unit, order, dt, () => {
      if (direction === "forward") {
        const returnQueue = metadata.returnQueue as Vector2[] | undefined;
        if (!returnQueue?.length) {
          unit.orderQueue.shift();
          return;
        }
        metadata.queue = [...returnQueue];
        metadata.index = 0;
        metadata.direction = "return";
      } else {
        const forwardQueue = metadata.forwardQueue as Vector2[] | undefined;
        if (!forwardQueue?.length) {
          unit.orderQueue.shift();
          return;
        }
        metadata.queue = [...forwardQueue];
        metadata.index = 0;
        metadata.direction = "forward";
      }
    });
  }

  private resolveEscort(unit: SimUnit, order: SimulationOrder, dt: number): void {
    if (!unit.escortTarget) {
      unit.orderQueue.shift();
      return;
    }
    const target = this.units.get(unit.escortTarget);
    if (!target) {
      unit.orderQueue.shift();
      return;
    }
    const escortPoint = {
      x: target.position.x - Math.cos(Math.PI / 4) * 0.6,
      y: target.position.y - Math.sin(Math.PI / 4) * 0.6
    };
    this.moveTowards(unit, escortPoint, dt, () => {
      order.metadata = order.metadata ?? {};
      order.metadata.index = 0;
    });
  }

  private ensureQueue(unit: SimUnit, order: SimulationOrder): Record<string, unknown> {
    const metadata = (order.metadata ??= {});
    const queue = metadata.queue as Vector2[] | undefined;
    if (queue?.length) {
      metadata.index = (metadata.index as number | undefined) ?? 0;
      return metadata;
    }
    const startTile = this.toTile(unit.position);
    const targetPoint = order.target as { x: number; y: number };
    const destination = { x: Math.round(targetPoint.x), y: Math.round(targetPoint.y) };
    let path = (metadata.path as Vector2[] | undefined) ?? findPath(this.map, startTile, destination) ?? [];
    metadata.path = path;
    const queuePoints = this.toQueue(path);
    metadata.queue = [...queuePoints];
    metadata.index = 0;
    if (order.type === "patrol") {
      metadata.forwardQueue = [...queuePoints];
      const origin = (metadata.origin as Vector2 | undefined) ?? startTile;
      metadata.origin = origin;
      const returnPath = (metadata.returnPath as Vector2[] | undefined) ?? findPath(this.map, destination, origin) ?? [...path].reverse();
      metadata.returnPath = returnPath;
      metadata.returnQueue = metadata.returnQueue ?? this.toQueue(returnPath);
    }
    return metadata;
  }

  private advanceAlongQueue(unit: SimUnit, order: SimulationOrder, dt: number, onComplete: () => void): void {
    const metadata = (order.metadata ??= {});
    const queue = (metadata.queue as Vector2[] | undefined) ?? [];
    if (!queue.length) {
      onComplete();
      return;
    }
    const index = Math.min((metadata.index as number | undefined) ?? 0, queue.length - 1);
    const target = queue[index]!;
    this.moveTowards(unit, target, dt, () => {
      if (index >= queue.length - 1) {
        metadata.index = 0;
        onComplete();
      } else {
        metadata.index = index + 1;
      }
    });
  }

  private moveTowards(unit: SimUnit, target: Vector2, dt: number, onArrival: () => void): void {
    const dx = target.x - unit.position.x;
    const dy = target.y - unit.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.1) {
      unit.position = { ...target };
      onArrival();
      return;
    }
    const speedPerTick = UNIT_DEFINITIONS[unit.type].maxSpeed / this.tickRate;
    const delta = speedPerTick * dt;
    unit.velocity.x = (dx / dist) * delta;
    unit.velocity.y = (dy / dist) * delta;
    unit.position.x += unit.velocity.x;
    unit.position.y += unit.velocity.y;
  }

  private dampen(unit: SimUnit): void {
    unit.velocity.x *= 0.92;
    unit.velocity.y *= 0.92;
  }

  private toTile(point: Vector2): Vector2 {
    return { x: Math.round(point.x), y: Math.round(point.y) };
  }

  private toQueue(path: Vector2[]): Vector2[] {
    if (path.length <= 1) {
      return path.map(tile => ({ x: tile.x + 0.5, y: tile.y + 0.5 }));
    }
    const result: Vector2[] = [];
    for (let i = 1; i < path.length; i += 1) {
      const tile = path[i]!;
      result.push({ x: tile.x + 0.5, y: tile.y + 0.5 });
    }
    return result;
  }

  snapshot(): GameSnapshot {
    const units: UnitSnapshot[] = [];
    for (const unit of this.units.values()) {
      units.push({
        id: unit.id,
        type: unit.type,
        position: { ...unit.position },
        velocity: { ...unit.velocity },
        orders: unit.orderQueue.map(order => ({
          id: order.id ?? nanoid(8),
          type: order.type,
          target: order.target,
          metadata: order.metadata
        }))
      });
    }
    return {
      tick: this.tick,
      units
    };
  }
}
