import { performance } from "node:perf_hooks";
import { UNIT_DEFINITIONS, createSkirmishMap, findPath, createId } from "../../packages/shared/index.js";

export class GameSimulation {
  constructor(config = {}) {
    this.map = config.map ?? createSkirmishMap();
    this.tickRate = config.tickRate ?? 30;
    this.tick = 0;
    this.nextUnitId = 1;
    this.units = new Map();
  }

  createUnit(type, position) {
    const definition = UNIT_DEFINITIONS[type];
    if (!definition) {
      throw new Error(`Unknown unit type: ${type}`);
    }
    const unit = {
      id: this.nextUnitId++,
      type,
      position: { ...position },
      velocity: { x: 0, y: 0 },
      hitpoints: definition.hitpoints,
      orderQueue: [],
      escortTarget: undefined
    };
    this.units.set(unit.id, unit);
    return unit;
  }

  enqueueOrder(unitIds, order) {
    const metadataClone = order.metadata ? JSON.parse(JSON.stringify(order.metadata)) : undefined;
    const enriched = {
      ...order,
      metadata: metadataClone,
      createdAt: performance.now()
    };
    for (const id of unitIds) {
      const unit = this.units.get(id);
      if (!unit) continue;
      if (order.type === "escort") {
        unit.escortTarget = order.target.unitId;
      } else {
        unit.escortTarget = undefined;
      }
      unit.orderQueue = [enriched];
    }
  }

  step(deltaSeconds) {
    this.tick += deltaSeconds;
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

  resolveMove(unit, order, dt) {
    this.ensureQueue(unit, order);
    this.advanceAlongQueue(unit, order, dt, () => {
      unit.orderQueue.shift();
    });
  }

  resolvePatrol(unit, order, dt) {
    const metadata = this.ensureQueue(unit, order);
    const direction = metadata.direction ?? "forward";
    metadata.direction = direction;
    this.advanceAlongQueue(unit, order, dt, () => {
      if (direction === "forward") {
        const returnQueue = metadata.returnQueue ?? [];
        if (!returnQueue.length) {
          unit.orderQueue.shift();
          return;
        }
        metadata.queue = [...returnQueue];
        metadata.index = 0;
        metadata.direction = "return";
      } else {
        const forwardQueue = metadata.forwardQueue ?? [];
        if (!forwardQueue.length) {
          unit.orderQueue.shift();
          return;
        }
        metadata.queue = [...forwardQueue];
        metadata.index = 0;
        metadata.direction = "forward";
      }
    });
  }

  resolveEscort(unit, order, dt) {
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

  ensureQueue(unit, order) {
    const metadata = (order.metadata ??= {});
    const queue = metadata.queue ?? [];
    if (queue.length) {
      metadata.index = metadata.index ?? 0;
      return metadata;
    }
    const startTile = this.toTile(unit.position);
    const targetPoint = order.target;
    const destination = { x: Math.round(targetPoint.x), y: Math.round(targetPoint.y) };
    let path = metadata.path ?? findPath(this.map, startTile, destination) ?? [];
    metadata.path = path;
    const queuePoints = this.toQueue(path);
    metadata.queue = [...queuePoints];
    metadata.index = 0;
    if (order.type === "patrol") {
      metadata.forwardQueue = [...queuePoints];
      const origin = metadata.origin ?? startTile;
      metadata.origin = origin;
      const returnPath = metadata.returnPath ?? findPath(this.map, destination, origin) ?? [...path].reverse();
      metadata.returnPath = returnPath;
      metadata.returnQueue = metadata.returnQueue ?? this.toQueue(returnPath);
    }
    return metadata;
  }

  advanceAlongQueue(unit, order, dt, onComplete) {
    const metadata = (order.metadata ??= {});
    const queue = metadata.queue ?? [];
    if (!queue.length) {
      onComplete();
      return;
    }
    const index = Math.min(metadata.index ?? 0, queue.length - 1);
    const target = queue[index];
    this.moveTowards(unit, target, dt, () => {
      if (index >= queue.length - 1) {
        metadata.index = 0;
        onComplete();
      } else {
        metadata.index = index + 1;
      }
    });
  }

  moveTowards(unit, target, dt, onArrival) {
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

  dampen(unit) {
    unit.velocity.x *= 0.92;
    unit.velocity.y *= 0.92;
  }

  toTile(point) {
    return { x: Math.round(point.x), y: Math.round(point.y) };
  }

  toQueue(path) {
    if (path.length <= 1) {
      return path.map(tile => ({ x: tile.x + 0.5, y: tile.y + 0.5 }));
    }
    const result = [];
    for (let i = 1; i < path.length; i += 1) {
      const tile = path[i];
      result.push({ x: tile.x + 0.5, y: tile.y + 0.5 });
    }
    return result;
  }

  snapshot() {
    const units = [];
    for (const unit of this.units.values()) {
      units.push({
        id: unit.id,
        type: unit.type,
        position: { ...unit.position },
        velocity: { ...unit.velocity },
        orders: unit.orderQueue.map(order => ({
          id: order.id ?? createId(8),
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
