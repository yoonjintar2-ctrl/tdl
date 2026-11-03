// v78: "AI 조합 추천" — a local optimiser. Every press samples a new, different lineup from the
// owned towers (DPS × level, role coverage, synergies), then assigns slots to fit each tower's reach.
import { CANNONS, cannonStats, WALL_SLOTS, FORWARD_X, REAR_X, SUPPORT_TYPES } from './config.js?v=bbce5924c3';
import { dpsOf } from './card-ui.js?v=bbce5924c3';
import { TOWER_RARITY } from './cards.js?v=bbce5924c3';
const ROLE = { sticky: 'control', sonic: 'control', blackhole: 'control', poison: 'dot', mortar: 'area', siege: 'area', musk: 'area', laser: 'pierce', hbm: 'area', ant: 'close', bull: 'close', machine: 'single', sniper: 'boss', drone: 'single', fed: 'chain', summoner: 'swarm' };
const CLOSE = new Set(['sonic', 'bull', 'ant', 'machine', 'sticky', 'poison', 'blackhole', 'fed']);
const RAR = { common: 0, rare: .08, epic: .16, legend: .26 };
const key = r => [...r.regular.map(p => p.type + '@' + p.x)].sort().join(',') + '|' + (r.rear?.type || '');
export function recommend(game, history = new Set(), tries = 40) {
  const inv = game.inventory.filter(v => v.type !== 'drone' && CANNONS[v.type]);
  const nSlots = Math.min(game.slotLimit, WALL_SLOTS.length + 1);
  const value = v => { const d = dpsOf(v.type, v.level) ?? 0; return d + 25 * (RAR[TOWER_RARITY[v.type]] || 0) * v.level / 10; };
  const attackers = inv.filter(v => !SUPPORT_TYPES.includes(v.type) || v.type === 'bull');
  const supports = inv.filter(v => SUPPORT_TYPES.includes(v.type));
  let best = null;
  for (let t = 0; t < tries; t++) {
    const temp = .35 + Math.random() * .5;
    // weighted sampling without replacement (Gumbel-max with temperature)
    const pool = attackers.map(v => ({ v, s: Math.log(Math.max(1, value(v))) / temp - Math.log(-Math.log(Math.random())) }));
    pool.sort((a, b) => b.s - a.s);
    const pick = []; const roles = new Set();
    for (const { v } of pool) { if (pick.length >= nSlots) break; const r = ROLE[v.type] || 'single'; if (roles.has(r) && pick.length < nSlots - 1 && Math.random() < .55) continue; pick.push(v); roles.add(r); }
    for (const { v } of pool) { if (pick.length >= nSlots) break; if (!pick.includes(v)) pick.push(v); }
    // supports may also take a regular slot when the bench is thin
    const sp = supports.slice().sort((a, b) => (b.type === 'totem') - (a.type === 'totem') || Math.random() - .5);
    const rear = sp.find(v => v.type !== 'bull' || !pick.includes(v)) || null;
    while (pick.length < nSlots && sp.length) { const s = sp.shift(); if (s !== rear && !pick.includes(s)) pick.push(s); }
    // slots: closest-range tower to the forward outpost; longest reach on the outer wall
    const order = pick.slice().sort((a, b) => (CLOSE.has(b.type) - CLOSE.has(a.type)) || cannonStats(a.type, a.level).range - cannonStats(b.type, b.level).range);
    const slots = [FORWARD_X, 138, 294, 60, 372].slice(0, nSlots);
    const regular = order.map((v, i) => ({ type: v.type, level: v.level, x: slots[i] }));
    // score: raw DPS with buffs + role coverage
    const buff = (rear?.type === 'totem' || regular.some(p => p.type === 'totem')) ? cannonStats('totem', (rear || regular.find(p => p.type === 'totem')).level).buff : 0;
    const lev = (rear?.type === 'leverage' || regular.some(p => p.type === 'leverage')) ? 2 : 1;
    const dps = regular.reduce((n, p) => n + (dpsOf(p.type, p.level) ?? 0), 0) * (1 + buff) * lev;
    const cover = new Set(regular.map(p => ROLE[p.type] || 'support')).size;
    const r = { regular, rear: rear ? { type: rear.type, level: rear.level, x: REAR_X } : null, dps, cover, score: dps * (1 + cover * .06) };
    if (history.has(key(r))) continue;
    if (!best || r.score * (0.85 + Math.random() * .3) > best.score) best = r;
  }
  if (best) history.add(key(best));
  return best;
}
export function applyCombo(game, combo) {
  const keep = game.cannons.filter(c => c.type === 'drone');
  const mk = p => ({ type: p.type, x: p.x, level: game.owned(p.type)?.level || p.level, cooldown: .25, recoil: 0, angle: -Math.PI / 2, targetId: null, targetLock: 0, ult: 0 });
  game.cannons = [...keep, ...combo.regular.map(mk), ...(combo.rear ? [mk(combo.rear)] : [])];
  game.selected = null; game.dirty = true; return true;
}
