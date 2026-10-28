window.SF = {
  colors: ["#ff465e", "#23a9ff", "#ffe13b", "#35db83", "#b567f5", "#ff983c"],
  names: ["red", "blue", "yellow", "green", "purple", "orange"],
  levels: [],
};
// Study layouts, not extracted original level data.
for (let n = 1; n <= 18; n++) {
  let k = 6,
    rows = Math.min(4, 2 + Math.floor(n / 6)),
    trucks = [];
  if (n === 1)
    trucks = Array.from({ length: 6 }, (_, i) => ({
      x: 132 + (i % 3) * 109,
      y: 650 + Math.floor(i / 3) * 90,
      dir: i % 3 === 2 ? 2 : 0,
      c: i,
    }));
  else {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < 3; c++)
        trucks.push({
          x: 132 + c * 109,
          y: 617 + r * 67,
          dir: c === 0 ? 0 : c === 2 ? 2 : (r + n) % 2 ? 0 : 2,
          c: (r * 3 + c + n) % k,
        });
    for (let c = 0; c < k; c++)
      if (!trucks.some((t) => t.c === c))
        trucks.push({
          x: 132 + (c % 3) * 109,
          y: 617 + rows * 67,
          dir: c % 2 ? 0 : 2,
          c,
        });
  }
  SF.levels.push({ id: n, colors: k, trucks });
}
