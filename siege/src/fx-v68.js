// v68/v71: visuals for the v67 towers. GPT sprite sheets only (fx-flash, fx-shots, ult-hits) — no hand-drawn
// vector shapes on the battlefield. Dedicated GPT sheets will replace these re-tinted stand-ins.
import { drawClaySprite, clayReady } from './clay-runtime.js?v=51ed4cc6d1';
const TAU = Math.PI * 2;
const PINK = 'hue-rotate(285deg) saturate(1.6) brightness(1.1)', GOLD = 'sepia(1) saturate(5) hue-rotate(-12deg) brightness(1.25)', WHITE = 'grayscale(1) brightness(2.2)';
function spr(c, key, x, y, size, frame, filter) { if (!clayReady(key)) return false; c.save(); if (filter) c.filter = filter; drawClaySprite(c, key, x, y, size, frame); c.restore(); return true; }
const hitFrame = (row, p) => row * 4 + Math.min(3, Math.floor(p * 4));
export function drawEffectV68(r, c, f, p, pos) {
  if (f.type === 'zap') { c.globalAlpha = 1; if (!spr(c, 'fx-zap', pos.x, pos.y + 6, 64, Math.min(5, Math.floor(p * 6)))) spr(c, 'ult-hits', pos.x, pos.y + 8, 52, hitFrame(0, p), 'hue-rotate(-25deg) saturate(1.3)'); return true; }
  if (f.type === 'sonic' && clayReady('fx-sonic')) { const k = r.camera?.a || 1, rad = (f.radius || 120); c.globalAlpha = .8 * (1 - p * .5); c.save(); c.translate(pos.x, pos.y - 34); c.scale(1, .55); drawClaySprite(c, 'fx-sonic', 0, 0, rad * 2.2 * (0.55 + p * .6), Math.min(5, Math.floor(p * 6))); c.restore(); return true; }
  if (f.type === 'buffettboom') { c.globalAlpha = 1; c.save(); c.translate(pos.x, pos.y); c.scale(1, .7); drawClaySprite(c, 'fx-buffett', 0, 0, (f.radius || 120) * 3, Math.min(5, Math.floor(p * 6))); c.restore(); return true; }
  if (f.type === 'drumboom') { c.globalAlpha = 1; spr(c, 'fx-drumboom', pos.x, pos.y + 6, 80, Math.min(5, Math.floor(p * 6))); return true; }
  if (f.type === 'lily-hit') { c.globalAlpha = 1; if (!spr(c, 'fx-lilyhit', pos.x, pos.y - 10, 58, Math.min(5, Math.floor(p * 6)))) spr(c, 'fx-flash', pos.x, pos.y + 6, 44, 8, PINK); return true; }
  if (f.type === 'snipe') { c.globalAlpha = 1; spr(c, 'fx-flash', pos.x, pos.y + 6, 46, 5); return true; }
  if (f.type === 'claw') { c.globalAlpha = 1; const fr = Math.min(5, Math.floor(p * 9)), lift = p > .6 ? (p - .6) / .4 : 0; if (!spr(c, 'fx-claw', pos.x, pos.y + 8 - lift * 70, 54, fr)) spr(c, 'ult-hits', pos.x, pos.y + 6, 34, hitFrame(2, p)); return true; }
  return false;
}
// projectile stand-ins: returns true when drawn
export function drawShotV68(r, c, p, pt, ang, position, u) {
  const t = r.game.time;
  if (p.type === 'syringe' && clayReady('fx-pen')) { c.save(); c.translate(pt.x, pt.y); c.rotate(ang); spr(c, 'fx-pen', 0, 0, 40, Math.floor(t * 14) % 4); c.restore(); return true; }
  if (p.type === 'coin' && clayReady('fx-coin')) { spr(c, 'fx-coin', pt.x, pt.y, 13, Math.floor(t * 18 + p.x) % 6); return true; }
  if (p.type === 'dove' && clayReady('fx-dove')) { c.save(); c.translate(pt.x, pt.y); if (Math.cos(ang) < 0) c.scale(-1, 1); spr(c, 'fx-dove', 0, 0, 26, Math.floor(t * 16 + p.x) % 6); c.restore(); return true; }
  const look = p.type === 'syringe' ? [7, 30, PINK] : p.type === 'coin' ? [5, 18, GOLD] : p.type === 'dove' ? [9, 30, WHITE] : null;
  if (!look || !clayReady('fx-shots')) return false;
  c.save(); c.translate(pt.x, pt.y); c.rotate(ang + Math.PI / 2); spr(c, 'fx-shots', 0, 0, look[1], look[0], look[2]); c.restore(); return true;
}
export function drawUltV68(r, c, u, k, t, W, H) {
  const fade = Math.min(1, u.t * 5, (u.dur - u.t) * 4);
  if (u.kind === 'totem' && clayReady('fx-bless') && u.t < 1.6) { c.save(); c.globalAlpha = 1; const fr = Math.min(5, Math.floor(u.t / 1.6 * 6)); for (const tw of r.game.cannons) { if (tw.type === 'drone') continue; const a = r.cannonAnchor(tw); drawClaySprite(c, 'fx-bless', a.x, a.y + 4, 92, fr); } c.restore(); } /* v81: pillars first, then the original blessing glow keeps playing */
  if (u.kind === 'sonic') { const o = r.point(u.x, u.y, 0); for (let i = 0; i < 3; i++) { const kk = Math.max(0, k - i * .12); if (kk <= 0) continue; c.globalAlpha = fade * (1 - kk) * .75; c.save(); c.translate(o.x, o.y - 60 - kk * 120); c.scale(1, .5); drawClaySprite(c, 'fx-sonic', 0, 0, 160 + kk * 900, Math.min(5, Math.floor(kk * 6))); c.restore(); } return true; }
  if (u.kind === 'sniper') { c.globalAlpha = fade * .55; const g = c.createRadialGradient(W / 2, H * .38, H * .18, W / 2, H * .38, H * .7); g.addColorStop(0, '#0000'); g.addColorStop(1, '#000c'); c.fillStyle = g; c.fillRect(0, 0, W, H); return true; }
  if (u.kind === 'hbm') { c.globalAlpha = fade * (.1 + .06 * Math.sin(t * 24)); c.fillStyle = '#20ffb0'; c.globalCompositeOperation = 'lighter'; c.fillRect(0, 0, W, H * .62); return true; }
  if (u.kind === 'lily') { if (clayReady('fx-lilyult')) { c.globalAlpha = fade; const fr = Math.min(5, Math.floor(k * 6)); for (const [x, y, sz] of [[W * .5, H * .16, 420], [W * .2, H * .3, 300], [W * .8, H * .28, 300]]) drawClaySprite(c, 'fx-lilyult', x, y, sz, fr); } c.globalAlpha = fade * .18; const g = c.createLinearGradient(0, 0, 0, H * .7); g.addColorStop(0, '#ff8ab8'); g.addColorStop(1, '#ff8ab800'); c.fillStyle = g; c.fillRect(0, 0, W, H * .7); return true; }
  if (u.kind === 'fed') { if (u.t > .55 && u.t < .9) { c.globalAlpha = (1 - (u.t - .55) / .35) * .55; c.fillStyle = '#fff8e0'; c.fillRect(0, 0, W, H); } return true; }
  if (u.kind === 'mortar') { for (const s of u.shells || []) { if (s.done || u.t < s.at - .32) continue; const q = 1 - (s.at - u.t) / .32, p = r.point(s.x, s.y, 0); c.globalAlpha = 1; spr(c, 'fx-shots', p.x, p.y - 220 * (1 - q), 30, 6); } return true; }
  return false;
}

