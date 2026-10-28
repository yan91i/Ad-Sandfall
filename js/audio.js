SF.audio = {
  ctx: null,
  enabled: true,
  init() {
    if (!this.ctx)
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
  },
  tone(f = 440, d = 0.1, type = "sine", vol = 0.035) {
    if (!this.enabled || !this.ctx) return;
    let o = this.ctx.createOscillator(),
      g = this.ctx.createGain(),
      t = this.ctx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f * 0.6), t + d);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(t + d);
  },
  start() {
    this.tone(80, 0.3, "sawtooth", 0.025);
    setTimeout(() => this.tone(110, 0.15, "triangle"), 100);
  },
  sand() {
    this.tone(1600 + Math.random() * 1200, 0.025, "triangle", 0.006);
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.3, "sine", 0.06), i * 130),
    );
  },
};
