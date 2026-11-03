// v68: visuals for the v67 towers — HBM zaps & ground current, claw grabs, sniper shots, and the
// rare+ ultimates (sonic, sniper, hbm, lily, fed, mortar shell streaks). Vector-drawn until GPT sheets land.
const TAU = Math.PI * 2;
const rnd = s => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };
function bolt(c, x0, y0, x1, y1, seed, jag, w, col) {
  const n = 7; c.beginPath(); c.moveTo(x0, y0);
  for (let i = 1; i < n; i++) { const k = i / n; c.lineTo(x0 + (x1 - x0) * k + (rnd(seed + i) - .5) * jag, y0 + (y1 - y0) * k + (rnd(seed + i * 3) - .5) * jag * .4); }
  c.lineTo(x1, y1); c.strokeStyle = col; c.lineWidth = w; c.stroke();
}
// returns true when the effect was drawn here
export function drawEffectV68(r, c, f, p, pos) {
  if (f.type === 'zap') {
    const s = (f.seed || 0) + Math.floor(p * 9) * 17, top = pos.y - 46; c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    c.globalAlpha *= 1 - p * .6; c.shadowColor = '#5affd0'; c.shadowBlur = 10;
    bolt(c, pos.x, pos.y + 6, pos.x + (rnd(s) - .5) * 10, top, s, 16, 4.5, '#2ef0b0aa'); bolt(c, pos.x, pos.y + 6, pos.x + (rnd(s) - .5) * 10, top, s, 16, 1.6, '#f2fffa');
    bolt(c, pos.x, pos.y - 14, pos.x + 18 * (rnd(s + 5) - .5) * 2, pos.y - 26, s + 9, 8, 1.2, '#b8ffe9');
    c.shadowBlur = 0; c.globalAlpha *= .8; c.strokeStyle = '#7fffe0'; c.lineWidth = 2; c.beginPath(); c.ellipse(pos.x, pos.y + 4, 6 + p * 20, (6 + p * 20) * .38, 0, 0, TAU); c.stroke();
    return true;
  }
  if (f.type === 'claw') {
    const to = r.point(f.tx ?? f.x, f.ty ?? f.y, 0), k = p < .35 ? 0 : (p - .35) / .65, e = k * k * (3 - 2 * k), x = pos.x + (to.x - pos.x) * e, y = pos.y + (to.y - pos.y) * e - Math.sin(e * Math.PI) * 40;
    c.strokeStyle = '#c9b48a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y - 40 - (1 - Math.min(1, p * 3)) * 30); c.lineTo(x, y - 8); c.stroke();
    c.fillStyle = '#7fd65a'; c.strokeStyle = '#2f6a22'; c.lineWidth = 1; c.beginPath(); c.roundRect(x - 3.5, y - 6, 7, 10, 2); c.fill(); c.stroke();
    const grip = p < .35 ? 1 - p / .35 : 0; c.strokeStyle = '#d9dee4'; c.lineWidth = 2.2; c.lineCap = 'round';
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(x, y - 9); c.quadraticCurveTo(x + sd * (9 + grip * 4), y - 6, x + sd * (4 + grip * 5), y + 3); c.stroke(); }
    c.fillStyle = '#ffb02a'; c.beginPath(); c.arc(x, y - 10, 2.4, 0, TAU); c.fill(); return true;
  }
  if (f.type === 'lily-hit') {
    c.globalCompositeOperation = 'lighter'; const rr = 6 + p * 26; c.globalAlpha *= 1 - p; c.strokeStyle = '#ff6aa8'; c.lineWidth = 3 * (1 - p) + 1; c.beginPath(); c.ellipse(pos.x, pos.y - 8, rr, rr * .7, 0, 0, TAU); c.stroke();
    c.globalCompositeOperation = 'source-over'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + p * 2, d = 6 + p * 22; heart(c, pos.x + Math.cos(a) * d, pos.y - 10 + Math.sin(a) * d * .7 - p * 10, 3.2 * (1 - p * .5)); }
    return true;
  }
  if (f.type === 'snipe') {
    const rr = 26 * (1 - p) + 8; c.strokeStyle = '#ffd34f'; c.lineWidth = 1.6; c.beginPath(); c.arc(pos.x, pos.y - 10, rr, 0, TAU); c.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.beginPath(); c.moveTo(pos.x + Math.cos(a) * (rr - 6), pos.y - 10 + Math.sin(a) * (rr - 6)); c.lineTo(pos.x + Math.cos(a) * (rr + 6), pos.y - 10 + Math.sin(a) * (rr + 6)); c.stroke(); }
    if (p > .25) { c.globalCompositeOperation = 'lighter'; c.globalAlpha *= (1 - p) * 1.4; c.strokeStyle = '#fff6c8'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(pos.x, pos.y - 10); c.lineTo(pos.x + 30, pos.y + 260); c.stroke(); c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(pos.x, pos.y - 10, 9 * (1 - p) + 3, 0, TAU); c.fill(); }
    return true;
  }
  return false;
}
function heart(c, x, y, r) { c.save(); c.translate(x, y); c.fillStyle = '#ff5a9a'; c.strokeStyle = '#7a1238'; c.lineWidth = .8; c.beginPath(); c.moveTo(0, r * .9); c.bezierCurveTo(-r * 1.6, -r * .2, -r * .7, -r * 1.4, 0, -r * .5); c.bezierCurveTo(r * .7, -r * 1.4, r * 1.6, -r * .2, 0, r * .9); c.fill(); c.stroke(); c.restore(); }
function pen(c, x, y, ang, s = 1) { c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s); c.lineWidth = 1; c.strokeStyle = '#5a1830'; c.fillStyle = '#fff4f8'; c.beginPath(); c.roundRect(-9, -2.6, 13, 5.2, 2.4); c.fill(); c.stroke(); c.fillStyle = '#ff5aa0'; c.fillRect(-4, -2.6, 4, 5.2); c.fillStyle = '#8a2a55'; c.beginPath(); c.roundRect(-12, -2.2, 3.4, 4.4, 1.2); c.fill(); c.strokeStyle = '#cfd6de'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(4, 0); c.lineTo(8, 0); c.stroke(); c.restore(); }
function dove(c, x, y, s, flap) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#ffffff'; c.strokeStyle = '#8ea0b8'; c.lineWidth = .8; c.beginPath(); c.ellipse(0, 0, 6, 3, 0, 0, TAU); c.fill(); c.stroke(); for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(-1, 0); c.quadraticCurveTo(1, sd * (8 + flap * 4), 5, sd * (2 + flap * 6)); c.quadraticCurveTo(3, 0, -1, 0); c.fill(); c.stroke(); } c.fillStyle = '#ffb02a'; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-8.5, -1); c.lineTo(-8.5, 1); c.fill(); c.restore(); }
// returns true when the ultimate was drawn here
export function drawUltV68(r, c, u, k, t, W, H) {
  const fade = Math.min(1, u.t * 5, (u.dur - u.t) * 4);
  if (u.kind === 'sonic') { const o = r.point(u.x, u.y, 0); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const kk = Math.max(0, k - i * .08), rad = kk * 620; if (kk <= 0) continue; c.globalAlpha = fade * (1 - kk) * .9; c.strokeStyle = i ? '#9fe8ff' : '#ffffff'; c.lineWidth = 10 - i * 2; c.beginPath(); c.ellipse(o.x, o.y, rad, rad * .45, 0, 0, TAU); c.stroke(); } return true; }
  if (u.kind === 'sniper') { c.globalAlpha = fade * .55; const g = c.createRadialGradient(W / 2, H * .38, H * .18, W / 2, H * .38, H * .7); g.addColorStop(0, '#0000'); g.addColorStop(1, '#000c'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.globalAlpha = fade * .8; c.strokeStyle = '#ffd34f'; c.lineWidth = 1.2; c.beginPath(); c.arc(W / 2, H * .38, H * .18, 0, TAU); c.moveTo(W / 2 - H * .2, H * .38); c.lineTo(W / 2 + H * .2, H * .38); c.moveTo(W / 2, H * .2); c.lineTo(W / 2, H * .56); c.stroke(); return true; }
  if (u.kind === 'hbm') { c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const y = (rnd(i) * .55 + .03) * H, x0 = rnd(i + 40) * W, len = 40 + rnd(i + 80) * 120, on = (Math.sin(t * 9 + i * 1.7) + 1) / 2; c.globalAlpha = fade * on * .55; c.strokeStyle = '#3dffc0'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + len, y); c.lineTo(x0 + len + 14, y + 14); c.stroke(); c.fillStyle = '#d9fff3'; c.beginPath(); c.arc(x0 + ((t * 160 + i * 37) % len), y, 1.8, 0, TAU); c.fill(); } c.globalAlpha = fade * .12; c.fillStyle = '#20ffb0'; c.fillRect(0, 0, W, H * .6); return true; }
  if (u.kind === 'lily') { c.globalAlpha = fade * .28; const g = c.createLinearGradient(0, 0, 0, H * .7); g.addColorStop(0, '#ff8ab8'); g.addColorStop(1, '#ff8ab800'); c.fillStyle = g; c.fillRect(0, 0, W, H * .7); c.globalAlpha = fade; for (let i = 0; i < 30; i++) { const x = rnd(i) * W, y = ((rnd(i + 9) * .3 + k * 1.3) % 1) * H * .65, a = Math.PI / 2 + (rnd(i + 3) - .5) * .5; pen(c, x, y, a, 1.1); } return true; }
  if (u.kind === 'fed') { c.globalAlpha = fade; for (let i = 0; i < 22; i++) { const x = W + 40 - ((k * 1.25 + rnd(i) * .5) % 1.4) * (W + 120), y = (rnd(i + 7) * .5 + .05) * H; dove(c, x, y, 2 + rnd(i + 2) * 1.2, Math.sin(t * 18 + i)); } if (u.t > .55 && u.t < .9) { c.globalAlpha = (1 - (u.t - .55) / .35) * .55; c.fillStyle = '#fff8e0'; c.fillRect(0, 0, W, H); } return true; }
  if (u.kind === 'mortar') { for (const s of u.shells || []) { if (s.done || u.t < s.at - .32) continue; const q = 1 - (s.at - u.t) / .32, p = r.point(s.x, s.y, 0), y = p.y - 220 * (1 - q); c.globalAlpha = .9; c.strokeStyle = '#ffd08a'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - 8, y - 26); c.lineTo(p.x, y); c.stroke(); c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(p.x, y, 3.4, 0, TAU); c.fill(); c.globalAlpha = .35 * q; c.fillStyle = '#000'; c.beginPath(); c.ellipse(p.x, p.y, 10 * q, 4 * q, 0, 0, TAU); c.fill(); } return true; }
  return false;
}
// Faint current crawling through the ground while an HBM tower is on the wall.
export function drawHbmGround(r, c, g, W, H) {
  if (!g.cannons.some(u => u.type === 'hbm')) return; const t = g.time; c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) { const y = (rnd(i + 200) * .5 + .06) * H, x0 = rnd(i + 300) * W * .8, len = 60 + rnd(i + 400) * 140, ph = (t * .35 + rnd(i + 500)) % 1; c.globalAlpha = .1 + .06 * Math.sin(t * 2 + i); c.strokeStyle = '#3dffc0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + len * .6, y); c.lineTo(x0 + len * .6 + 10, y + 10); c.lineTo(x0 + len, y + 10); c.stroke(); const px = ph < .6 ? x0 + len * ph : x0 + len * .6 + (ph - .6) / .4 * len * .4, py = ph < .6 ? y : y + 10; c.globalAlpha = .55; c.fillStyle = '#d9fff3'; c.beginPath(); c.arc(px, py, 1.6, 0, TAU); c.fill(); }
  c.restore();
}
