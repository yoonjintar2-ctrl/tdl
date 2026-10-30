// Lightweight full-screen particle layer for card reveals: flames, sparks, magic dust, rings, flashes.
// One canvas, additive blending, capped particle count so phones stay smooth.
const TAU = Math.PI * 2;
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export class FX {
  constructor(canvas) { this.canvas = canvas; this.c = canvas.getContext('2d'); this.parts = []; this.emitters = new Set(); this.running = false; this.last = 0; this.shake = 0; this.resize(); }
  resize() { const r = this.canvas.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); this.w = r.width; this.h = r.height; this.canvas.width = Math.round(r.width * d); this.canvas.height = Math.round(r.height * d); this.c.setTransform(d, 0, 0, d, 0, 0); }
  start() { if (this.running) return; this.running = true; this.last = performance.now(); const loop = now => { if (!this.running) return; const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.step(dt); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  stop() { this.running = false; this.parts = []; this.emitters.clear(); this.c.clearRect(0, 0, this.w, this.h); }
  add(p) { if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900); this.parts.push(p); }
  // Flame tongues licking up around a rect (card back aura). Returns an emitter handle.
  flameAura(getRect, color, intensity = 1) { const e = { kind: 'flame', getRect, color: rgb(color), intensity, acc: 0 }; this.emitters.add(e); return e; }
  dustAura(getRect, color, rate = 6) { const e = { kind: 'dust', getRect, color: rgb(color), rate, acc: 0 }; this.emitters.add(e); return e; }
  remove(e) { this.emitters.delete(e); }
  burst(x, y, color, { count = 60, speed = 260, size = 3, gravity = 260, life = 1.1 } = {}) {
    const col = rgb(color);
    for (let i = 0; i < count; i++) { const a = Math.random() * TAU, s = speed * (.35 + Math.random() * .8); this.add({ t: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * .25, g: gravity, life: life * (.6 + Math.random() * .6), age: 0, size: size * (.6 + Math.random()), col }); }
  }
  ring(x, y, color, { radius = 160, life = .7, width = 6 } = {}) { this.add({ t: 'ring', x, y, r0: 10, r1: radius, life, age: 0, width, col: rgb(color) }); }
  flash(x, y, color, { radius = 260, life = .55 } = {}) { this.add({ t: 'flash', x, y, radius, life, age: 0, col: rgb(color) }); }
  glitter(x, y, w, h, color, count = 26) { const col = rgb(color); for (let i = 0; i < count; i++) this.add({ t: 'dust', x: x + Math.random() * w, y: y + Math.random() * h, vx: (Math.random() - .5) * 30, vy: -20 - Math.random() * 50, life: 1.2 + Math.random() * 1.6, age: 0, size: 1.6 + Math.random() * 2.2, col, tw: Math.random() * TAU }); }
  rain(color, count = 80) { const col = rgb(color); for (let i = 0; i < count; i++) this.add({ t: 'dust', x: Math.random() * this.w, y: -20 - Math.random() * this.h * .4, vx: (Math.random() - .5) * 20, vy: 60 + Math.random() * 90, life: 2.4 + Math.random() * 1.4, age: 0, size: 2 + Math.random() * 2.5, col, tw: Math.random() * TAU }); }
  step(dt) {
    const c = this.c; c.clearRect(0, 0, this.w, this.h);
    for (const e of this.emitters) {
      const r = e.getRect(); if (!r) continue;
      if (e.kind === 'flame') {
        e.acc += dt * 90 * e.intensity;
        while (e.acc > 1) { e.acc--; const side = Math.random(), per = 2 * (r.width + r.height); let d = side * per, x, y;
          if (d < r.width) { x = r.left + d; y = r.top; } else if ((d -= r.width) < r.height) { x = r.right; y = r.top + d; } else if ((d -= r.height) < r.width) { x = r.right - d; y = r.bottom; } else { d -= r.width; x = r.left; y = r.bottom - d; }
          this.add({ t: 'flame', x: x + (Math.random() - .5) * 6, y: y + (Math.random() - .5) * 6, vx: (Math.random() - .5) * 18, vy: -30 - Math.random() * 60 * e.intensity, life: .55 + Math.random() * .6, age: 0, size: (5 + Math.random() * 9) * (.7 + e.intensity * .4), col: e.color }); }
      } else {
        e.acc += dt * e.rate;
        while (e.acc > 1) { e.acc--; this.add({ t: 'dust', x: r.left + Math.random() * r.width, y: r.top + r.height * (.3 + Math.random() * .7), vx: (Math.random() - .5) * 10, vy: -12 - Math.random() * 26, life: 1.6 + Math.random() * 1.6, age: 0, size: 1.4 + Math.random() * 1.8, col: e.color, tw: Math.random() * TAU }); }
      }
    }
    c.save(); c.globalCompositeOperation = 'lighter';
    const alive = [];
    for (const p of this.parts) {
      p.age += dt; if (p.age >= p.life) continue; alive.push(p); const k = p.age / p.life, [R, G, B] = p.col;
      if (p.t === 'flame') {
        p.x += p.vx * dt + Math.sin((p.age + p.x) * 9) * 12 * dt; p.y += p.vy * dt; const s = p.size * (1 - k * .7), a = (1 - k) * .55;
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, s); g.addColorStop(0, `rgba(255,248,225,${a})`); g.addColorStop(.35, `rgba(${R},${G},${B},${a * .8})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, s, 0, TAU); c.fill();
      } else if (p.t === 'spark') {
        p.vy += p.g * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; const a = 1 - k;
        c.strokeStyle = `rgba(${R},${G},${B},${a})`; c.lineWidth = p.size * (1 - k * .5); c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .035, p.y - p.vy * .035); c.stroke();
        c.fillStyle = `rgba(255,255,240,${a})`; c.beginPath(); c.arc(p.x, p.y, p.size * .45, 0, TAU); c.fill();
      } else if (p.t === 'dust') {
        p.x += p.vx * dt; p.y += p.vy * dt; p.tw += dt * 5; const tw = .55 + .45 * Math.sin(p.tw), a = Math.min(1, (1 - k) * 2, k * 6) * tw;
        c.fillStyle = `rgba(${R},${G},${B},${a})`; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill();
        if (tw > .85) { const L = p.size * 5 * tw; c.strokeStyle = `rgba(255,255,245,${a * .9})`; c.lineWidth = .9; c.beginPath(); c.moveTo(p.x - L, p.y); c.lineTo(p.x + L, p.y); c.moveTo(p.x, p.y - L); c.lineTo(p.x, p.y + L); c.stroke(); }
      } else if (p.t === 'ring') {
        const r = p.r0 + (p.r1 - p.r0) * (1 - (1 - k) ** 3); c.strokeStyle = `rgba(${R},${G},${B},${(1 - k) * .9})`; c.lineWidth = p.width * (1 - k); c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.stroke();
      } else if (p.t === 'flash') {
        const a = (1 - k) ** 2 * .9, g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * (.6 + k * .6)); g.addColorStop(0, `rgba(255,255,250,${a})`); g.addColorStop(.3, `rgba(${R},${G},${B},${a * .6})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`); c.fillStyle = g; c.fillRect(p.x - p.radius * 1.3, p.y - p.radius * 1.3, p.radius * 2.6, p.radius * 2.6);
      }
    }
    this.parts = alive; c.restore();
  }
}
