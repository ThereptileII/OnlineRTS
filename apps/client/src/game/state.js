import { UNIT_DEFINITIONS, distance, createId } from "../../../packages/shared/index.js";

export class GameState {
  #nextEntityId = 1;

  constructor(config) {
    this.map = config.map;
    this.tickRate = config.tickRate;
    this.tick = 0;
    this.units = new Map();
  }

  createUnit(type, position) {
    const definition = UNIT_DEFINITIONS[type];
    if (!definition) {
      throw new Error(`Unknown unit type: ${type}`);
    }
    const entity = {
      id: this.#nextEntityId++,
      type,
      definition,
      position: { ...position },
      velocity: { x: 0, y: 0 },
      hitpoints: definition.hitpoints,
      orderQueue: [],
      escortTarget: undefined,
      selected: false
    };
    this.units.set(entity.id, entity);
    return entity;
  }

  enqueueOrder(unitIds, order) {
    const metadataClone = order.metadata ? JSON.parse(JSON.stringify(order.metadata)) : undefined;
    const enriched = {
      ...order,
      id: order.id ?? createId(6),
      createdAt: typeof performance !== "undefined" ? performance.now() : Date.now(),
      metadata: metadataClone
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

  clearSelection() {
    for (const unit of this.units.values()) {
      unit.selected = false;
    }
  }

  selectUnits(ids) {
    const idSet = new Set(ids);
    for (const unit of this.units.values()) {
      unit.selected = idSet.has(unit.id);
    }
  }

  selectedUnits() {
    return [...this.units.values()].filter(unit => unit.selected);
  }

  snapshot() {
    return [...this.units.values()].map(unit => ({
      id: unit.id,
      type: unit.type,
      position: { ...unit.position },
      velocity: { ...unit.velocity },
      orders: unit.orderQueue.map(order => ({
        id: order.id,
        type: order.type,
        target: order.target,
        metadata: order.metadata
      }))
    }));
  }

  distanceBetween(aId, bId) {
    const a = this.units.get(aId);
    const b = this.units.get(bId);
    if (!a || !b) return undefined;
    return distance(a.position, b.position);
  }
}
