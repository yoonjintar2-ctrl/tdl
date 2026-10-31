import { CANNONS, cannonStats, PERKS, towerTier } from './config.js?v=ef8fdc499c';
import { RARITIES, TOWER_RARITY, xpForNext, MAX_CARD_LEVEL, cardOdds, PACKS } from './cards.js?v=ef8fdc499c';
import { renderShopIcon } from './renderer.js?v=ef8fdc499c';
import { FX } from './fx.js?v=ef8fdc499c';

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const FLAME = { common: ['#ffe2b0', .4], rare: ['#5aa8ff', .8], epic: ['#ffcc33', 1.05], legend: ['#ff8a1a', 1.5] };

// A tower card. item = {level, xp} or null (not owned yet). Level is not shown; the art changes by tier.
export function towerCard(type, item, { mini = false, faceDown = false } = {}) {
  const rarity = TOWER_RARITY[type], r = RARITIES[rarity];
  const card = el('div', `tcard r-${rarity}${mini ? ' mini' : ''}${faceDown ? ' hidden' : ''}${item ? '' : ' unowned'}`); card.dataset.type = type;
  const inner = el('div', 'tcard-inner'), front = el('div', 'tcard-face front'), back = el('div', 'tcard-face back');
  const top = el('div', 'tc-top'); top.append(el('span', 'tc-rarity', r.name), el('span', 'tc-lv', item ? `Lv.${item.level}` : '?'));
  const art = el('canvas', 'tc-art'); art.width = 200; art.height = 180; art.setAttribute('aria-hidden', 'true');
  front.append(top, art, el('div', 'tc-name', CANNONS[type].short));
  if (!mini) {
    const bar = el('div', 'tc-bar'), fill = el('i'), need = item ? xpForNext(item.level) : 1;
    fill.style.width = item ? (item.level >= MAX_CARD_LEVEL ? 100 : Math.min(100, (item.xp || 0) / need * 100)) + '%' : '0%';
    bar.append(fill, el('b', 'tc-exp', item ? (item.level >= MAX_CARD_LEVEL ? 'MAX' : 'EXP') : ''), el('small', '', item ? (item.level >= MAX_CARD_LEVEL ? 'MAX' : `EXP ${item.xp || 0} / ${need}`) : '뽑기로 획득'));
    bar.title = '눌러서 경험치 보기'; bar.addEventListener('click', e => { if (!item) return; e.stopPropagation(); card.classList.toggle('show-xp'); clearTimeout(card._xpT); card._xpT = setTimeout(() => card.classList.remove('show-xp'), 2500); });
    front.append(bar);
  }
  if (!mini) { const q = el('button', 'tc-help', '?'); q.type = 'button'; q.setAttribute('aria-label', CANNONS[type].name + ' 도감'); q.addEventListener('click', e => { e.stopPropagation(); openCodex(type, item); }); front.append(q); }
  front.append(el('i', 'tc-sheen'), el('i', 'tc-pearl'));
  const emblem = el('div', 'tc-emblem'); emblem.innerHTML = '<i></i><i></i><i></i>'; back.append(emblem, el('i', 'tc-backshine'));
  inner.append(front, back); card.append(inner);
  requestAnimationFrame(() => renderShopIcon(art, type, item?.level || 1));
  return card;
}

