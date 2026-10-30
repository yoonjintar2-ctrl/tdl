// Tower cards: rarity, pack odds, duplicate-driven levelling and difficulty modes.
// Gold no longer buys or upgrades towers directly; it only buys card packs.
export const MAX_CARD_LEVEL = 40;
export const RARITIES = Object.freeze({
  common: Object.freeze({ key: 'common', name: '일반', color: '#f3efe2', glow: '#ffffff', weight: 76 }),
  rare: Object.freeze({ key: 'rare', name: '고급', color: '#4f9dff', glow: '#8cc4ff', weight: 19 }),
  epic: Object.freeze({ key: 'epic', name: '희귀', color: '#ffd23f', glow: '#ffe680', weight: 4.8 }),
  legend: Object.freeze({ key: 'legend', name: '레전드', color: '#ff9f1a', glow: '#ffc35a', weight: 0.1 })
});
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legend'];
export const TOWER_RARITY = Object.freeze({ machine: 'common', sticky: 'common', poison: 'rare', mortar: 'rare', sniper: 'epic', totem: 'epic', laser: 'legend', drone: 'legend' });
export const towersOf = rarity => Object.keys(TOWER_RARITY).filter(t => TOWER_RARITY[t] === rarity);
export const rarityOf = type => RARITIES[TOWER_RARITY[type] || 'common'];
// Copies needed to go from `level` to `level + 1`. Lv.1→2 needs 1, Lv.10→11 needs 10.
export const copiesForNext = level => level >= MAX_CARD_LEVEL ? Infinity : Math.max(1, Math.floor(level));
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
// Applies one card to an inventory array of {type, level, copies}; mutates and returns the outcome.
export function applyCard(inventory, type) {
  let item = inventory.find(c => c.type === type);
  if (!item) { item = { type, level: 1, copies: 0 }; inventory.push(item); return { type, rarity: TOWER_RARITY[type], isNew: true, level: 1, levelUps: 0, refund: 0 }; }
  item.copies = Math.max(0, item.copies || 0);
  if (item.level >= MAX_CARD_LEVEL) { const refund = MAX_REFUND[TOWER_RARITY[type]]; return { type, rarity: TOWER_RARITY[type], isNew: false, level: item.level, levelUps: 0, refund }; }
  item.copies += 1; let levelUps = 0;
  while (item.level < MAX_CARD_LEVEL && item.copies >= copiesForNext(item.level)) { item.copies -= copiesForNext(item.level); item.level++; levelUps++; }
  if (item.level >= MAX_CARD_LEVEL) item.copies = 0;
  return { type, rarity: TOWER_RARITY[type], isNew: false, level: item.level, levelUps, refund: 0, copies: item.copies, need: copiesForNext(item.level) };
}
export function openPack(inventory, count, random = Math.random) {
  const results = [];
  for (let i = 0; i < count; i++) results.push(applyCard(inventory, rollCard(random)));
  return results;
}

// Difficulty modes: stronger bears, richer rewards. Unlocked by clearing all 20 missions on the previous mode.
export const MODES = Object.freeze({
  normal: Object.freeze({ key: 'normal', name: '노말', hp: 1, damage: 1, gold: 1, color: '#7fbf6a' }),
  nightmare: Object.freeze({ key: 'nightmare', name: '악몽', hp: 4, damage: 1.5, gold: 2.2, color: '#a97cff' }),
  hell: Object.freeze({ key: 'hell', name: '지옥', hp: 14, damage: 2.2, gold: 4.5, color: '#ff5a3c' })
});
export const MODE_ORDER = ['normal', 'nightmare', 'hell'];
export const modeFor = key => MODES[key] || MODES.normal;
