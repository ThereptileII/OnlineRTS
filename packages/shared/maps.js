const createIslandMask = (width, height) => {
  const mask = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const centerIsland = x > 6 && x < 14 && y > 6 && y < 10;
      const northShoal = y < 3 && x > 4 && x < 12;
      const eastKeys = x > 16 && y > 8 && y < 14;
      mask.push(!(centerIsland || northShoal || eastKeys));
    }
  }
  return mask;
};

export const createSkirmishMap = () => {
  const width = 24;
  const height = 18;
  const mask = createIslandMask(width, height);
  const tiles = mask.map((walkable, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    return {
      x,
      y,
      walkable,
      kind: walkable ? "water" : "island"
    };
  });
  return {
    width,
    height,
    tiles
  };
};
