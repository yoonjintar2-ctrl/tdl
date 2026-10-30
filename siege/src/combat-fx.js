// Arcade-style combat effects: glowing tracers, smoking missiles, layered fireballs, lightning, damage numbers.
// Glows come from cached radial sprites drawn with additive blending, which stays cheap on phones.
const TAU = Math.PI * 2;
const sprites = new Map();
function glow(color) {
  if (sprites.has(color)) return sprites.get(color);
  const s = typeof document !== 'undefined' ? document.createElement('canvas') : null; if (!s) return null;
  s.width = s.height = 64; const c = s.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, color); g.addColorStop(.55, color.replace(/[\d.]+\)$/, '0.35)')); g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  c.fillStyle = g; c.fillRect(0, 0, 64, 64); sprites.set(color, s); return s;
}
const G = { gold: 'rgba(255,196,80,1)', white: 'rgba(255,250,225,1)', fire: 'rgba(255,120,30,1)', blue: 'rgba(110,200,255,1)', cyan: 'rgba(90,255,230,1)', green: 'rgba(150,255,110,1)', purple: 'rgba(200,120,255,1)', red: 'rgba(255,80,60,1)' };
function blob(c, x, y, r, key, a = 1) { const s = glow(G[key] || key); if (!s) return; c.globalAlpha = a; c.drawImage(s, x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; }
function stroke(c, pts, col, w) { c.beginPath(); c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }

export function drawProjectile(c, p, position, t) {
  if (p.elapsed < 0) return; const u = Math.max(0, Math.min(1, p.elapsed / p.duration)), pt = position(u);
  c.save(); c.globalCompositeOperation = 'lighter';
  if (p.type === 'bullet') { // hot tracer
    const tail = position(Math.max(0, u - .16)); stroke(c, [[tail.x, tail.y], [pt.x, pt.y]], 'rgba(255,170,60,.55)', 3.2); stroke(c, [[tail.x, tail.y], [pt.x, pt.y]], 'rgba(255,245,210,.95)', 1.2); blob(c, pt.x, pt.y, 5, 'gold');
  } else if (p.type === 'slug') { // sniper round: long white-hot streak
    const tail = position(Math.max(0, u - .35)); stroke(c, [[tail.x, tail.y], [pt.x, pt.y]], 'rgba(140,200,255,.45)', 5); stroke(c, [[tail.x, tail.y], [pt.x, pt.y]], 'rgba(255,255,255,1)', 1.8); blob(c, pt.x, pt.y, 9, 'blue');
  } else if (p.type === 'mortar' || p.type === 'shell') { // missile / siege shell with smoke trail and flame
    for (let i = 1; i <= 7; i++) { const q = position(Math.max(0, u - i * .035)); c.globalCompositeOperation = 'source-over'; c.globalAlpha = .22 * (1 - i / 8); c.fillStyle = '#d9d2c4'; c.beginPath(); c.arc(q.x + Math.sin(i * 2.1 + t * 5) * 1.2, q.y, 2 + i * .7, 0, TAU); c.fill(); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'lighter'; const back = position(Math.max(0, u - .04)); blob(c, back.x, back.y, 7 + Math.sin(t * 40) * 1.5, 'fire'); blob(c, pt.x, pt.y, 5, 'gold');
    c.globalCompositeOperation = 'source-over'; c.fillStyle = '#5b4a3a'; c.beginPath(); c.arc(pt.x, pt.y, 2.4, 0, TAU); c.fill();
  } else if (p.type === 'venom') {
    for (let i = 1; i <= 4; i++) { const q = position(Math.max(0, u - i * .05)); blob(c, q.x, q.y, 4 - i * .6, 'purple', .7); }
    blob(c, pt.x, pt.y, 7, 'purple'); c.globalCompositeOperation = 'source-over'; c.fillStyle = '#b77cff'; c.beginPath(); c.arc(pt.x, pt.y, 2.3, 0, TAU); c.fill();
  } else if (p.type === 'slime') {
    blob(c, pt.x, pt.y, 8, 'green', .8); c.globalCompositeOperation = 'source-over'; c.fillStyle = '#9be86a'; c.beginPath(); c.ellipse(pt.x, pt.y, 3.6, 2.8, t * 6, 0, TAU); c.fill(); c.fillStyle = '#e6ffd0'; c.beginPath(); c.arc(pt.x - 1, pt.y - 1, 1, 0, TAU); c.fill();
  } else { blob(c, pt.x, pt.y, 5, p.color ? 'gold' : 'white'); }
  c.restore();
}

// Returns true if this module drew the effect.
export function drawEffect(c, f, pos, p, point) {
  const live = 1 - p;
  if (f.type === 'explosion') {
    c.save(); const R = f.radius || 30, big = R > 40;
    c.globalCompositeOperation = 'lighter';
    blob(c, pos.x, pos.y, R * (.6 + p * 1.1), f.color === '#a3ed75' ? 'green' : 'fire', live * .95);
    blob(c, pos.x, pos.y, R * (.35 + p * .5), 'gold', live);
    blob(c, pos.x, pos.y, R * .3 * (1 - p), 'white', live);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = live * .8; c.strokeStyle = f.color === '#a3ed75' ? '#d8ffc0' : '#ffe2a0'; c.lineWidth = 2.5 * live; c.beginPath(); c.ellipse(pos.x, pos.y, R * (.3 + p * 1.2), R * (.3 + p * 1.2) * .55, 0, 0, TAU); c.stroke();
    if (big) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + f.x, d = R * (.2 + p * .8); c.globalAlpha = live * .35; c.fillStyle = '#4a3a30'; c.beginPath(); c.arc(pos.x + Math.cos(a) * d, pos.y + Math.sin(a) * d * .55 - p * 14, 4 + p * 9, 0, TAU); c.fill(); }
    c.restore(); return true;
  }
  if (f.type === 'beam') {
    const end = point(f.tx, f.ty, f.targetAltitude || 0); c.save(); c.globalCompositeOperation = 'lighter';
    if (f.width < 1.6) { // drone: crackling lightning
      const segs = 7, pts = [[pos.x, pos.y]]; for (let i = 1; i < segs; i++) { const k = i / segs; pts.push([pos.x + (end.x - pos.x) * k + (Math.random() - .5) * 9, pos.y + (end.y - pos.y) * k + (Math.random() - .5) * 9]); } pts.push([end.x, end.y]);
      stroke(c, pts, 'rgba(110,200,255,.5)', 4.5 * live); stroke(c, pts, 'rgba(235,250,255,.95)', 1.3); blob(c, end.x, end.y, 10 * live + 4, 'blue'); blob(c, pos.x, pos.y, 6, 'blue');
    } else { // laser: layered glowing beam with flicker
      const w = f.width * (1 + Math.sin(performance.now() / 30) * .15);
      stroke(c, [[pos.x, pos.y], [end.x, end.y]], 'rgba(60,255,220,.25)', w * 5 * live + 2); stroke(c, [[pos.x, pos.y], [end.x, end.y]], 'rgba(90,255,230,.6)', w * 2); stroke(c, [[pos.x, pos.y], [end.x, end.y]], 'rgba(255,255,255,.95)', w * .7);
      blob(c, pos.x, pos.y, 9, 'cyan'); for (let i = 0; i < 4; i++) { const k = (i + .5) / 4 + Math.sin(i * 7 + performance.now() / 90) * .05; blob(c, pos.x + (end.x - pos.x) * k, pos.y + (end.y - pos.y) * k, 4 * live + 2, 'cyan', .8); }
    }
    c.restore(); return true;
  }
  if (f.type === 'bullet-hit') { c.save(); c.globalCompositeOperation = 'lighter'; blob(c, pos.x, pos.y, (f.heavy ? 16 : 8) * (1 - p * .5), f.heavy ? 'blue' : 'gold', live); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + f.x, r = (f.heavy ? 12 : 7) * (.3 + p); stroke(c, [[pos.x + Math.cos(a) * r * .4, pos.y + Math.sin(a) * r * .4], [pos.x + Math.cos(a) * r, pos.y + Math.sin(a) * r]], 'rgba(255,240,200,' + live + ')', 1.1); } c.restore(); return true; }
  if (f.type === 'muzzle') { c.save(); c.globalCompositeOperation = 'lighter'; const r = (f.weapon === 'machine' ? 7 : 10) * live; blob(c, pos.x, pos.y, r * 1.8, f.weapon === 'laser' ? 'cyan' : 'fire', live); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; stroke(c, [[pos.x, pos.y], [pos.x + Math.cos(a) * r * 1.4, pos.y + Math.sin(a) * r * 1.4]], 'rgba(255,240,190,' + live + ')', 1.4); } c.restore(); return true; }
  if (f.type === 'dmg') { // stacked floating damage numbers
    c.save(); const s = (f.crit ? 15 : 11) * (p < .12 ? 1 + (1 - p / .12) * .6 : 1), y = pos.y - p * 26;
    c.font = `900 ${s}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 3.4; c.strokeStyle = 'rgba(40,10,0,' + Math.min(1, live * 1.6) + ')'; c.strokeText(f.amount, pos.x, y);
    c.fillStyle = f.color || '#fff1c4'; c.globalAlpha = Math.min(1, live * 1.6); c.fillText(f.amount, pos.x, y); c.restore(); return true;
  }
  if (f.type === 'attack-marker') { c.save(); for (let i = 0; i < 3; i++) { const q = Math.min(1, p + i * .18); const r = (f.radius || 26) * (1.8 - q * 1.4); c.globalAlpha = (1 - p) * .95; c.strokeStyle = '#7fff6a'; c.lineWidth = 2.2; c.beginPath(); c.ellipse(pos.x, pos.y, r, r * .45, 0, 0, TAU); c.stroke(); } for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, d = 30 * (1 - p) + 6; c.fillStyle = `rgba(127,255,106,${1 - p})`; c.beginPath(); c.moveTo(pos.x + Math.cos(a) * d, pos.y + Math.sin(a) * d * .45); c.lineTo(pos.x + Math.cos(a + .25) * (d + 9), pos.y + Math.sin(a + .25) * (d + 9) * .45); c.lineTo(pos.x + Math.cos(a - .25) * (d + 9), pos.y + Math.sin(a - .25) * (d + 9) * .45); c.closePath(); c.fill(); } c.restore(); return true; }
  if (f.type === 'sonic') { c.save(); for (let i = 0; i < 3; i++) { const q = Math.min(1, p * 1.15 + i * .12); if (q >= 1) continue; const r = (f.radius || 100) * q; c.globalAlpha = (1 - q) * .8; c.strokeStyle = i ? '#d8f6ff' : '#7fd8ff'; c.lineWidth = (5 - i * 1.4) * (1 - q) + 1; c.beginPath(); c.ellipse(pos.x, pos.y, r, r * .55, 0, 0, TAU); c.stroke(); } c.globalCompositeOperation = 'lighter'; blob(c, pos.x, pos.y - 8, 18 * (1 - p), 'cyan', .8 * (1 - p)); c.restore(); return true; }
  if (f.type === 'summon') { c.save(); const R = 34; c.globalAlpha = Math.min(1, live * 1.6); c.strokeStyle = '#c8ff9a'; c.lineWidth = 2; for (let k = 0; k < 2; k++) { c.beginPath(); c.ellipse(pos.x, pos.y + 6, R * (1 - k * .3), R * .4 * (1 - k * .3), 0, 0, TAU); c.stroke(); } for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + p * 4; c.fillStyle = '#e6ffc2'; c.beginPath(); c.arc(pos.x + Math.cos(a) * R, pos.y + 6 + Math.sin(a) * R * .4, 2, 0, TAU); c.fill(); } c.globalCompositeOperation = 'lighter'; blob(c, pos.x, pos.y - 10 - p * 20, 26 * live + 6, 'green', live); for (let i = 0; i < 10; i++) { const a = i * 2.39 + f.x, rr = 10 + (i % 3) * 8; blob(c, pos.x + Math.cos(a) * rr, pos.y - p * (40 + i * 4), 4 * live + 1, 'green', live); } c.restore(); return true; }
  if (f.type === 'summon-gate') { c.save(); c.globalCompositeOperation = 'lighter'; const r = (f.radius || 14) * (.4 + p * 1.2); c.globalAlpha = live; c.strokeStyle = '#d8ffb0'; c.lineWidth = 2.5 * live + .5; c.beginPath(); c.ellipse(pos.x, pos.y + 6, r, r * .4, 0, 0, TAU); c.stroke(); blob(c, pos.x, pos.y - 4, 16 * live + 4, 'green', live); c.fillStyle = `rgba(220,255,200,${live})`; c.fillRect(pos.x - 1.2, pos.y - 30 * live, 2.4, 30 * live); c.restore(); return true; }
  if (f.type === 'smoke') { c.save(); c.globalAlpha = live * .35; c.fillStyle = '#5a4a3e'; c.beginPath(); c.arc(pos.x + (f.vx || 0) * p, pos.y - p * 22, 4 + p * 12, 0, TAU); c.fill(); c.restore(); return true; }
  return false;
}
export const formatDamage = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(0) + 'K' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n >= 10 ? Math.round(n) + '' : n.toFixed(1);