export class CardStage {
  constructor() { this.root = null; }
  async open({ results, count, onClose, onAgain, canAgain }) {
    this.close(true);
    const root = el('div', 'gacha-stage' + (count >= 100 ? ' hundred' : '')); root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', `카드 ${count}장 뽑기`);
    const canvas = el('canvas', 'gacha-fx'), grid = el('div', 'gacha-cards'), ui = el('div', 'gacha-ui'), banner = el('div', 'gacha-banner'), summary = el('div', 'gacha-summary');
    const skip = el('button', 'gacha-btn ghost', '스킵'), flipAll = el('button', 'gacha-btn', '모두 뒤집기'), done = el('button', 'gacha-btn primary', '확인'), again = el('button', 'gacha-btn', `한 번 더 (${count}장)`);
    done.hidden = again.hidden = true; [skip, flipAll, done, again].forEach(b => b.type = 'button');
    ui.append(skip, flipAll, again, done); summary.hidden = true;
    root.append(canvas, grid, banner, summary, ui); document.body.append(root); this.root = root; document.body.classList.add('gacha-open');
    const fx = new FX(canvas); fx.start(); this.fx = fx; window.addEventListener('resize', this.onResize = () => fx.resize());
    this.results = results; this.revealed = 0; this.skipping = false;
    const order = results.map((res, i) => ({ res, i }));
    // Pack burst intro.
    const pack = el('div', 'gacha-pack'); pack.innerHTML = '<div class="pack-face"><span>STOCK SIEGE</span><b>' + count + '</b><small>TOWER CARDS</small></div>'; root.append(pack);
    const best = results.reduce((m, r) => Math.max(m, ['common', 'rare', 'epic', 'legend'].indexOf(r.rarity)), 0), bestColor = FLAME[['common', 'rare', 'epic', 'legend'][best]][0];
    const packAura = fx.flameAura(() => pack.getBoundingClientRect(), bestColor, .9 + best * .3);
    await wait(reduced() ? 50 : 900); pack.classList.add('charge'); await wait(reduced() ? 50 : 650);
    const pr = pack.getBoundingClientRect(), cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2;
    fx.remove(packAura); fx.flash(cx, cy, bestColor, { radius: 340 }); fx.ring(cx, cy, bestColor, { radius: 260 }); fx.burst(cx, cy, bestColor, { count: 90, speed: 420 }); pack.remove();
    // Spread face-down cards from the centre into the grid.
    this.cards = order.map(({ res }) => { const c = towerCard(res.type, null, { mini: count >= 100, faceDown: true }); c.classList.add('deal'); c.style.setProperty('--fromX', '0px'); grid.append(c); return c; });
    await new Promise(requestAnimationFrame);
    const gr = grid.getBoundingClientRect();
    this.cards.forEach((c, i) => { const r = c.getBoundingClientRect(); c.style.setProperty('--fromX', (cx - (r.left + r.width / 2)) + 'px'); c.style.setProperty('--fromY', (cy - (r.top + r.height / 2)) + 'px'); c.style.animationDelay = (count >= 100 ? i * 9 : i * 70) + 'ms'; });
    this.cards.forEach(c => c.classList.add('dealing'));
    // Card-back flames tint by the hidden rarity (Hearthstone-style hint). 100-pull uses glow only on rare+.
    this.auras = this.cards.map((c, i) => { const rar = results[i].rarity, [col, k] = FLAME[rar]; if (count >= 100 && rar === 'common') return null; return count >= 100 ? fx.dustAura(() => c.getBoundingClientRect(), col, rar === 'legend' ? 14 : rar === 'epic' ? 7 : 3) : fx.flameAura(() => { const r = c.getBoundingClientRect(); return { left: r.left + 3, right: r.right - 3, top: r.top + 3, bottom: r.bottom - 3, width: r.width - 6, height: r.height - 6 }; }, col, k); });
    this.cards.forEach((c, i) => { c.classList.add('glow-' + results[i].rarity); c.onclick = () => this.flip(i); });
    skip.onclick = () => this.skip(); flipAll.onclick = () => this.flipAll(flipAll);
    done.onclick = () => { this.close(); onClose?.(); };
    again.onclick = () => { this.close(); onAgain?.(); };
    this.finish = () => { flipAll.hidden = skip.hidden = true; done.hidden = false; again.hidden = !canAgain?.(); this.showSummary(summary); };
    if (count >= 100) { await wait(reduced() ? 50 : 1100); if (!this.skipping) this.flipAll(flipAll); }
  }
  async flip(i, fast = false) {
    const card = this.cards?.[i]; if (!card || !card.classList.contains('hidden') || card.classList.contains('charging')) return;
    const res = this.results[i], fx = this.fx, hundred = this.root.classList.contains('hundred');
    if (!fast && !reduced() && (res.rarity === 'epic' || res.rarity === 'legend')) { card.classList.add('charging'); if (this.auras[i] && !hundred) this.auras[i].intensity *= 2.2; await wait(hundred ? 380 : res.rarity === 'legend' ? 1100 : 750); }
    else if (!fast && res.rarity === 'rare' && !hundred) { card.classList.add('charging', 'short'); await wait(260); }
    if (!this.root) return;
    if (this.auras[i]) { fx.remove(this.auras[i]); this.auras[i] = null; }
    // Swap the face content to the real card.
    const real = towerCard(res.type, { level: res.level, xp: res.xp ?? 0 }, { mini: hundred });
    card.querySelector('.tcard-face.front').replaceWith(real.querySelector('.tcard-face.front'));
    card.classList.remove('hidden', 'charging', 'short', 'unowned'); card.classList.add('revealed');
    const badge = res.isNew ? 'NEW!' : res.levelUps ? '레벨 업!' : res.refund ? `+${res.refund}G` : res.gained ? `+${res.gained} XP` : '';
    if (badge) { const b = el('span', 'tc-badge' + (res.isNew ? ' new' : ''), badge); card.append(b); }
    const r = card.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, col = RARITIES[res.rarity].color;
    if (!fast) {
      if (res.rarity === 'rare') { fx.ring(x, y, col, { radius: hundred ? 40 : 90, width: 4 }); fx.burst(x, y, col, { count: hundred ? 12 : 30, speed: hundred ? 120 : 220, size: 2.4 }); }
      if (res.rarity === 'epic') { fx.flash(x, y, col, { radius: hundred ? 80 : 200 }); fx.ring(x, y, col, { radius: hundred ? 60 : 150 }); fx.burst(x, y, col, { count: hundred ? 24 : 70, speed: hundred ? 160 : 320 }); fx.glitter(r.left, r.top, r.width, r.height, col, hundred ? 8 : 26); this.auras[i] = fx.dustAura(() => card.getBoundingClientRect(), col, hundred ? 2 : 6); }
      if (res.rarity === 'legend') { fx.flash(x, y, col, { radius: 420, life: .8 }); fx.ring(x, y, col, { radius: 320, width: 9 }); setTimeout(() => this.root && fx.ring(x, y, '#fff3c4', { radius: 220, width: 5 }), 140); fx.burst(x, y, col, { count: 160, speed: 480, size: 3.4 }); fx.rain('#ffd36a', 110); this.auras[i] = fx.dustAura(() => card.getBoundingClientRect(), '#ffcf5a', hundred ? 6 : 14); this.root.classList.add('quake'); setTimeout(() => this.root?.classList.remove('quake'), 600); this.banner(`${CANNONS[res.type].short} · LEGEND!`); }
      if (res.isNew && res.rarity !== 'legend' && !hundred) this.banner(`NEW ${RARITIES[res.rarity].name} · ${CANNONS[res.type].short}`, res.rarity);
    }
    this.revealed++; if (this.revealed === this.cards.length) setTimeout(() => this.finish?.(), fast ? 0 : 500);
  }
  async flipAll(btn) {
    if (btn) btn.disabled = true; const hundred = this.root?.classList.contains('hundred');
    for (let i = 0; i < (this.cards?.length || 0); i++) { if (!this.root || this.skipping) return; const rar = this.results[i].rarity; await this.flip(i); await wait(hundred ? (rar === 'common' ? 18 : 90) : (rar === 'common' ? 140 : 320)); }
  }
  skip() { if (!this.cards) return; this.skipping = true; for (let i = 0; i < this.cards.length; i++) this.flip(i, true); }
  banner(text, rarity = 'legend') { const b = this.root?.querySelector('.gacha-banner'); if (!b) return; b.textContent = text; b.className = 'gacha-banner show r-' + rarity; clearTimeout(this.bannerT); this.bannerT = setTimeout(() => { if (b) b.className = 'gacha-banner'; }, 1800); }
  showSummary(box) {
    const by = new Map(); for (const r of this.results) { const s = by.get(r.type) || { type: r.type, n: 0, isNew: false, level: 0, ups: 0, refund: 0, gained: 0 }; s.n++; s.gained += r.gained || 0; s.isNew ||= r.isNew; s.level = Math.max(s.level, r.level); s.ups += r.levelUps; s.refund += r.refund; by.set(r.type, s); }
    const rows = [...by.values()].sort((a, b) => ['common', 'rare', 'epic', 'legend'].indexOf(TOWER_RARITY[b.type]) - ['common', 'rare', 'epic', 'legend'].indexOf(TOWER_RARITY[a.type]));
    box.replaceChildren(el('strong', '', `획득 결과 · ${this.results.length}장`));
    const list = el('div', 'gs-list'); for (const s of rows) { const row = el('div', 'gs-row r-' + TOWER_RARITY[s.type]); row.append(el('b', '', CANNONS[s.type].short), el('span', '', `×${s.n}`), el('em', '', s.isNew ? 'NEW!' : s.ups ? '레벨 업!' : s.refund ? `+${s.refund}G` : s.gained ? `+${s.gained} XP` : '')); list.append(row); }
    box.append(list); box.hidden = false;
  }
  close(silent) { if (!this.root) return; this.fx?.stop(); window.removeEventListener('resize', this.onResize); this.root.remove(); this.root = null; this.cards = null; this.finish = null; document.body.classList.remove('gacha-open'); }
}

