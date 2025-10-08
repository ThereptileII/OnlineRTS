import test from "node:test";
import assert from "node:assert/strict";
import { createSkirmishMap, findPath } from "../packages/shared/index.js";

test("findPath navigates around land tiles", () => {
  const map = createSkirmishMap();
  const start = { x: 2, y: 2 };
  const goal = { x: 20, y: 14 };
  const path = findPath(map, start, goal);
  assert.ok(path, "expected a path to be found");
  assert.ok(path.length > 0, "path should include intermediate points");
  for (const point of path) {
    const tile = map.tiles.find(tile => tile.x === point.x && tile.y === point.y);
    assert.ok(tile?.walkable, `path should avoid land tiles, got (${point.x}, ${point.y})`);
  }
});
