// v73: named enemies — drum candle (one big opening blast), catapult crew (long-range stones),
// Fed chair mob (throws hawks; past the outpost charges "금리 인상" = all towers slower until he dies),
// Burry (stays back, keeps summoning followers; "하락의 드럼" speeds up every candle).
export function installEnemiesV73(Game, { SPECIALS, WALL, FORWARD_DY, WORLD_WIDTH }) {
  const P = Game.prototype;
  const outpostY = g => g.wallAt(WORLD_WIDTH / 2) + WALL.deck + WALL.mountOffset - FORWARD_DY;
  const slowF = (g, e) => e.slowUntil > g.time && e.slow > 0 ? 1 - e.slow : 1;
  const shoot = (g, e, kind, dmg, dur, centre = false) => { const tx = centre ? WORLD_WIDTH / 2 + (g.random() - .5) * 16 : e.x + (g.random() - .5) * 30; g.enemyShots.push({ kind, x: e.x, y: e.y - 10, tx, ty: g.wallBackAt(tx), t: 0, dur, dmg }); };

  P.tickSpecialV73 = function (e, dt, stop) {
    if (!this.enemyShots) this.enemyShots = [];
    // 하락의 드럼: every ordinary candle moves a bit faster while the drum plays
    if (this.drumUntil > this.time && !e.special && !(e.slowUntil > this.time && e.slow > 0)) { e.slow = -.2; e.slowUntil = this.time + .1; }
    const sp = e.special; if (!sp || !['drum', 'catapult', 'fed', 'burry', 'pole'].includes(sp)) return false;
    const def = SPECIALS[sp], speed = def.speed * slowF(this, e);
    e.anim = (e.anim || 0) + dt;
    if (sp === 'drum') {
      if (e.y >= stop - .5) { // opening blast, then he is an ordinary small candle
        this.addWallXP(-def.damage * this.mode.damage, e.x); this.effect('drumboom', e.x, this.wallBackAt(e.x), '#ff8a3a', '', 1.1); this.shake = Math.max(this.shake || 0, .5);
        e.special = null; e.kind = 0; e.radius = 10; e.attack = 1; return false;
      }
      return false; // walks like a normal candle
    }
    if (sp === 'pole') { // 장대 음봉: strides over the wall, then walks up to supply candles and smashes them
      const hold = this.wallAt(e.x) + WALL.deck + WALL.mountOffset + 70; e.attacking = false; e.vx = 0;
      if (e.y < hold) { e.y = Math.min(hold, e.y + speed * dt); e.striding = true; return true; }
      e.striding = false;
      if (e.swing > 0) { e.swing -= dt; if (e.swing <= .18 && e.swingTarget != null) { const prey = this.supplies.find(s => s.alive && s.id === e.swingTarget); e.swingTarget = null;
          const hx = e.x + e.face * 26, hy = e.y + 30; this.effect('explosion', hx, hy, '#ff7a4a', '', .55, { radius: 26 }); this.effect('ult-hit', hx, hy, '#ff6a4a', '', .45, { ult: 'drone', small: true }); this.shake = Math.max(this.shake || 0, .35);
          if (prey && Math.abs(prey.x - hx) < 50 && Math.abs(prey.y - hy) < 90) { this.effect('text', prey.x, prey.y - 14, '#ff8a6a', '쾅!', .7, { sourceAltitude: 16 }); this.remove(prey, 'crush'); } }
        return true; }
      const prey = this.supplies.filter(s => s.alive && s.y > e.y - 30 && s.y < e.y + 200).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
      if (!prey) return true;
      const dx = prey.x - (e.x + Math.sign(prey.x - e.x || 1) * 26), dy = prey.y - (e.y + 30);
      if (Math.abs(dx) > 6) { e.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * 4 * dt); e.walkT = (e.walkT || 0) + dt; }
      else if (dy < 80 && dy > -50) { e.face = Math.sign(prey.x - e.x) || 1; e.swing = .5; e.swingTarget = prey.id; }
      return true;
    }
    if (sp === 'catapult') {
      const hold = Math.max(60, stop - 250);
      if (e.y < hold) { e.y = Math.min(hold, e.y + speed * dt); e.attacking = false; e.moving = true; return true; }
      e.moving = false; e.attacking = false; e.fire = (e.fire ?? 1.5) - dt * slowF(this, e);
      e.phaseT = e.fire < .9 ? Math.min(5, Math.floor((.9 - e.fire) / .15)) : 0;
      if (e.fire <= 0) { e.fire = 4.2; shoot(this, e, 'stone', def.damage, 1.4); }
      return true;
    }
    if (sp === 'fed') {
      e.hawkT = (e.hawkT ?? 2) - dt; e.throwing = Math.max(0, (e.throwing || 0) - dt);
      if (e.hawkT <= 0 && e.y < stop - 30) { e.hawkT = 3.2; e.throwing = .45; shoot(this, e, 'hawk', 70, .9, true); }
      if (!e.hiked && e.y > outpostY(this)) { // charge 금리 인상
        e.charging = (e.charging || 0) + dt; if (e.charging < 2.2) return true;
        e.hiked = true; e.throwing = .6; shoot(this, e, 'bighawk', 320, 1.3, true); this.rateHikeBy = e.id; this.onNamed?.('fed', '금리 인상! 모든 타워 공격 속도 감소'); this.shake = .6;
      }
      return false;
    }
    if (sp === 'burry') {
      const hold = Math.max(70, stop - 270);
      e.summonT = (e.summonT ?? 2) - dt;
      if (e.summonT <= 0) { e.summonT = 5.5; e.drumming = .9; for (let i = 0; i < 3; i++) { const f = this.spawnEnemy(0, e.x + (i - 1) * 18, e.y + 14, { marketWeight: 1 }); if (f) f.follower = true; } }
      e.drumming = Math.max(0, (e.drumming || 0) - dt);
      if (e.y < hold) { e.y = Math.min(hold, e.y + speed * dt); e.attacking = false; return true; }
      e.atHold = (e.atHold || 0) + dt;
      if (e.atHold > 10 && !(this.drumUntil > this.time)) { e.atHold = 0; e.drumming = 2; this.drumUntil = this.time + 12; this.onNamed?.('burry', '하락의 드럼! 음봉들이 빨라져요'); }
      e.attacking = false; return true;
    }
    return false;
  };

  P.updateEnemyShotsV73 = function (dt) {
    if (!this.enemyShots) this.enemyShots = [];
    if (this.rateHikeBy != null && !this.enemies.some(e => e.alive && e.id === this.rateHikeBy)) { this.rateHikeBy = null; this.notify('연준의장 처치 · 금리 인상 해제'); }
    for (const s of this.enemyShots) { s.t += dt; if (!s.done && s.t >= s.dur) { s.done = true; this.addWallXP(-s.dmg * this.mode.damage, s.tx); this.effect(s.kind === 'impact' ? 'impact' : s.kind === 'hawk' ? 'impact' : 'explosion', s.tx, s.ty, '#ffb582', '', s.kind === 'bighawk' ? 1 : .6, { radius: s.kind === 'stone' ? 40 : s.kind === 'bighawk' ? 70 : 20 }); if (s.kind !== 'hawk') this.shake = Math.max(this.shake || 0, s.kind === 'bighawk' ? .9 : .35); } }
    this.enemyShots = this.enemyShots.filter(s => !s.done);
  };

  const baseRate = P.extraRateBuff;
  P.extraRateBuff = function (c) { return baseRate.call(this, c) - (this.rateHikeBy != null ? .18 : 0); };

  const baseSpecials = P.maybeSpecials;
  P.maybeSpecials = function (intensity, sellShare, epoch) {
    baseSpecials.call(this, intensity, sellShare, epoch); if (sellShare < .4) return;
    this.lastSpecial = this.lastSpecial || {};
    const tryOne = (type, label, n = 1) => { const d = SPECIALS[type]; if (intensity < d.minIntensity || (this.lastSpecial[type] != null && epoch - this.lastSpecial[type] < d.cooldownMs) || this.random() >= d.chance) return; if (type !== 'drum' && this.enemies.some(e => e.alive && e.special === type)) return; this.lastSpecial[type] = epoch; let ok = false; for (let i = 0; i < n; i++) ok = !!this.spawnSpecial(type, 60 + this.random() * (WORLD_WIDTH - 120), -50 - i * 40) || ok; if (ok && label) this.onNamed?.(type, label); };
    tryOne('drum', '드럼통 음봉 접근!', 2 + Math.floor(this.random() * 2));
    tryOne('pole', '장대 음봉이 성벽을 넘어온다!');
    tryOne('catapult', '공성전차 음봉 출현!');
    tryOne('fed', '연준의장 등장!');
    tryOne('burry', '마이클 벼리 등장!');
  };
}
