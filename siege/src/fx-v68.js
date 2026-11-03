// v68/v70: visuals for the v67 towers. GPT sprite sheets only (fx-flash, fx-shots, ult-hits) — no hand-drawn
// vector shapes on the battlefield. Dedicated GPT sheets will replace these re-tinted stand-ins.
import { drawClaySprite, clayReady } from './clay-runtime.js?v=78a5ee6f04';
const TAU = Math.PI * 2;
const PINK = 'hue-rotate(285deg) saturate(1.6) brightness(1.1)', GOLD = 'sepia(1) saturate(5) hue-rotate(-12deg) brightness(1.25)', WHITE = 'grayscale(1) brightness(2.2)';
function spr(c, key, x, y, size, frame, filter) { if (!clayReady(key)) return false; c.save(); if (filter) c.filter = filter; drawClaySprite(c, key, x, y, size, frame); c.restore(); return true; }
const hitFrame = (row, p) => row * 4 + Math.min(3, Math.floor(p * 4));
export function drawEffectV68(r, c, f, p, pos) {
  if (f.type === 'zap') { c.globalAlpha = 1; spr(c, 'ult-hits', pos.x, pos.y + 8, 52, hitFrame(0, p), 'hue-rotate(-25deg) saturate(1.3)'); return true; }
  if (f.type === 'lily-hit') { c.globalAlpha = 1; spr(c, 'fx-flash', pos.x, pos.y + 6, 44 + p * 12, 8, PINK); return true; }
  if (f.type === 'snipe') { c.globalAlpha = 1; spr(c, 'fx-flash', pos.x, pos.y + 6, 46, 5); return true; }
  if (f.type === 'claw') { c.globalAlpha = 1; spr(c, 'ult-hits', pos.x, pos.y + 6, 34, hitFrame(2, p)); return true; }
  return false;
}
// projectile stand-ins: returns true when drawn
export function drawShotV68(r, c, p, pt, ang, position, u) {
  const look = p.type === 'syringe' ? [7, 30, PINK] : p.type === 'coin' ? [5, 18, GOLD] : p.type === 'dove' ? [9, 30, WHITE] : null;
  if (!look || !clayReady('fx-shots')) return false;
  if (p.type === 'syringe') for (let i = 1; i <= 3; i++) { const tp = position(Math.max(0, u - i * .05)); c.save(); c.globalAlpha = .35 * (1 - i / 4); c.translate(tp.x, tp.y); c.rotate(ang + Math.PI / 2); spr(c, 'fx-shots', 0, 0, look[1] * .8, look[0], look[2]); c.restore(); }
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
