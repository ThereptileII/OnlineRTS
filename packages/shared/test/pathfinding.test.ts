import { describe, expect, it } from "vitest";
import type { WorldMap } from "../src/index.js";
import { findPath } from "../src/pathfinding.js";

const simpleMap: WorldMap = {
  width: 8,
  height: 8,
  tiles: Array.from({ length: 64 }, (_, index) => {
    const x = index % 8;
    const y = Math.floor(index / 8);
    const isIsland = x === 4 && y >= 2 && y <= 5;
    return {
      x,
      y,
      kind: isIsland ? "island" : "water",
      walkable: !isIsland
    };
  })
};

describe("findPath", () => {
  it("finds a valid path around obstacles", () => {
    const path = findPath(simpleMap, { x: 1, y: 1 }, { x: 6, y: 6 });
    expect(path?.length).toBeGreaterThan(0);
    expect(path?.[0]).toEqual({ x: 1, y: 1 });
    expect(path?.[path.length - 1]).toEqual({ x: 6, y: 6 });
    const obstacle = path?.find(point => point.x === 4 && point.y >= 2 && point.y <= 5);
    expect(obstacle).toBeUndefined();
  });

  it("returns undefined when destination is blocked", () => {
    const path = findPath(simpleMap, { x: 1, y: 1 }, { x: 4, y: 3 });
    expect(path).toBeUndefined();
  });
});