// v73: named enemies drawn from their GPT sheets (6 frames each, feet at the anchor)
export function drawSpecialV73(r, c, e, foot, t) {
  const big = e.special === 'pole' ? 190 : e.special === 'catapult' ? 118 : e.special === 'drum' ? 66 : e.special === 'burry' ? 104 : 80, d = e._depth || 1, sz = big * d;
  let key, fr;
  if (e.special === 'drum') { key = 'enemy-drum'; fr = Math.floor(t * 9 + e.id) % 6; }
  else if (e.special === 'catapult') { key = 'enemy-catapult'; fr = e.phaseT || 0; }
  else if (e.special === 'fed') { key = 'enemy-fed'; fr = e.throwing > 0 ? (e.throwing > .22 ? 4 : 5) : Math.floor(t * 7 + e.id) % 4; }
  else if (e.special === 'pole') { key = 'enemy-pole'; fr = e.swing > 0 ? (e.swing > .2 ? 4 : 5) : (e.striding || e.walkT) ? Math.floor(t * 6 + e.id) % 4 : 0; }
  else if (e.special === 'burry') { key = 'enemy-burry'; fr = e.drumming > 0 ? 4 + (Math.floor(t * 8) % 2) : Math.floor(t * 7 + e.id) % 4; }
  else return false;
  if (!clayReady(key)) return false;
  c.save(); c.fillStyle = '#1d2a1e40'; c.beginPath(); c.ellipse(foot.x, foot.y, sz * .32, sz * .09, 0, 0, TAU); c.fill();
  if (e.hit > 0) c.filter = 'brightness(1.6)'; else if (e.special === 'fed' && e.charging > 0 && !e.hiked) c.filter = `drop-shadow(0 0 ${6 + Math.sin(t * 20) * 4}px #ff2a1a)`;
  if (e.special === 'pole' && e.face < 0) { c.translate(foot.x, 0); c.scale(-1, 1); c.translate(-foot.x, 0); } drawClaySprite(c, key, foot.x, foot.y, sz, fr); c.filter = 'none'; if (e.special === 'pole' && e.face < 0) { c.translate(foot.x, 0); c.scale(-1, 1); c.translate(-foot.x, 0); }
  const k = Math.max(0, e.hp / e.maxHP), w = Math.max(26, sz * .55), y = foot.y - sz * .95; c.fillStyle = '#2b1a0bdd'; c.beginPath(); c.roundRect(foot.x - w / 2 - 1, y - 1, w + 2, 6, 3); c.fill(); c.fillStyle = k > .5 ? '#ff8a72' : '#ff4a3a'; c.beginPath(); c.roundRect(foot.x - w / 2, y, w * k, 4, 2); c.fill();
  c.restore(); return true;
}
export function drawEnemyShotsV73(r, c, g) {
  for (const s of g.enemyShots || []) { const u = Math.min(1, s.t / s.dur), arc = s.kind === 'stone' ? 140 : 30, p = r.point(s.x + (s.tx - s.x) * u, s.y + (s.ty - s.y) * u, Math.sin(u * Math.PI) * arc);
    if (s.kind === 'stone') spr(c, 'fx-shots', p.x, p.y, 24, 6); else { c.save(); c.translate(p.x, p.y); spr(c, 'fx-hawk', 0, 0, s.kind === 'bighawk' ? 30 + 70 * u : 34, Math.floor(g.time * 14) % 6); c.restore(); } }
}
