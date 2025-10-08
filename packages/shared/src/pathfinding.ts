import type { Vector2, WorldMap } from "./index.js";
import { getTile, isWalkable, manhattan } from "./index.js";

interface NodeRecord {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent?: NodeRecord;
}

const key = (x: number, y: number): string => `${x},${y}`;

const reconstructPath = (node: NodeRecord): Vector2[] => {
  const path: Vector2[] = [];
  let current: NodeRecord | undefined = node;
  while (current) {
    path.push({ x: current.x, y: current.y });
    current = current.parent;
  }
  path.reverse();
  return path;
};

const neighbors = (
  map: WorldMap,
  x: number,
  y: number
): Vector2[] => {
  const dirs: Vector2[] = [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ];
  const diagonals: Vector2[] = [
    { x: x + 1, y: y + 1 },
    { x: x - 1, y: y + 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y - 1 }
  ];
  const results: Vector2[] = [];
  for (const dir of dirs) {
    if (isWalkable(map, dir.x, dir.y)) {
      results.push(dir);
    }
  }
  for (const diag of diagonals) {
    if (!isWalkable(map, diag.x, diag.y)) {
      continue;
    }
    // Prevent cutting corners through land tiles.
    const tileA = getTile(map, diag.x, y);
    const tileB = getTile(map, x, diag.y);
    if (tileA?.walkable && tileB?.walkable) {
      results.push(diag);
    }
  }
  return results;
};

export const findPath = (
  map: WorldMap,
  start: Vector2,
  goal: Vector2
): Vector2[] | undefined => {
  if (!isWalkable(map, goal.x, goal.y)) {
    return undefined;
  }
  const open = new Map<string, NodeRecord>();
  const closed = new Map<string, NodeRecord>();
  const startNode: NodeRecord = {
    x: start.x,
    y: start.y,
    g: 0,
    h: manhattan(start, goal),
    f: manhattan(start, goal)
  };
  open.set(key(start.x, start.y), startNode);

  while (open.size > 0) {
    const current = [...open.values()].reduce((best, record) =>
      record.f < best.f ? record : best
    );
    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(current);
    }
    open.delete(key(current.x, current.y));
    closed.set(key(current.x, current.y), current);

    for (const neighbor of neighbors(map, current.x, current.y)) {
      const neighborKey = key(neighbor.x, neighbor.y);
      if (closed.has(neighborKey)) {
        continue;
      }
      const gScore = current.g + manhattan(current, neighbor);
      let neighborRecord = open.get(neighborKey);
      if (!neighborRecord || gScore < neighborRecord.g) {
        const hScore = manhattan(neighbor, goal);
        neighborRecord = {
          x: neighbor.x,
          y: neighbor.y,
          g: gScore,
          h: hScore,
          f: gScore + hScore,
          parent: current
        };
        open.set(neighborKey, neighborRecord);
      }
    }
  }
  return undefined;
};
