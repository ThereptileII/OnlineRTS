import { getTile, isWalkable, manhattan } from "./index.js";

const key = (x, y) => `${x},${y}`;

const reconstructPath = node => {
  const path = [];
  let current = node;
  while (current) {
    path.push({ x: current.x, y: current.y });
    current = current.parent;
  }
  path.reverse();
  return path;
};

const neighbors = (map, x, y) => {
  const dirs = [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ];
  const diagonals = [
    { x: x + 1, y: y + 1 },
    { x: x - 1, y: y + 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y - 1 }
  ];
  const results = [];
  for (const dir of dirs) {
    if (isWalkable(map, dir.x, dir.y)) {
      results.push(dir);
    }
  }
  for (const diag of diagonals) {
    if (!isWalkable(map, diag.x, diag.y)) {
      continue;
    }
    const tileA = getTile(map, diag.x, y);
    const tileB = getTile(map, x, diag.y);
    if (tileA?.walkable && tileB?.walkable) {
      results.push(diag);
    }
  }
  return results;
};

export const findPath = (map, start, goal) => {
  if (!isWalkable(map, goal.x, goal.y)) {
    return undefined;
  }
  const open = new Map();
  const closed = new Map();
  const startNode = {
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
