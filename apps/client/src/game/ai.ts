import { nanoid } from "nanoid";
import { findPath } from "@seelines/shared/pathfinding";
import type { Order, Vector2 } from "@seelines/shared";
import type { GameState, UnitEntity } from "./state";

interface AiControllerOptions {
  state: GameState;
}

interface Assignment {
  targetId: number;
  expiresTick: number;
}

export class AiController {
  private readonly state: GameState;
  private readonly assignments = new Map<number, Assignment>();
  private readonly retargetInterval: number;

  constructor(options: AiControllerOptions) {
    this.state = options.state;
    this.retargetInterval = Math.max(1, this.state.tickRate * 3);
  }

  update(): void {
    const aiUnits = [...this.state.units.values()].filter(unit => unit.owner === "computer");
    if (aiUnits.length === 0) {
      return;
    }

    const playerUnits = [...this.state.units.values()].filter(unit => unit.owner === "player");
    if (playerUnits.length === 0) {
      return;
    }

    for (const unit of aiUnits) {
      const assignment = this.assignments.get(unit.id);
      const currentTarget = assignment ? this.state.units.get(assignment.targetId) : undefined;
      const requiresNewTarget =
        !currentTarget ||
        currentTarget.owner !== "player" ||
        assignment!.expiresTick <= this.state.tick ||
        unit.orderQueue.length === 0;

      if (requiresNewTarget) {
        const target = this.pickTarget(unit, playerUnits);
        if (!target) continue;
        this.assignments.set(unit.id, {
          targetId: target.id,
          expiresTick: this.state.tick + this.retargetInterval
        });
        this.issueMoveOrder(unit, target.position);
        continue;
      }

      const distanceToTarget = Math.hypot(
        currentTarget.position.x - unit.position.x,
        currentTarget.position.y - unit.position.y
      );
      if (distanceToTarget > 4 && this.assignmentExpiringSoon(assignment)) {
        this.assignments.set(unit.id, {
          targetId: currentTarget.id,
          expiresTick: this.state.tick + this.retargetInterval
        });
        this.issueMoveOrder(unit, currentTarget.position);
      }
    }
  }

  private assignmentExpiringSoon(assignment: Assignment | undefined): boolean {
    if (!assignment) return true;
    return assignment.expiresTick - this.state.tick <= this.state.tickRate / 2;
  }

  private pickTarget(unit: UnitEntity, candidates: UnitEntity[]): UnitEntity | undefined {
    let closest: UnitEntity | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const distance = Math.hypot(
        candidate.position.x - unit.position.x,
        candidate.position.y - unit.position.y
      );
      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }
    return closest;
  }

  private issueMoveOrder(unit: UnitEntity, destination: Vector2): void {
    const start = this.asGrid(unit.position);
    const target = this.asGrid(destination);
    if (start.x === target.x && start.y === target.y) {
      return;
    }
    const path = findPath(this.state.map, start, target);
    if (!path || path.length === 0) {
      return;
    }
    const queue = this.toQueue(path);
    const order: Order = {
      id: `ai-${nanoid(6)}`,
      type: "move",
      target: { kind: "point", x: target.x, y: target.y },
      metadata: { path, queue }
    };
    this.state.enqueueOrder([unit.id], order);
  }

  private toQueue(path: Vector2[]): Vector2[] {
    if (path.length <= 1) {
      return path.map(tile => this.tileToWorld(tile));
    }
    const queue: Vector2[] = [];
    for (let i = 1; i < path.length; i += 1) {
      queue.push(this.tileToWorld(path[i]!));
    }
    return queue;
  }

  private tileToWorld(tile: Vector2): Vector2 {
    return { x: tile.x + 0.5, y: tile.y + 0.5 };
  }

  private asGrid(point: Vector2): Vector2 {
    return { x: Math.round(point.x), y: Math.round(point.y) };
  }
}