// Collection sheet body: pack buttons + all eight tower cards.
export function renderCollection(container, game, { onPack, onCard, slotText }) {
  container.replaceChildren();
  const packs = el('div', 'pack-row');
  for (const n of [10, 100]) { const b = el('button', 'pack-btn' + (n === 100 ? ' big' : ''), ''); b.type = 'button'; b.innerHTML = `<span>${n}장 뽑기</span><b>${game.cash(PACKS[n])}</b>`; b.disabled = game.gold < PACKS[n]; b.onclick = () => onPack(n); packs.append(b); }
  if (game.freePack) { const f = el('button', 'pack-btn free', ''); f.type = 'button'; f.innerHTML = '<span>첫 선물 · 10장</span><b>무료</b>'; f.onclick = () => onPack(10, true); packs.prepend(f); }
  const odds = cardOdds(), oddsLine = el('p', 'odds-line odds-note', ['legend', 'epic', 'rare', 'common'].map(r => `${RARITIES[r].name} ${(Object.entries(odds).filter(([t]) => TOWER_RARITY[t] === r).reduce((n, [, p]) => n + p, 0) * 100).toFixed(r === 'common' ? 1 : 2).replace(/\.?0+$/, '')}%`).join(' · ') + ' · 중복 카드는 레벨업 재료');
  const head = el('div', 'coll-head'); head.append(el('strong', '', '내 타워 카드'), el('small', '', slotText));
  const grid = el('div', 'coll-grid');
  const order = Object.keys(TOWER_RARITY).sort((a, b) => ['common', 'rare', 'epic', 'legend'].indexOf(TOWER_RARITY[a]) - ['common', 'rare', 'epic', 'legend'].indexOf(TOWER_RARITY[b]));
  for (const type of order) { const item = game.inventory.find(c => c.type === type), deployed = game.cannons.some(c => c.type === type), card = towerCard(type, item || null); const chip = el('span', 'tc-state ' + (deployed ? 'on' : item ? 'off' : 'none'), deployed ? '배치 중' : item ? '보관 중' : '미보유'); card.append(chip); card.tabIndex = 0; card.onclick = () => onCard(type); grid.append(card); }
  container.append(packs, head, grid, oddsLine);
}

