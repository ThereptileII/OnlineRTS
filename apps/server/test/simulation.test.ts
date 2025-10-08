import { describe, expect, it } from "vitest";
import type { Order } from "@seelines/shared";
import { GameSimulation } from "../src/simulation";

const createMoveOrder = (targetX: number, targetY: number): Order => ({
  id: "o-1",
  type: "move",
  target: { kind: "point", x: targetX, y: targetY }
});

describe("GameSimulation", () => {
  it("moves units along queued waypoints", () => {
    const simulation = new GameSimulation();
    const unit = simulation.createUnit("sloop", { x: 2, y: 2 });
    simulation.enqueueOrder([unit.id], createMoveOrder(6, 6));
    for (let i = 0; i < 120; i += 1) {
      simulation.step(1);
    }
    const snapshot = simulation.snapshot();
    const updated = snapshot.units.find(entry => entry.id === unit.id);
    expect(updated).toBeDefined();
    expect(updated?.position.x ?? 0).toBeGreaterThan(4.5);
    expect(updated?.position.y ?? 0).toBeGreaterThan(4.5);
  });
});
