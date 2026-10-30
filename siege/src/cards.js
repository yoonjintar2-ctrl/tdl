// Tower cards: rarity, pack odds, duplicate-driven levelling and difficulty modes.
// Gold no longer buys or upgrades towers directly; it only buys card packs.
export const MAX_CARD_LEVEL = 40;
export const RARITIES = Object.freeze({
  common: Object.freeze({ key: 'common', name: '일반', color: '#f3efe2', glow: '#ffffff', weight: 99 }),
  rare: Object.freeze({ key: 'rare', name: '고급', color: '#4f9dff', glow: '#8cc4ff', weight: 0.85 }),
  epic: Object.freeze({ key: 'epic', name: '희귀', color: '#ffd23f', glow: '#ffe680', weight: 0.13 }),
  legend: Object.freeze({ key: 'legend', name: '레전드', color: '#ff9f1a', glow: '#ffc35a', weight: 0.02 })
});
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legend'];
export const TOWER_RARITY = Object.freeze({ machine: 'common', sticky: 'common', poison: 'common', siege: 'common', summoner: 'common', mortar: 'rare', sniper: 'rare', totem: 'epic', laser: 'epic', musk: 'epic', drone: 'legend' });
export const towersOf = rarity => Object.keys(TOWER_RARITY).filter(t => TOWER_RARITY[t] === rarity);
export const rarityOf = type => RARITIES[TOWER_RARITY[type] || 'common'];
// v22: duplicates grant card XP (rarer towers give more); XP fills up to the next level.
export const XP_PER_CARD = Object.freeze({ common: 10, rare: 40, epic: 120, legend: 400 });
export const xpForNext = level => level >= MAX_CARD_LEVEL ? Infinity : 20 + 10 * Math.max(1, Math.floor(level));
// Design tier: the tower's look changes every 10 levels (1–9, 10–19, 20–29, 30–39, 40).
export const towerTier = level => Math.min(4, Math.floor(Math.max(1, level || 1) / 10));
// Pack prices are in the game's gold units. Duplicates past MAX refund gold.
export const PACKS = Object.freeze({ 10: 1200, 100: 10800 });
export const MAX_REFUND = Object.freeze({ common: 6, rare: 20, epic: 80, legend: 400 });

export function cardOdds() {
  const total = RARITY_ORDER.reduce((n, r) => n + RARITIES[r].weight, 0);
  return Object.fromEntries(Object.keys(TOWER_RARITY).map(t => [t, RARITIES[TOWER_RARITY[t]].weight / total / towersOf(TOWER_RARITY[t]).length]));
}
export function rollCard(random = Math.random) {
  const total = RARITY_ORDER.reduce((n, r) => n + RARITIES[r].weight, 0);
  let roll = random() * total, rarity = 'common';
  for (const r of RARITY_ORDER) { if (roll < RARITIES[r].weight) { rarity = r; break; } roll -= RARITIES[r].weight; }
  const pool = towersOf(rarity);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
// Applies one card to an inventory array of {type, level, xp}; mutates and returns the outcome.
export function applyCard(inventory, type) {
  let item = inventory.find(c => c.type === type); const rarity = TOWER_RARITY[type];
  if (!item) { item = { type, level: 1, xp: 0 }; inventory.push(item); return { type, rarity, isNew: true, level: 1, levelUps: 0, refund: 0, xp: 0, gained: 0, need: xpForNext(1) }; }
  item.xp = Math.max(0, item.xp || 0);
  if (item.level >= MAX_CARD_LEVEL) { item.xp = 0; return { type, rarity, isNew: false, level: item.level, levelUps: 0, refund: MAX_REFUND[rarity], xp: 0, gained: 0, need: Infinity }; }
  const gained = XP_PER_CARD[rarity]; item.xp += gained; let levelUps = 0;
  while (item.level < MAX_CARD_LEVEL && item.xp >= xpForNext(item.level)) { item.xp -= xpForNext(item.level); item.level++; levelUps++; }
  if (item.level >= MAX_CARD_LEVEL) item.xp = 0;
  return { type, rarity, isNew: false, level: item.level, levelUps, refund: 0, xp: item.xp, gained, need: xpForNext(item.level) };
}
// `guarantee` (a rarity key) swaps one random card of the pack for a tower of that rarity — the free starter pack uses it.
export function openPack(inventory, count, random = Math.random, { guarantee = null } = {}) {
  const types = [];
  for (let i = 0; i < count; i++) types.push(rollCard(random));
  if (guarantee && !types.some(t => RARITY_ORDER.indexOf(TOWER_RARITY[t]) >= RARITY_ORDER.indexOf(guarantee))) { const pool = towersOf(guarantee); types[Math.min(count - 1, Math.floor(random() * count))] = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]; }
  return types.map(t => applyCard(inventory, t));
}

// Difficulty modes: stronger bears, richer rewards. Unlocked by clearing all 20 missions on the previous mode.
export const MODES = Object.freeze({
  normal: Object.freeze({ key: 'normal', name: '노말', hp: 1, damage: 1, gold: 1, color: '#7fbf6a' }),
  nightmare: Object.freeze({ key: 'nightmare', name: '악몽', hp: 4, damage: 1.5, gold: 2.2, color: '#a97cff' }),
  hell: Object.freeze({ key: 'hell', name: '지옥', hp: 14, damage: 2.2, gold: 4.5, color: '#ff5a3c' })
});
export const MODE_ORDER = ['normal', 'nightmare', 'hell'];
export const modeFor = key => MODES[key] || MODES.normal;