export function statLines(game, c) {
  const st = cannonStats(c.type, c.level), buff = game.attackBuff(c), power = game.power;
  const lines = [['공격력', c.type === 'totem' ? '지원 전용' : (st.damage * power).toFixed(1)], ['공격 간격', c.type === 'totem' || c.type === 'blackhole' ? '지속 효과' : `${(1 / (st.rate * (1 + buff))).toFixed(2)}초마다`], ['사거리', Math.round(st.range)], ['성벽 보너스', `공격력 ×${(power / .75).toFixed(2)}`]];
  if (buff > 0) lines.push(['토템 지원', `연사 +${Math.round(buff * 100)}%`]);
  if (c.type === 'totem') lines.push(['주변 지원', `연사 +${Math.round(st.buff * 100)}%`]);
  if (st.pierce) lines.push(['관통', `${st.pierce}마리`]); if (st.slow) lines.push(['감속', `${Math.round(st.slow * 100)}% · ${st.duration.toFixed(1)}초`]); if (c.type === 'poison') lines.push(['독', `${st.dot.toFixed(1)}/초`]); if (c.type === 'mortar') lines.push(['폭발 반경', Math.round(st.radius)]);
  if (st.minRange) lines.push(['최소 사거리', `${Math.round(st.minRange)} (안쪽은 못 맞힘)`]);
  if (c.type === 'siege') lines.push(['포격 반경', Math.round(st.radius)]);
  if (c.type === 'summoner') lines.push(['소환', `기사 ${st.knights}명 · ${Math.round(1 / st.rate)}초마다`], ['기사 공격', `${st.damage.toFixed(1)} × ${st.hits}회`]);
  if (c.type === 'sonic') lines.push(['음파 반경', Math.round(st.range)]);
  if (c.type === 'blackhole') lines.push(['끌어당김', `반경 ${Math.round(st.range)} · 감속 ${Math.round(st.drag * 100)}%`], ['지속 피해', `${st.damage.toFixed(1)}/초`]);
  if (c.type === 'musk') lines.push(['사이버트럭', `관통 · 폭 ${Math.round(st.width)}`], ['로켓 확률', `${Math.round(st.rocketChance * 100)}% · 초광역`]);
  lines.push(['이번 판 처치', `${game.metrics.killsByType?.[c.type] || 0}마리`]);
  return lines;
}
// v23: what the next level adds (shown in the tower info card).
export function nextLevelLines(c) {
  if (c.level >= MAX_CARD_LEVEL) return [['다음 레벨', '최고 레벨이에요']];
  const a = cannonStats(c.type, c.level), b = cannonStats(c.type, c.level + 1), out = [];
  const pct = (x, y) => `+${((y / x - 1) * 100).toFixed(1)}%`;
  if (a.damage) out.push(['공격력', `${a.damage.toFixed(1)} → ${b.damage.toFixed(1)}`]);
  if (a.rate && b.rate > a.rate + 1e-9) out.push(['공격 간격', `${(1 / a.rate).toFixed(2)}초 → ${(1 / b.rate).toFixed(2)}초`]);
  if (b.range > a.range + .01) out.push(['사거리', `+${(b.range - a.range).toFixed(1)}`]);
  if (b.radius > a.radius + .01) out.push(['폭발 반경', `+${(b.radius - a.radius).toFixed(1)}`]);
  if (b.buff > a.buff + 1e-9) out.push(['토템 지원', `+${((b.buff - a.buff) * 100).toFixed(1)}%p`]);
  if (b.dot > a.dot + 1e-9) out.push(['독 피해', pct(a.dot, b.dot)]);
  if (b.slow > a.slow + 1e-9) out.push(['감속', `+${((b.slow - a.slow) * 100).toFixed(1)}%p`]);
  if (b.knights > a.knights) out.push(['기사 수', `+${b.knights - a.knights}명`]);
  if (b.hits > a.hits) out.push(['기사 공격 횟수', `+${b.hits - a.hits}회`]);
  if (b.drag > a.drag + 1e-9) out.push(['끌어당김 감속', `+${((b.drag - a.drag) * 100).toFixed(1)}%p`]);
  if (b.pierce > a.pierce) out.push(['관통', `+${b.pierce - a.pierce}`]);
  if ((c.level + 1) % 10 === 0) out.push(['외형', '다음 레벨에 디자인이 바뀌어요 ✨']);
  return out;
}

