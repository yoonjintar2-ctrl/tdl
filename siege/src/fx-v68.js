// v68/v71: visuals for the v67 towers. GPT sprite sheets only (fx-flash, fx-shots, ult-hits) — no hand-drawn
// vector shapes on the battlefield. Dedicated GPT sheets will replace these re-tinted stand-ins.
import { drawClaySprite, clayReady } from './clay-runtime.js?v=bfbdfaa54c';
const TAU = Math.PI * 2;
const PINK = 'hue-rotate(285deg) saturate(1.6) brightness(1.1)', GOLD = 'sepia(1) saturate(5) hue-rotate(-12deg) brightness(1.25)', WHITE = 'grayscale(1) brightness(2.2)';
function spr(c, key, x, y, size, frame, filter) { if (!clayReady(key)) return false; c.save(); if (filter) c.filter = filter; drawClaySprite(c, key, x, y, size, frame); c.restore(); return true; }
const hitFrame = (row, p) => row * 4 + Math.min(3, Math.floor(p * 4));
export function drawEffectV68(r, c, f, p, pos) {
  if (f.type === 'zap') { c.globalAlpha = 1; spr(c, 'ult-hits', pos.x, pos.y + 8, 52, hitFrame(0, p), 'hue-rotate(-25deg) saturate(1.3)'); return true; }
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
  if (u.kind === 'sonic') return true; // shock hits on each candle come from the ult-hit sprites
  if (u.kind === 'sniper') { c.globalAlpha = fade * .55; const g = c.createRadialGradient(W / 2, H * .38, H * .18, W / 2, H * .38, H * .7); g.addColorStop(0, '#0000'); g.addColorStop(1, '#000c'); c.fillStyle = g; c.fillRect(0, 0, W, H); return true; }
  if (u.kind === 'hbm') { c.globalAlpha = fade * (.1 + .06 * Math.sin(t * 24)); c.fillStyle = '#20ffb0'; c.globalCompositeOperation = 'lighter'; c.fillRect(0, 0, W, H * .62); return true; }
  if (u.kind === 'lily') { c.globalAlpha = fade * .3; const g = c.createLinearGradient(0, 0, 0, H * .7); g.addColorStop(0, '#ff8ab8'); g.addColorStop(1, '#ff8ab800'); c.fillStyle = g; c.fillRect(0, 0, W, H * .7); return true; }
  if (u.kind === 'fed') { if (u.t > .55 && u.t < .9) { c.globalAlpha = (1 - (u.t - .55) / .35) * .55; c.fillStyle = '#fff8e0'; c.fillRect(0, 0, W, H); } return true; }
  if (u.kind === 'mortar') { for (const s of u.shells || []) { if (s.done || u.t < s.at - .32) continue; const q = 1 - (s.at - u.t) / .32, p = r.point(s.x, s.y, 0); c.globalAlpha = 1; spr(c, 'fx-shots', p.x, p.y - 220 * (1 - q), 30, 6); } return true; }
  return false;
}
