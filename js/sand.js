class SandField {
  constructor(l) {
    this.w = 216;
    this.h = 144;
    this.grid = new Uint8Array(this.w * this.h);
    this.counts = Array(6).fill(0);
    this.total = 0;
    this.tick = 0;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx = this.canvas.getContext("2d");
    this.image = this.ctx.createImageData(this.w, this.h);
    this.rgb = SF.colors.map((c) => [
      parseInt(c.slice(1, 3), 16),
      parseInt(c.slice(3, 5), 16),
      parseInt(c.slice(5, 7), 16),
    ]);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        let c = SF.art[l.id - 1].grid[y * this.w + x];
        this.grid[y * this.w + x] = c + 1;
        this.counts[c]++;
        this.total++;
      }
    this.initial = this.total;
  }
  step() {
    this.tick++;
    let w = this.w,
      h = this.h,
      g = this.grid;
    for (let y = h - 2; y >= 0; y--)
      for (let i = 0; i < w; i++) {
        let x = this.tick % 2 ? w - 1 - i : i,
          p = y * w + x;
        if (!g[p]) continue;
        let q = p + w;
        if (!g[q]) {
          g[q] = g[p];
          g[p] = 0;
        } else {
          let d = (x + y + this.tick) % 2 ? 1 : -1;
          if (x + d >= 0 && x + d < w && !g[q + d]) {
            g[q + d] = g[p];
            g[p] = 0;
          } else if (x - d >= 0 && x - d < w && !g[q - d]) {
            g[q - d] = g[p];
            g[p] = 0;
          }
        }
      }
  }
  drain(cx, c, max, emit) {
    let got = 0,
      center = Math.floor(((cx - 88) / 304) * this.w);
    for (let d = 0; d < 64 && got < max; d++) {
      let x = center + (d % 2 ? 1 : -1) * Math.floor(d / 2);
      if (x < 0 || x >= this.w) continue;
      for (let y = this.h - 1; y >= this.h - 10 && got < max; y--) {
        let p = y * this.w + x;
        if (this.grid[p] === c + 1) {
          this.grid[p] = 0;
          this.total--;
          this.counts[c]--;
          got++;
          emit(
            88 + ((x + 0.5) * 304) / this.w,
            185 + ((y + 0.5) * 210) / this.h,
            c,
          );
        } else if (this.grid[p]) break;
      }
    }
    return got;
  }
  bottomColors() {
    let s = new Set();
    for (let x = 0; x < this.w; x++) {
      let c = this.grid[(this.h - 1) * this.w + x];
      if (c) s.add(c - 1);
    }
    return s;
  }
  render(g) {
    let a = this.image.data;
    for (let i = 0; i < this.grid.length; i++) {
      let c = this.grid[i],
        p = i * 4;
      if (c) {
        let rgb = this.rgb[c - 1],
          noise = ((i * 13 + (i % 17) * 7) % 19) - 9;
        a[p] = Math.max(0, rgb[0] + noise);
        a[p + 1] = Math.max(0, rgb[1] + noise);
        a[p + 2] = Math.max(0, rgb[2] + noise);
        a[p + 3] = 255;
      } else a[p + 3] = 0;
    }
    this.ctx.putImageData(this.image, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(this.canvas, 88, 185, 304, 210);
    g.imageSmoothingEnabled = true;
  }
}
SF.SandField = SandField;
