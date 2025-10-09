import type {
  Order,
  OrderTargetUnit,
  UnitDefinition,
  UnitSnapshot,
  UnitType,
  Vector2,
  WorldMap
} from "@seelines/shared";
import { UNIT_DEFINITIONS, distance } from "@seelines/shared";
import { generateId } from "./id";

export type SimulationOrder = Order & { createdAt: number };
export type UnitOwner = "player" | "computer";

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

  constructor(config: SimulationConfig) {
    this.map = config.map;
    this.tickRate = config.tickRate;
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

  enqueueOrder(unitIds: number[], order: Order): void {
    const metadataClone = order.metadata ? JSON.parse(JSON.stringify(order.metadata)) : undefined;
    const enriched: SimulationOrder = {
      ...order,
      createdAt: performance.now(),
      metadata: metadataClone
    };
    for (const id of unitIds) {
      const unit = this.units.get(id);
      if (!unit) continue;
      switch (order.type) {
        case "move":
          unit.escortTarget = undefined;
          break;
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
    }
  }

  clearSelection(): void {
    for (const unit of this.units.values()) {
      unit.selected = false;
    }
  }

  selectUnits(ids: number[]): void {
    const idSet = new Set(ids);
    for (const unit of this.units.values()) {
      unit.selected = idSet.has(unit.id);
    }
  }

  selectedUnits(): UnitEntity[] {
    return [...this.units.values()].filter(u => u.selected);
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
}
