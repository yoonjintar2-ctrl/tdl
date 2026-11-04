// v67: new towers (ant, bull, buffett, leverage, claw, hbm, lily, fed) and ultimates for rare+ towers.
// Installed onto Game.prototype by installTowersV67(Game). Every effect stays data-driven via cannonStats.
import { cannonStats, hasPerk, WORLD_WIDTH, clamp } from './config.js?v=7f79b486f9';

export const ELECTRIC = ['laser', 'drone', 'hbm'];
export const PASSIVE = ['totem', 'buffett', 'leverage'];

export function installTowersV67(Game) {
  const P = Game.prototype;

  // ---------- passive auras ----------
  P.leverage = function () { const c = this.cannons.find(t => t.type === 'leverage'); if (!c) return null; const k = (Math.max(1, c.level) - 1) / 39; return { dmg: 2 + .25 * k, wall: 1.8 - .45 * k }; };
  P.towerDamageMul = function (type) { let m = 1; const lv = this.leverage(); if (lv && type && type !== 'leverage') m *= lv.dmg; if (this.blessUntil > this.time) m *= 1.5; return m; };
  P.wallDamageMul = function () { const lv = this.leverage(); return lv ? lv.wall : 1; };
  P.extraRateBuff = function (c) { let b = 0; const h = this.cannons.find(t => t.type === 'hbm'); if (h && hasPerk('hbm', h.level, 'grid') && ELECTRIC.includes(c.type)) b += .12; if (this.rateCutUntil > this.time) b += .25; if (this.rateHikeUntil > this.time && this.rateHikeOn) b -= .18; return b; };
  P.supplyBoost = function () { const b = this.cannons.find(t => t.type === 'bull'); return b ? 1.3 + .015 * (b.level - 1) : 1; };

  // ---------- per-frame tower behaviour; return true when handled ----------
  P.tickTowerV67 = function (c, dt) {
    const st = cannonStats(c.type, c.level), pos = this.cannonPosition(c);
    if (c.type === 'leverage') return true;
    if (c.type === 'buffett') { // slow, uneven charge; fires only when candles crowd the field
      c.qiNoise = (c.qiNoise ?? 1) + (this.random() - .5) * dt * 1.4; c.qiNoise = clamp(c.qiNoise, .55, 1.45);
      c.qi = Math.min(1, (c.qi || 0) + dt / st.charge * c.qiNoise);
      const alive = this.enemies.filter(e => e.alive && (e.y < this.wallAt(e.x) || e.special === 'pole'));
      if (c.qi >= 1 && alive.length >= st.crowd) { c.qi = 0; this.buffettBlast(c, st, alive); }
      return true;
    }
    if (c.type === 'bull') { // green bull spawns from Lv15
      if (c.level >= 15) { c.bullT = (c.bullT || 0) + dt; if (c.bullT >= st.bullEvery) { c.bullT = 0; const s = this.spawnSupply(1, clamp(c.x + (this.random() - .5) * 80, 30, WORLD_WIDTH - 30)); if (s) { s.bullBonus = true; s.variant = 3; } } }
      return false; // melee handled by generic targeting
    }
    if (c.type === 'claw') {
      c.cooldown -= dt; if (c.cooldown > 0) return true;
      const wallY = this.wallAt(c.x), picks = this.supplies.filter(s => s.alive && !s.bullBonus).sort((a, b) => a.y - b.y).slice(0, st.capacity);
      c.cooldown = 1 / (st.rate * (1 + this.attackBuff(c) + this.extraRateBuff(c)));
      if (!picks.length) return true;
      c.grab = { t: this.time, n: picks.length };
      picks.forEach((s, i) => { this.effect('claw', s.x, s.y, '#ff9ad0', '', .6, { tx: c.x, ty: wallY - 40 }); this.remove(s, 'claw'); this.knights.push({ x: clamp(c.x + (i - (picks.length - 1) / 2) * 15, 12, WORLD_WIDTH - 12), y: wallY - 36 - this.random() * 8, hits: st.hits, damage: st.damage, cool: .3 + i * .1, phase: this.random() * 6, age: 0, level: c.level, sword: true, grow: 0 }); });
      return true;
    }
    if (c.type === 'hbm') {
      c.cooldown -= dt; if (c.cooldown > 0) return true;
      const pool = this.enemies.filter(e => e.alive && (e.y < this.wallAt(e.x) || e.special === 'pole')); const pr = this.priority ? pool.filter(e => this.matchesPriority(e)) : [];
      const list = pr.length ? pr : pool; c.cooldown = 1 / (st.rate * (1 + this.attackBuff(c) + this.extraRateBuff(c)));
      if (!list.length) { c.cooldown = .2; return true; }
      const e = list[Math.floor(this.random() * list.length)]; this.zap(e, st.damage, 'hbm'); c.recoil = 1; return true;
    }
    return false;
  };

  P.zap = function (e, dmg, type) { this.effect('zap', e.x, e.y, '#7fffe0', '', .45, { seed: this.random() * 1000 }); this.damage(e, dmg, { cannonType: type }); };

  P.buffettBlast = function (c, st, alive) {
    let best = alive[0], bn = 0; for (const a of alive) { const n = alive.reduce((k, b) => k + (Math.hypot(a.x - b.x, a.y - b.y) < st.radius ? 1 : 0), 0); if (n > bn) { bn = n; best = a; } }
    this.effect('buffettboom', best.x, best.y, '#ffd34f', '', 1.1, { radius: st.radius }); this.effect('text', best.x, best.y - 30, '#ffe0ea', '나는 절대로 안 팔아!!', 1.6, { sourceAltitude: 20 });
    this.shake = Math.max(this.shake || 0, .45);
    for (const e of this.enemies) if (e.alive && Math.hypot(e.x - best.x, e.y - best.y) <= st.radius + e.radius) this.damage(e, st.damage, { cannonType: 'buffett' });
  };

  // ---------- firing for projectile towers (ant, bull melee, lily, fed) ; return true when handled ----------
  P.fireV67 = function (c, st, target) {
    const pos = this.cannonPosition(c), base = { x: pos.x, y: pos.y - 18, sourceAltitude: 20, elapsed: 0, color: st.color, stats: { ...st }, targetAltitude: 8 };
    if (c.type === 'ant') { const n = st.pellets, pool = this.enemies.filter(e => e.alive && Math.hypot(e.x - pos.x, e.y - pos.y) <= st.range).sort((a, b) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(b.x - pos.x, b.y - pos.y)); for (let i = 0; i < n; i++) { const t = pool[i % Math.max(1, pool.length)] || target; this.projectiles.push({ ...base, type: 'coin', weapon: 'ant', tx: t.x + (this.random() - .5) * 10, ty: t.y, targetId: t.id, damage: st.damage, duration: .22 + this.random() * .08, elapsed: -i * .02 }); } c.recoil = 1; return true; }
    if (c.type === 'bull') { this.effect('crush', target.x, target.y, '#7fd65a', '', .45); this.damage(target, st.damage, { cannonType: 'bull' }); c.recoil = 1; return true; }
    if (c.type === 'lily') { this.projectiles.push({ ...base, type: 'syringe', weapon: 'lily', tx: target.x, ty: target.y, targetId: target.id, damage: 0, duration: Math.max(.18, Math.hypot(target.x - pos.x, target.y - pos.y) / 700) }); c.recoil = 1; return true; }
    if (c.type === 'fed') { this.projectiles.push({ ...base, type: 'dove', weapon: 'fed', tx: target.x, ty: target.y, targetId: target.id, damage: st.damage, duration: Math.max(.22, Math.hypot(target.x - pos.x, target.y - pos.y) / 520), depth: 0, maxDepth: st.chain, hitIds: [target.id] }); c.recoil = 1; return true; }
    return false;
  };

  P.resolveV67 = function (p) {
    const target = this.enemies.find(e => e.id === p.targetId && e.alive);
    if (p.type === 'coin') { if (target) { this.damage(target, p.damage, { cannonType: 'ant' }); this.effect('bullet-hit', target.x, target.y, '#ffd34f', '', .12); } return true; }
    if (p.type === 'syringe') { if (target && !target.maxHP0) { const st = p.stats; target.maxHP0 = target.maxHP; const cut = target.maxHP * st.shrink; this.effect('lily-hit', target.x, target.y, '#ff6aa8', '', .7, { sourceAltitude: 10 }); target.maxHP = Math.max(target.maxHP * .2, target.maxHP - cut); target.hp = Math.min(target.hp, target.maxHP); target.slim = Math.min(.38, (target.slim || 0) + .1); { const l = this.cannons.find(t => t.type === 'lily'); if (l) l.ult = (l.ult || 0) + .6; } this.effect('text', target.x, target.y - 12, '#ff3d8b', '최대체력 -' + Math.round(st.shrink * 100) + '%', .7, { sourceAltitude: 14 });
        const lily = this.cannons.find(t => t.type === 'lily'); if (lily && hasPerk('lily', lily.level, 'drain')) { const gain = cut * .06; if (this.wallLevel >= 10) this.creditMarketGold(gain * .5); else this.addWallXP(gain, target.x); } } return true; }
    if (p.type === 'dove') { if (target) { this.damage(target, p.damage, { cannonType: 'fed' }); this.effect('bullet-hit', target.x, target.y, '#ffffff', '', .2); }
      if (p.depth < p.maxDepth) { const from = target || { x: p.tx, y: p.ty }; const next = this.enemies.filter(e => e.alive && !p.hitIds.includes(e.id) && Math.hypot(e.x - from.x, e.y - from.y) < 130).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y)).slice(0, 2);
        for (const n of next) { p.hitIds.push(n.id); this.projectiles.push({ ...p, x: from.x, y: from.y, sourceAltitude: 10, tx: n.x, ty: n.y, targetId: n.id, elapsed: 0, duration: Math.max(.16, Math.hypot(n.x - from.x, n.y - from.y) / 520), depth: p.depth + 1, damage: p.damage * .85 }); } }
      return true; }
    return false;
  };

  // ---------- ultimates for rare+ towers added in v67 ----------
  P.fireUltV67 = function (c, st, pos, top) {
    if (c.type === 'sonic') { this.ults.push({ kind: 'sonic', t: 0, dur: 1.6, x: pos.x, y: pos.y, dmg: st.damage * 40, hit: new Set() }); return true; }
    if (c.type === 'mortar') { const shells = []; const alive = this.enemies.filter(e => e.alive && (e.y < this.wallAt(e.x) || e.special === 'pole')); for (let i = 0; i < 18; i++) { const e = alive.length ? alive[Math.floor(this.random() * alive.length)] : null; shells.push({ at: .2 + i * .1, x: e ? e.x : 40 + this.random() * 352, y: e ? e.y : 80 + this.random() * (top - 160), done: false }); } this.ults.push({ kind: 'mortar', t: 0, dur: 2.4, shells, dmg: st.damage * 9, r: st.radius * 1.2 }); return true; }
    if (c.type === 'sniper') { const tg = this.enemies.filter(e => e.alive).sort((a, b) => b.hp - a.hp).slice(0, 5); this.ults.push({ kind: 'sniper', t: 0, dur: 1.5, targets: tg.map((e, i) => ({ id: e.id, at: .25 + i * .22, done: false })), dmg: st.damage * 7 }); return true; }
    if (c.type === 'hbm') { const alive = this.enemies.filter(e => e.alive && (e.y < this.wallAt(e.x) || e.special === 'pole')); const n = Math.min(24, alive.length); const strikes = []; for (let i = 0; i < n; i++) strikes.push({ id: alive[Math.floor(this.random() * alive.length)].id, at: .15 + i * .06, done: false }); this.ults.push({ kind: 'hbm', t: 0, dur: 2.2, strikes, dmg: st.damage * 5 }); return true; }
    if (c.type === 'lily') { this.ults.push({ kind: 'lily', t: 0, dur: 1.6, done: false }); return true; }
    if (c.type === 'fed') { this.ults.push({ kind: 'fed', t: 0, dur: 2.2, done: false, dmg: 60 + st.damage * 12 }); this.rateCutUntil = this.time + 300; return true; }
    return false;
  };

  P.updateUltV67 = function (u, dt) {
    if (u.kind === 'sonic') { const r = u.t / u.dur * 620; for (const e of this.enemies) { if (!e.alive || u.hit.has(e.id)) continue; if (Math.hypot(e.x - u.x, e.y - u.y) <= r) { u.hit.add(e.id); this.damage(e, u.dmg, { cannonType: 'sonic' }); e.slowUntil = this.time + 1.6; e.slow = .8; this.effect('ult-hit', e.x, e.y, '#9fe8ff', '', .4, { ult: 'laser', small: true }); } } return true; }
    if (u.kind === 'mortar') { for (const s of u.shells) { if (s.done || u.t < s.at) continue; s.done = true; this.effect('explosion', s.x, s.y, '#ffc478', '', .7, { radius: u.r, weapon: 'mortar' }); this.effect('ult-hit', s.x, s.y, '#ffb04a', '', .55, { ult: 'drone' }); this.shake = Math.max(this.shake || 0, .25); for (const e of this.enemies) if (e.alive && Math.hypot(e.x - s.x, e.y - s.y) < u.r + e.radius) this.damage(e, u.dmg, { cannonType: 'mortar' }); } return true; }
    if (u.kind === 'sniper') { for (const s of u.targets) { if (s.done || u.t < s.at) continue; s.done = true; const e = this.enemies.find(x => x.id === s.id && x.alive); if (!e) continue; this.effect('snipe', e.x, e.y, '#ffd34f', '', .5); this.effect('text', e.x, e.y - 18, '#ffd34f', '헤드헌트!', .8, { sourceAltitude: 20 }); this.damage(e, u.dmg, { cannonType: 'sniper' }); } return true; }
    if (u.kind === 'hbm') { for (const s of u.strikes) { if (s.done || u.t < s.at) continue; s.done = true; const e = this.enemies.find(x => x.id === s.id && x.alive); if (e) this.zap(e, u.dmg, 'hbm'); } return true; }
    if (u.kind === 'lily') { if (!u.done && u.t > .4) { u.done = true; for (const e of this.enemies) if (e.alive) { if (!e.maxHP0) e.maxHP0 = e.maxHP; this.effect('lily-hit', e.x, e.y, '#ff6aa8', '', .7, { sourceAltitude: 10 }); e.maxHP *= .7; e.hp = Math.min(e.hp, e.maxHP); e.slim = Math.min(.35, (e.slim || 0) + .15); } } return true; }
    if (u.kind === 'fed') { if (!u.done && u.t > .6) { u.done = true; this.shake = .8; for (const e of this.enemies) if (e.alive) this.damage(e, u.dmg * (e.boss ? .5 : 1), { cannonType: 'fed' }); this.notify('금리 인하! 5분 동안 모든 타워 공격 속도 +25%'); } return true; }
    return false;
  };
}
