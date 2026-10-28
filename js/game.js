(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    cv = $("#game"),
    g = cv.getContext("2d"),
    D = [
      [-1, 0],
      [0, -1],
      [1, 0],
      [0, 1],
    ],
    A = [0, Math.PI / 2, Math.PI, -Math.PI / 2],
    imgs = SF.names.map((n) =>
      ["left", "up", "right", "down"].map((d) => {
        let i = new Image();
        i.src = "assets/vehicles/" + n + "-" + d + ".png";
        return i;
      }),
    );
  let S,
    H = [],
    last = 0,
    acc = 0,
    action,
    tt;
  function box(x, y, w, h, r, c) {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fillStyle = c;
    g.fill();
  }
  function txt(s, x, y, z = 16, c = "#7055a8") {
    g.font = `bold ${z}px system-ui`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = c;
    g.fillText(s, x, y);
  }
  function toast(s) {
    $("#toast").textContent = s;
    $("#toast").classList.add("show");
    clearTimeout(tt);
    tt = setTimeout(() => $("#toast").classList.remove("show"), 2300);
  }
  function close() {
    S.paused = false;
    $("#modal").hidden = true;
    $("#body").replaceChildren();
  }
  function modal(title, body, fn, label = "Continue") {
    S.paused = true;
    $("#title").textContent = title;
    $("#body").textContent = body;
    $("#action").hidden = false;
    $("#action").textContent = label;
    action = fn;
    $("#modal").hidden = false;
  }
  function load(n) {
    n = Math.max(1, Math.min(18, Number(n) || 1));
    let l = SF.levels[n - 1];
    S = {
      level: n,
      sand: new SF.SandField(l),
      trucks: l.trucks.map((t, i) => ({
        ...t,
        id: i,
        state: "park",
        angle: A[t.dir],
        load: 0,
        visualLoad: 0,
        capacity: 0,
        t: 0,
        shake: 0,
        loadingPulse: 0,
        homeX: t.x,
        homeY: t.y,
        delivered: 0,
        reserve: 0,
      })),
      particles: [],
      time: 0,
      moves: 0,
      paused: false,
      won: false,
      hint: -1,
      hintTime: 0,
      dead: 0,
      serial: 0,
      entryCooldown: 0,
    };
    for (let c = 0; c < 6; c++) {
      let ts = S.trucks.filter((t) => t.c === c),
        amount = S.sand.counts[c];
      ts.forEach(
        (t, i) =>
          (t.capacity =
            Math.floor(amount / ts.length) + (i < amount % ts.length ? 1 : 0)),
      );
    }
    for (let t of S.trucks) {
      let assigned = t.capacity;
      t.capacity = Math.min(1200, assigned);
      t.reserve = assigned - t.capacity;
    }
    H = [];
    close();
    try {
      localStorage.setItem("sandfall-level", n);
    } catch (e) {}
  }
  function bounds(t) {
    let v = t.dir % 2;
    return {
      x: t.x - (v ? 24 : 47),
      y: t.y - (v ? 47 : 24),
      w: v ? 48 : 94,
      h: v ? 94 : 48,
    };
  }
  function blocked(t) {
    let a = bounds(t),
      d = D[t.dir];
    return S.trucks.some((o) => {
      if (o === t || o.state !== "park") return false;
      let b = bounds(o);
      return d[0]
        ? a.y < b.y + b.h - 5 &&
            a.y + a.h > b.y + 5 &&
            (d[0] < 0 ? b.x + b.w <= a.x + 8 : b.x >= a.x + a.w - 8)
        : a.x < b.x + b.w - 5 &&
            a.x + a.w > b.x + 5 &&
            (d[1] < 0 ? b.y + b.h <= a.y + 8 : b.y >= a.y + a.h - 8);
    });
  }
  function active() {
    return S.trucks.filter((t) => !["park", "done"].includes(t.state));
  }
  function snapshot() {
    H.push({
      grid: Array.from(S.sand.grid),
      total: S.sand.total,
      counts: [...S.sand.counts],
      trucks: JSON.parse(JSON.stringify(S.trucks)),
      moves: S.moves,
      serial: S.serial,
      entryCooldown: S.entryCooldown,
    });
    if (H.length > 25) H.shift();
  }
  function undo() {
    let h = H.pop();
    if (!h) return toast("Nothing to undo yet.");
    S.sand.grid.set(h.grid);
    S.sand.total = h.total;
    S.sand.counts = h.counts;
    S.trucks = h.trucks;
    S.moves = h.moves;
    S.serial = h.serial;
    S.entryCooldown = h.entryCooldown;
    S.particles = [];
    S.won = false;
    S.dead = 0;
    close();
    toast("Restored the full state before dispatch.");
  }
  function dispatch(t) {
    if (S.paused || S.won || t.state !== "park") return;
    SF.audio.init();
    if (blocked(t)) {
      t.shake = 0.5;
      SF.audio.tone(120, 0.16, "square", 0.018);
      return toast("Path blocked. Move the truck ahead first.");
    }
    if (active().length >= 5)
      return toast(
        "All five slots are occupied. Wait for a full truck or undo.",
      );
    snapshot();
    t.state = "start";
    t.ticket = ++S.serial;
    t.t = 0;
    t.ox = t.x;
    t.oy = t.y;
    S.moves++;
    S.dead = 0;
    SF.audio.start();
    for (let i = 0; i < 10; i++)
      S.particles.push({
        x: t.x + 25,
        y: t.y + 20,
        vx: 20 + Math.random() * 30,
        vy: -Math.random() * 20,
        life: 0.6,
        c: "#ffe2b9",
        size: 4 + Math.random() * 5,
        dust: true,
      });
  }
  const ROAD = { left: -60, right: 540, y: 444, speed: 155, returnDelay: 1 };
  function turn(a, b, t) {
    let d =
      ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
  }
  function step(dt) {
    if (S.paused) return;
    S.time += dt;
    S.entryCooldown = Math.max(0, S.entryCooldown - dt);
    for (let k = 0; k < 5; k++) S.sand.step();
    S.hintTime -= dt;
    let gotAll = 0;
    for (let t of S.trucks) {
      t.t += dt;
      t.visualLoad =
        (t.visualLoad || 0) +
        (t.load - (t.visualLoad || 0)) * Math.min(1, dt * 10);
      t.loadingPulse = Math.max(0, (t.loadingPulse || 0) - dt);
      t.shake = Math.max(0, t.shake - dt);
      if (t.state === "start") {
        t.shake = 0.08;
        if (t.t > 0.12) {
          t.state = "merge";
          t.t = 0;
        }
      } else if (t.state === "merge") {
        let d = D[t.dir];
        t.x += d[0] * 650 * dt;
        t.y += d[1] * 650 * dt;
        if (t.x < -65 || t.x > 545 || t.y < 510 || t.y > 960) {
          t.state = "queue";
          t.t = 0;
          t.x = ROAD.right;
          t.y = ROAD.y;
          t.angle = 0;
        }
      } else if (t.state === "queue") {
        let earlier = S.trucks.some(
            (o) =>
              o !== t &&
              ["start", "merge", "queue"].includes(o.state) &&
              o.ticket < t.ticket,
          ),
          near = S.trucks.some(
            (o) => o !== t && o.state === "loop" && o.x > ROAD.right - 112,
          );
        if (!earlier && !near && S.entryCooldown <= 0) {
          t.state = "loop";
          t.x = ROAD.right;
          t.y = ROAD.y;
          t.angle = 0;
          t.t = 0;
          S.entryCooldown = 0.24;
        }
      } else if (t.state === "loop") {
        let p = { x: t.x, y: ROAD.y },
          speed = ROAD.speed;
        let gap = S.trucks
          .filter((o) => o !== t && o.state === "loop" && o.x < t.x)
          .reduce((m, o) => Math.min(m, t.x - o.x), Infinity);
        if (gap < 110) speed = 0;
        if (p.x > 62 && p.x < 412 && t.load < t.capacity) {
          let got = S.sand.drain(
            p.x + 13,
            t.c,
            Math.min(240, t.capacity - t.load),
            (x, y, c) => {
              if (S.particles.length < 4200)
                S.particles.push({
                  x,
                  y,
                  age: 0,
                  duration: 0.23 + Math.random() * 0.08,
                  life: 0.6,
                  c: SF.colors[c],
                  size: 2.2 + Math.random() * 2.6,
                  target: t,
                  bedX: -10 + Math.random() * 45,
                  bedY: -10 + Math.random() * 17,
                  startX: x,
                  startY: y,
                });
            },
          );
          t.load += got;
          gotAll += got;
          if (got) {
            t.loadingPulse = 0.16;
            for (let v = 0; v < Math.min(36, Math.ceil(got * 0.45)); v++) {
              if (S.particles.length >= 4200) break;
              let x = p.x + 13 + (Math.random() - 0.5) * 44;
              S.particles.push({
                x,
                y: 391,
                age: 0,
                duration: 0.2 + Math.random() * 0.12,
                life: 0.6,
                c: SF.colors[t.c],
                size: 2 + Math.random() * 3.2,
                target: t,
                bedX: -10 + Math.random() * 45,
                bedY: -10 + Math.random() * 17,
                startX: x,
                startY: 391,
              });
            }
            if (S.sand.tick % 5 === 0) SF.audio.sand();
          }
        }
        t.x -= speed * dt;
        t.y = ROAD.y;
        t.angle = 0;
        if (t.x <= ROAD.left) {
          t.x = ROAD.left;
          t.t = 0;
          if (t.load >= t.capacity) {
            t.visualLoad = t.capacity;
            t.delivered += t.load;
            SF.audio.tone(650, 0.1);
            if (t.reserve > 0) {
              t.capacity = Math.min(1200, t.reserve);
              t.reserve -= t.capacity;
              t.load = 0;
              t.visualLoad = 0;
              t.x = t.homeX;
              t.y = t.homeY;
              t.angle = A[t.dir];
              t.state = "park";
              t.loadingPulse = 0;
            } else {
              t.state = "done";
            }
          } else {
            t.state = "return";
            t.returnRemaining = ROAD.returnDelay;
          }
        }
      } else if (t.state === "return") {
        t.returnRemaining = Math.max(0, ROAD.returnDelay - t.t);
        if (t.t + 1e-9 >= ROAD.returnDelay) {
          t.state = "queue";
          t.ticket = ++S.serial;
          t.x = ROAD.right;
          t.y = ROAD.y;
          t.angle = 0;
          t.t = 0;
          t.returnRemaining = 0;
        }
      }
    }

    for (let i = S.particles.length - 1; i >= 0; i--) {
      let p = S.particles[i];
      p.life -= dt;
      if (p.target) {
        let t = p.target,
          ca = Math.cos(t.angle),
          sa = Math.sin(t.angle),
          tx = t.x + ca * p.bedX - sa * p.bedY,
          ty = t.y + sa * p.bedX + ca * p.bedY;
        p.age += dt;
        let u = Math.min(1, p.age / p.duration);
        p.x = p.startX + (tx - p.startX) * u;
        p.y = p.startY + (ty - p.startY) * u * u;
        if (u >= 1 || p.life <= 0) {
          S.particles.splice(i, 1);
          if (S.particles.length < 4200)
            for (let j = 0; j < 2; j++)
              S.particles.push({
                x: tx,
                y: ty,
                vx: (Math.random() - 0.5) * 90,
                vy: -25 - Math.random() * 60,
                life: 0.12 + Math.random() * 0.1,
                c: p.c,
                size: 1.5 + Math.random() * 2,
                splash: true,
              });
        }
      } else if (p.confetti) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > 950) S.particles.splice(i, 1);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 80 * dt;
        if (p.life <= 0) S.particles.splice(i, 1);
      }
    }
    if (
      !S.won &&
      S.sand.total === 0 &&
      S.trucks.every((t) => t.state === "done")
    ) {
      S.won = true;
      SF.audio.win();
      for (let i = 0; i < 100; i++)
        S.particles.push({
          x: Math.random() * 480,
          y: -Math.random() * 200,
          vx: (Math.random() - 0.5) * 65,
          vy: 80 + Math.random() * 100,
          life: 10,
          c: SF.colors[i % 6],
          size: 5,
          confetti: true,
        });
      let wonState = S;
      setTimeout(() => {
        if (S !== wonState || !S.won || S.paused) return;
        modal(
          "Loading Complete!",
          `All sand collected!\n${S.moves} dispatches · Study Level ${S.level}`,
          () => load(S.level === 18 ? 1 : S.level + 1),
          "Next Level",
        );
      }, 1300);
    }
    let bottom = S.sand.bottomColors(),
      act = active();
    if (
      !S.won &&
      act.length >= 5 &&
      !act.some((t) => bottom.has(t.c)) &&
      !gotAll
    ) {
      S.dead += dt;
      if (S.dead > 10) {
        S.dead = 0;
        modal(
          "Adjust Your Dispatch Order",
          "All slots are occupied, but no truck matches the bottom sand.\nUndo the last dispatch to try another order.",
          undo,
          "Undo Last Dispatch",
        );
      }
    } else S.dead = 0;
  }
  function truck(t) {
    if (["done", "return", "queue"].includes(t.state)) return;
    let parked = ["park", "start", "merge"].includes(t.state),
      dir = parked ? t.dir : 0,
      vertical = dir % 2,
      w = vertical ? 48 : 98,
      h = vertical ? 94 : 56;
    g.save();
    g.translate(t.x, t.y);
    if (t.shake > 0) {
      g.translate(Math.sin(S.time * 85) * 2, Math.cos(S.time * 100) * 1.2);
    }
    let img = imgs[t.c][dir];
    g.fillStyle = "#a9b7f044";
    g.beginPath();
    g.ellipse(0, h * 0.34, w * 0.45, 9, 0, 0, Math.PI * 2);
    g.fill();
    if (img.complete && img.naturalWidth) {
      let scale = Math.min(w / img.naturalWidth, h / img.naturalHeight),
        dw = img.naturalWidth * scale,
        dh = img.naturalHeight * scale;
      g.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    } else box(-w / 2, -h / 2, w, h, 8, SF.colors[t.c]);
    if (!parked && t.load > 0) {
      let f = Math.min(1, (t.visualLoad || 0) / Math.max(1, t.capacity));
      g.save();
      g.beginPath();
      g.roundRect(-12, -19, 54, 29, 3);
      g.clip();
      let surface = 10 - f * 29;
      g.fillStyle = SF.colors[t.c];
      g.beginPath();
      g.moveTo(-12, 12);
      g.lineTo(-12, surface);
      for (let x = -12; x <= 42; x += 2)
        g.lineTo(
          x,
          surface +
            Math.sin(x * 0.2 + S.time * 7) * 1.1 -
            Math.sin(((x + 12) / 54) * Math.PI) * 2,
        );
      g.lineTo(42, 12);
      g.closePath();
      g.fill();
      for (let i = 0; i < 90; i++) {
        g.fillStyle = i % 3 ? "#fff7" : "#f7b4de66";
        g.fillRect(
          -11 + ((i * 17) % 52),
          surface + 2 + ((i * 11) % Math.max(1, f * 26)),
          1.5,
          1.5,
        );
      }
      g.restore();
    }
    if (parked) {
      let d = D[dir];
      g.strokeStyle = "white";
      g.shadowColor = "#7d67b8";
      g.shadowBlur = 2;
      g.lineWidth = 3;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(-d[0] * 12, -d[1] * 12);
      g.lineTo(d[0] * 9, d[1] * 9);
      g.moveTo(d[0] * 2 - d[1] * 7, d[1] * 2 + d[0] * 7);
      g.lineTo(d[0] * 10, d[1] * 10);
      g.lineTo(d[0] * 2 + d[1] * 7, d[1] * 2 - d[0] * 7);
      g.stroke();
    } else {
      let pct = Math.min(
        100,
        Math.floor((t.load / Math.max(1, t.capacity)) * 100),
      );
      box(-23, -11, 46, 23, 8, t.loadingPulse > 0 ? "#ff65a4ee" : "#8061ccee");
      txt(pct + "%", 0, 1, 14, "#fff");
      box(-23, 18, 46, 4, 2, "#e8c9ff");
      box(
        -23,
        18,
        (46 * t.load) / Math.max(1, t.capacity),
        4,
        2,
        SF.colors[t.c],
      );
    }
    g.restore();
    if (S.hint === t.id && S.hintTime > 0 && t.state === "park") {
      let b = bounds(t);
      g.save();
      g.strokeStyle = "#fff6a3";
      g.lineWidth = 4;
      g.setLineDash([6, 4]);
      g.lineDashOffset = -S.time * 20;
      g.beginPath();
      g.roundRect(b.x - 7, b.y - 7, b.w + 14, b.h + 14, 14);
      g.stroke();
      g.restore();
    }
  }
  function draw() {
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.clearRect(0, 0, 480, 900);
    let bg = g.createLinearGradient(0, 0, 0, 900);
    bg.addColorStop(0, "#b7edff");
    bg.addColorStop(1, "#ffe0a3");
    g.fillStyle = bg;
    g.fillRect(0, 0, 480, 900);
    for (let i = 0; i < 65; i++) {
      g.fillStyle = "#f5ffed12";
      g.beginPath();
      g.arc((i * 127) % 480, (i * 173) % 900, 2 + (i % 3), 0, Math.PI * 2);
      g.fill();
    }
    box(18, 18, 444, 83, 20, "#fff7e6");
    txt("LEVEL " + String(S.level).padStart(2, "0"), 240, 43, 24);
    txt(SF.art[S.level - 1].title.toUpperCase(), 240, 69, 10, "#a181c0");
    txt("✦ " + (1250 + S.level * 50), 80, 48, 14, "#ef8e32");
    txt("STUDY", 402, 48, 12, "#b08bc5");
    box(92, 89, 296, 5, 3, "#ead9ff");
    box(92, 89, 296 * (1 - S.sand.total / S.sand.initial), 5, 3, "#ffb945");
    box(-8, 409, 496, 70, 0, "#c1a1f3");
    box(-8, 413, 496, 62, 0, "#fff4e3");
    box(-8, 419, 496, 50, 0, "#b1a4ee");
    box(-8, 422, 496, 44, 0, "#c6b7ff");
    g.save();
    g.strokeStyle = "#fff8d9cc";
    g.lineWidth = 2;
    g.setLineDash([14, 15]);
    g.beginPath();
    g.moveTo(0, 444);
    g.lineTo(480, 444);
    g.stroke();
    g.restore();
    txt("←", 27, 444, 24, "#fff8d9");
    txt("←", 453, 444, 24, "#fff8d9");
    box(78, 173, 324, 232, 12, "#b99beb");
    box(83, 178, 314, 222, 8, "#ffe4a4");
    box(88, 185, 304, 210, 2, "#fff4d5");
    S.sand.render(g);
    txt(
      "← Load while moving left · Return from right after 1s",
      240,
      490,
      9,
      "#9271b5",
    );
    box(62, 512, 356, 56, 15, "#b5a0e7");
    for (let i = 0; i < 5; i++) {
      let x = 80 + i * 65;
      box(x, 522, 58, 35, 8, "#e3caff");
      let t = active()[i];
      if (t) {
        box(x + 7, 530, 44, 19, 5, SF.colors[t.c]);
        txt(
          t.state === "return"
            ? t.returnRemaining.toFixed(1) + "s"
            : t.state === "queue"
              ? "…"
              : "←",
          x + 29,
          539,
          ["return", "queue"].includes(t.state) ? 11 : 18,
          "#fff",
        );
      } else txt("+", x + 29, 540, 25, "#fff7d9");
    }
    txt("Active Trucks  " + active().length + " / 5", 240, 588, 11, "#9270b0");
    box(56, 604, 368, 258, 18, "#f8cbe6");
    g.save();
    g.strokeStyle = "#fff8e799";
    g.setLineDash([5, 7]);
    for (let y = 610; y < 860; y += 64) {
      g.beginPath();
      g.moveTo(70, y);
      g.lineTo(410, y);
      g.stroke();
    }
    g.restore();
    txt("Tap a truck with a clear path ahead", 240, 880, 12, "#a076b3");
    S.trucks
      .filter((t) => ["park", "start"].includes(t.state))
      .sort((a, b) => a.y - b.y)
      .forEach(truck);
    S.trucks.filter((t) => !["park", "start"].includes(t.state)).forEach(truck);
    for (let p of S.particles) {
      g.globalAlpha = p.dust ? Math.max(0, p.life / 0.6) * 0.4 : 1;
      g.fillStyle = p.c;
      if (p.dust) {
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        g.fill();
      } else g.fillRect(p.x, p.y, p.size, p.size);
    }
    g.globalAlpha = 1;
  }
  function frame(ts) {
    let dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (!S.paused) {
      acc += dt;
      let n = 0;
      while (acc >= 1 / 60 && n++ < 4) {
        step(1 / 60);
        acc -= 1 / 60;
      }
    } else acc = 0;
    draw();
    requestAnimationFrame(frame);
  }
  cv.addEventListener("pointerdown", (e) => {
    let r = cv.getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * 480,
      y = ((e.clientY - r.top) / r.height) * 900,
      t = [...S.trucks].reverse().find((t) => {
        let b = bounds(t);
        return (
          t.state === "park" &&
          x > b.x - 5 &&
          x < b.x + b.w + 5 &&
          y > b.y - 5 &&
          y < b.y + b.h + 5
        );
      });
    if (t) dispatch(t);
  });
  $("#restart").onclick = () => load(S.level);
  $("#undo").onclick = undo;
  $("#hint").onclick = () => {
    let bottom = S.sand.bottomColors(),
      legal = S.trucks.filter((t) => t.state === "park" && !blocked(t)),
      t = legal.find((t) => bottom.has(t.c)) || legal[0];
    if (!t) return toast("Wait for loading or undo a dispatch.");
    S.hint = t.id;
    S.hintTime = 5;
    toast(
      bottom.has(t.c)
        ? "The highlighted truck matches the bottom sand."
        : "Move the highlighted truck to clear the path.",
    );
  };
  $("#pause").onclick = () =>
    S.paused
      ? close()
      : modal(
          "Game Paused",
          "Truck movement and sand simulation are paused.",
          close,
          "Resume Game",
        );
  $("#sound").onclick = () => {
    SF.audio.init();
    SF.audio.enabled = !SF.audio.enabled;
    $("#sound").textContent = SF.audio.enabled ? "♫" : "♪";
    toast(SF.audio.enabled ? "Sound on" : "Sound off");
  };
  $("#action").onclick = () => action && action();
  $("#close").onclick = close;
  $("#levels").onclick = () => {
    modal("Select a Study Level", "", null);
    $("#action").hidden = true;
    let grid = document.createElement("div");
    grid.className = "grid";
    for (let n = 1; n <= 18; n++) {
      let b = document.createElement("button");
      b.type = "button";
      let preview = document.createElement("img");
      preview.src = "assets/art/level-" + String(n).padStart(2, "0") + ".png";
      preview.alt = SF.art[n - 1].title;
      let caption = document.createElement("span");
      caption.textContent = n + ". " + SF.art[n - 1].title;
      b.append(preview, caption);
      b.className = n === S.level ? "selected" : "";
      b.onclick = () => load(n);
      grid.appendChild(b);
    }
    $("#body").appendChild(grid);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !S.paused && !S.won)
      modal(
        "Paused",
        "Automatically paused when switching windows.",
        close,
        "Resume Game",
      );
  });
  window.SandfallStudy = {
    get state() {
      return S;
    },
    load,
    dispatch,
    blocked,
    step,
    undo,
    draw,
  };
  let saved = 1;
  try {
    saved = Number(localStorage.getItem("sandfall-level")) || 1;
  } catch (e) {}
  load(saved);
  requestAnimationFrame(frame);
  toast("Tap trucks rapidly! They join the road in order.");
})();