// v43: tower codex — every upgrade tier with its art, numbers and unlocked abilities.
export function openCodex(type, item) {
  document.getElementById('codex')?.remove();
  const d = CANNONS[type], wrap = el('div', 'codex'); wrap.id = 'codex';
  const box = el('div', 'codex-box gk-panel'), head = el('div', 'codex-head'), list = el('div', 'codex-list'), close = el('button', 'codex-close', '×');
  close.type = 'button'; close.setAttribute('aria-label', '닫기');
  head.append(el('small', '', 'TOWER CODEX'), el('h3', '', d.name + ' 도감'), el('p', '', d.role)); box.append(close, head, list); wrap.append(box);
  const cur = item?.level || 0, perks = PERKS[type] || [], seen = new Set();
  for (let lv = 1; lv <= MAX_CARD_LEVEL; lv++) {
    const tier = towerTier(lv, 10), newPerks = perks.filter(p => p.lv === lv), tierStart = towerTier(lv - 1 || 1, 10) !== tier || lv === 1;
    if (!tierStart && !newPerks.length && lv !== MAX_CARD_LEVEL) continue;
    const st = cannonStats(type, lv), row = el('div', 'codex-row' + (cur >= lv ? ' got' : '') + (cur && towerTier(cur, 10) === tier && tierStart ? ' now' : ''));
    const art = el('canvas', 'codex-art'); art.width = 150; art.height = 130;
    const info = el('div', 'codex-info'); info.append(el('b', 'codex-lv', 'Lv.' + lv + (tierStart && !seen.has(tier) ? ` · ${tier + 1}단계 외형` : '')));
    seen.add(tier);
    const nums = []; if (st.damage) nums.push('공격력 ' + st.damage.toFixed(1)); if (st.rate) nums.push((1 / st.rate).toFixed(2) + '초마다'); if (st.range) nums.push('사거리 ' + Math.round(st.range)); if (st.knights) nums.push('기사 ' + st.knights + (st.archers ? ' · 궁수 ' + st.archers : ''));
    info.append(el('span', 'codex-nums', nums.join(' · ')));
    for (const p of newPerks) info.append(el('span', 'codex-perk', '✨ ' + p.text));
    row.append(art, info); list.append(row);
    requestAnimationFrame(() => renderShopIcon(art, type, lv));
  }
  const shut = () => wrap.remove(); close.onclick = shut; wrap.addEventListener('click', e => { if (e.target === wrap) shut(); });
  document.body.append(wrap);
  requestAnimationFrame(() => list.querySelector('.now')?.scrollIntoView({ block: 'center' }));
}
