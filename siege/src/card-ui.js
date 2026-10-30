import { CANNONS, cannonStats } from './config.js?v=7b6759f665';
import { RARITIES, TOWER_RARITY, copiesForNext, MAX_CARD_LEVEL, cardOdds, PACKS } from './cards.js?v=7b6759f665';
import { renderShopIcon } from './renderer.js?v=7b6759f665';
import { FX } from './fx.js?v=7b6759f665';

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const FLAME = { common: ['#ffe2b0', .4], rare: ['#5aa8ff', .8], epic: ['#ffcc33', 1.05], legend: ['#ff8a1a', 1.5] };

// A tower card. item = {level, copies} or null (not owned yet).
export function towerCard(type, item, { mini = false, faceDown = false } = {}) {
  const rarity = TOWER_RARITY[type], r = RARITIES[rarity];
  const card = el('div', `tcard r-${rarity}${mini ? ' mini' : ''}${faceDown ? ' hidden' : ''}${item ? '' : ' unowned'}`); card.dataset.type = type;
  const inner = el('div', 'tcard-inner'), front = el('div', 'tcard-face front'), back = el('div', 'tcard-face back');
  const top = el('div', 'tc-top'); top.append(el('span', 'tc-rarity', r.name), el('span', 'tc-lv', item ? `Lv.${item.level}` : '?'));
  const art = el('canvas', 'tc-art'); art.width = 200; art.height = 180; art.setAttribute('aria-hidden', 'true');
  front.append(top, art, el('div', 'tc-name', CANNONS[type].short));
  if (!mini) {
    const bar = el('div', 'tc-bar'), fill = el('i'), need = item ? copiesForNext(item.level) : 1;
    fill.style.width = item ? (item.level >= MAX_CARD_LEVEL ? 100 : Math.min(100, (item.copies || 0) / need * 100)) + '%' : '0%';
    bar.append(fill, el('small', '', item ? (item.level >= MAX_CARD_LEVEL ? 'MAX' : `${item.copies || 0} / ${need}`) : '뽑기로 획득'));
    front.append(bar);
  }
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
    const skip = el('button', 'gacha-btn ghost', '스킵 ⏭'), flipAll = el('button', 'gacha-btn', '모두 뒤집기'), done = el('button', 'gacha-btn primary', '확인'), again = el('button', 'gacha-btn', `한 번 더 (${count}장)`);
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
    const real = towerCard(res.type, { level: res.level, copies: res.copies ?? 0 }, { mini: hundred });
    card.querySelector('.tcard-face.front').replaceWith(real.querySelector('.tcard-face.front'));
    card.classList.remove('hidden', 'charging', 'short', 'unowned'); card.classList.add('revealed');
    const badge = res.isNew ? 'NEW!' : res.levelUps ? '강화!' : res.refund ? `+${res.refund}G` : '';
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
    const by = new Map(); for (const r of this.results) { const s = by.get(r.type) || { type: r.type, n: 0, isNew: false, level: 0, ups: 0, refund: 0 }; s.n++; s.isNew ||= r.isNew; s.level = Math.max(s.level, r.level); s.ups += r.levelUps; s.refund += r.refund; by.set(r.type, s); }
    const rows = [...by.values()].sort((a, b) => ['common', 'rare', 'epic', 'legend'].indexOf(TOWER_RARITY[b.type]) - ['common', 'rare', 'epic', 'legend'].indexOf(TOWER_RARITY[a.type]));
    box.replaceChildren(el('strong', '', `획득 결과 · ${this.results.length}장`));
    const list = el('div', 'gs-list'); for (const s of rows) { const row = el('div', 'gs-row r-' + TOWER_RARITY[s.type]); row.append(el('b', '', CANNONS[s.type].short), el('span', '', `×${s.n}`), el('em', '', s.isNew ? 'NEW!' : s.ups ? '강화!' : s.refund ? `+${s.refund}G` : '')); list.append(row); }
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
  const odds = cardOdds(), oddsLine = el('p', 'odds-line', ['legend', 'epic', 'rare', 'common'].map(r => `${RARITIES[r].name} ${(Object.entries(odds).filter(([t]) => TOWER_RARITY[t] === r).reduce((n, [, p]) => n + p, 0) * 100).toFixed(r === 'common' ? 1 : 2).replace(/\.?0+$/, '')}%`).join(' · ') + ' · 중복 카드는 레벨업 재료');
  const head = el('div', 'coll-head'); head.append(el('strong', '', '내 타워 카드'), el('small', '', slotText));
  const grid = el('div', 'coll-grid');
  const order = Object.keys(TOWER_RARITY).sort((a, b) => ['common', 'rare', 'epic', 'legend'].indexOf(TOWER_RARITY[a]) - ['common', 'rare', 'epic', 'legend'].indexOf(TOWER_RARITY[b]));
  for (const type of order) { const item = game.inventory.find(c => c.type === type), deployed = game.cannons.some(c => c.type === type), card = towerCard(type, item || null); const chip = el('span', 'tc-state ' + (deployed ? 'on' : item ? 'off' : 'none'), deployed ? '배치 중' : item ? '보관 중' : '미보유'); card.append(chip); if (item) { card.tabIndex = 0; card.onclick = () => onCard(type); } grid.append(card); }
  container.append(packs, oddsLine, head, grid);
}

export function statLines(game, c) {
  const st = cannonStats(c.type, c.level), buff = game.attackBuff(c), power = game.power;
  const lines = [['공격력', c.type === 'totem' ? '지원 전용' : (st.damage * power).toFixed(1)], ['공격 속도', c.type === 'totem' ? '지원 전용' : `${(st.rate * (1 + buff)).toFixed(2)} / 초`], ['사거리', Math.round(st.range)], ['장벽 버프', `Lv.${game.wallLevel} · 피해 ×${power.toFixed(2)}`]];
  if (buff > 0) lines.push(['토템 지원', `연사 +${Math.round(buff * 100)}%`]);
  if (c.type === 'totem') lines.push(['주변 지원', `연사 +${Math.round(st.buff * 100)}%`]);
  if (st.pierce) lines.push(['관통', `${st.pierce}마리`]); if (st.slow) lines.push(['감속', `${Math.round(st.slow * 100)}% · ${st.duration.toFixed(1)}초`]); if (c.type === 'poison') lines.push(['독', `${st.dot.toFixed(1)}/초`]); if (c.type === 'mortar') lines.push(['폭발 반경', Math.round(st.radius)]);
  lines.push(['이번 판 처치', `${game.metrics.killsByType?.[c.type] || 0}마리`]);
  return lines;
}
