import test from "node:test";
import assert from "node:assert/strict";
import { GameSimulation } from "../apps/server/simulation.mjs";

test("simulation advances move orders", () => {
  const simulation = new GameSimulation({ tickRate: 30 });
  const unit = simulation.createUnit("sloop", { x: 3, y: 12 });
  simulation.enqueueOrder([unit.id], {
    id: "order",
    type: "move",
    target: { kind: "point", x: 15, y: 5 }
  });
  for (let i = 0; i < 60; i += 1) {
    simulation.step(1);
  }
  const snapshot = simulation.snapshot();
  const moved = snapshot.units.find(entry => entry.id === unit.id);
  assert.ok(moved, "unit should exist in snapshot");
  assert.ok(moved.position.x > 3, "unit should advance along the x axis");
  const remainingDistance = Math.hypot(moved.position.x - 15, moved.position.y - 5);
  const originalDistance = Math.hypot(3 - 15, 12 - 5);
  assert.ok(remainingDistance < originalDistance, "unit should move closer to its destination");
});
