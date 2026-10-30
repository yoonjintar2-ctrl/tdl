export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const WORLD_WIDTH = 432;
export const CAMERA_DEPTH = .78;
// Shared geometry for collision, sprites, hit effects and pointer projection.
export const WALL = Object.freeze({ north: -10, back: -28, south: 18, deck: -19, elevation: 34, hitHeight: 31, mountDepth: 20, mountOffset: 8, mountShoulder: 10, mountRadius: 30, cannonScale: .62 });
export const ACTOR_STYLE = Object.freeze({ unitScale: .46, footprintScale: .5, droneScale: .72 });
export const SETTINGS = Object.freeze({ maxHP: 1200, initialGold: 1600, maxLevel: 40, minSpacing: 49, wallMoveSeconds: .65, enemyCap: 900, supplyCap: 900, swarmMinuteCap:2400, effectCap: 300, maxBuff: .65, stageDelay: 1.1, saveKey: 'stock-siege-soxl-v1' });
export const MARKETS = { US: { buy: '#54efbc', sell: '#ff6876' }, KR: { buy: '#ff6876', sell: '#618fff' } };
export const SYMBOL = { name: 'SOXL', market: 'US', previousClose: 32.40, averageVolumePerSecond: 4200 };
export const ENEMIES = [
  { name: '작은 음봉', hp: 25, reward: 2, speed: 38, radius: 10, width: 16, height: 22, damage: 5, interval: 1.1 },
  { name: '키 큰 음봉', hp: 120, reward: 5, speed: 29, radius: 13, width: 15, height: 38, damage: 10, interval: 1.4 },
  { name: '돼지 음봉', hp: 280, reward: 12, speed: 20, radius: 19, width: 34, height: 26, damage: 18, interval: 1.7 },
  { name: '거인 음봉', hp: 1600, reward: 30, speed: 15, radius: 26, width: 40, height: 53, damage: 35, interval: 2 },
  { name: '초미니 음봉', hp: 9, reward: 1, speed: 50, radius: 7, width: 10, height: 9, damage: 2, interval: .8 }
];
export const SUPPLIES = [
  { name: 'DRAM', heal: 23, radius: 12, speed: 37 },
  { name: '프로세서', heal: 31, radius: 13, speed: 33 },
  { name: '웨이퍼', heal: 48, radius: 17, speed: 29 },
  { name: '광통신 모듈', heal: 36, radius: 14, speed: 40 },
  { name: '광섬유 커넥터', heal: 27, radius: 12, speed: 44 },
  { name: '반도체 기판', heal: 65, radius: 20, speed: 25 }
];
export const CANNONS = {
  machine: { name: '기관총', short: '기관총', icon: 'MG', cost: 100, damage: 6, rate: 5, range: 205, color: '#b4d4e2', role: '가까운 적에게 고속 단일 사격' },
  mortar: { name: '박격포', short: '박격포', icon: 'MR', cost: 180, damage: 4, rate: .55, range: 265, radius: 55, color: '#ffc478', role: '포물선 포탄 · 범위 폭발' },
  sniper: { name: '스나이퍼', short: '저격', icon: 'SR', cost: 250, damage: 90, rate: .45, range: 530, color: '#85beff', role: '현재 HP가 가장 높은 적 우선' },
  laser: { name: '레이저', short: '레이저', icon: 'LS', cost: 280, damage: 4.5, rate: 1.1, range: 360, pierce: 9, color: '#58efd9', role: '직선 관통 · 다중 타격' },
  totem: { name: '토템', short: '토템', icon: 'TT', cost: 300, damage: 0, rate: 0, range: 165, buff: .2, color: '#ffda7a', role: '주변 캐논 연사력 지원 · 자신 제외' },
  sticky: { name: '끈적이', short: '끈적이', icon: 'GL', cost: 210, damage: 0, rate: 1, range: 235, radius: 34, slow: .55, duration: 3, color: '#a3ed75', role: '피해 없이 범위 안 음봉의 이동·공격 속도를 크게 낮춤' },
  poison: { name: '독 캐논', short: '독', icon: 'TX', cost: 240, damage: 0, rate: .9, range: 750, minRange: 170, radius: 46, dot: 1.4, duration: 6, color: '#c093ff', role: '먼 곳에 독 웅덩이 · 범위 안 음봉의 체력을 서서히 깎음 · 최대 3중첩 · 가까운 적은 못 맞힘' },
  siege: { name: '공성 전차', short: '공성전차', icon: 'ST', cost: 260, damage: 4.5, rate: .32, range: 820, minRange: 230, radius: 72, color: '#ffb35a', role: '아주 먼 적에게 광역 포격 · 가까운 적은 못 맞힘' },
  summoner: { name: '소환사', short: '소환사', icon: 'SM', cost: 240, damage: 7, rate: .16, range: 70, knights: 3, hits: 6, color: '#9be064', role: '양봉 기사 3명을 주기적으로 소환 · 기사는 가까운 음봉부터 베며 북진' },
  sonic: { name: '소닉 타워', short: '소닉', icon: 'SO', cost: 260, damage: 2.2, rate: .8, range: 105, color: '#9fe8ff', role: '주변으로 둥글게 퍼지는 음파 · 약하지만 넓은 범위를 한꺼번에 · 전진 자리에 딱' },
  blackhole: { name: '블랙홀', short: '블랙홀', icon: 'BH', cost: 300, damage: 1.2, rate: 0, range: 150, pull: 38, drag: .45, color: '#b28cff', role: '주변 음봉을 끌어당기고 느리게 함 · 약한 지속 피해' },
  musk: { name: '삼론 머스크', short: '삼론머스크', icon: 'EM', cost: 320, damage: 3.5, rate: .24, range: 900, width: 30, rocketChance: .12, color: '#d9e3ec', role: '사이버트럭 발사 · 관통 광역 피해 · 가끔 초광역 로켓' },
  drone: { name: 'DRONE', short: 'DRONE', icon: 'DR', cost: 350, damage: 14, rate: 3.2, range: 230, targetSwitch: .24, color: '#97e9ff', role: '자유 공중 배치 · 단일 타깃 레이저' }
};
export const SHOP_NAMES = { sonic: 'SONIC', blackhole: 'BLACKHOLE', siege: 'SIEGE', summoner: 'SUMMON', musk: 'MUSK', machine: 'MG GUN', mortar: 'MORTAR', sniper: 'SNIPER', laser: 'LASER', totem: 'TOTEM', sticky: 'SLIME', poison: 'POISON', drone: 'DRONE' };
export const DRONE = Object.freeze({ altitude: 24, marginX: 29, marginTop: 62, marginBottom: 25 });
export const WALL_STAGES = [
  { name: '흙', color: '#7a5a3c', edge: '#b58a5c' }, { name: '목책', color: '#5e4430', edge: '#a07a52' },
  { name: '사암', color: '#705349', edge: '#af8670' }, { name: '이끼석', color: '#765540', edge: '#c49b6a' },
  { name: '풍화석', color: '#6c5846', edge: '#b5a088' }, { name: '목석', color: '#60645f', edge: '#abb9ae' },
  { name: '석회암', color: '#5b7081', edge: '#aec7d4' }, { name: '화강암', color: '#506d81', edge: '#b5d8e8' },
  { name: '철띠석', color: '#526f77', edge: '#caf6ed' }, { name: '황금', color: '#8b713b', edge: '#ffdb88' }
];
export const SCENARIOS = [ ['rise', '완만한 상승'], ['fall', '완만한 하락'], ['flat', '횡보'], ['sell', '매도세 폭발'], ['buy', '매수세 폭발'], ['pump', '급등 후 급락'], ['rebound', '급락 후 급반등'] ];
export function cannonStats(type, level = 1) {
  const c = CANNONS[type], n = clamp(level, 1, 40) - 1;
  return { ...c, damage: c.damage * (1 + n * .12), rate: c.rate * (1 + n * (type === 'machine' ? .016 : .012)), pull: (c.pull || 0) * (1 + n * .03), drag: c.drag ? Math.min(.75, c.drag + n * .006) : 0,
    targetSwitch: c.targetSwitch ? c.targetSwitch / (1 + n * .045) : 0,
    range: c.range + n * (type === 'sniper' ? 4 : type === 'totem' || type === 'drone' ? 2 : .45), radius: (c.radius || 0) + n * (type === 'mortar' ? .65 : type === 'poison' ? .5 : .35),
    pierce: c.pierce ? Math.min(12, c.pierce + Math.floor(n / 6)) : 0, buff: c.buff ? Math.min(.5, c.buff + n * .008) : 0,
    minRange: c.minRange || 0, width: (c.width || 0) + n * .4, knights: c.knights ? c.knights + Math.floor(n / 13) : 0, hits: c.hits ? c.hits + Math.floor(n / 8) : 0, slow: c.slow ? Math.min(.65, c.slow + n * .008) : 0, splashCap: c.splashCap ? Math.min(.52, c.splashCap + n * .006) : 0, duration: (c.duration || 0) + n * .045, dot: (c.dot || 0) * (1 + n * .055) };
}
export const upgradeCost = (type, level) => Math.ceil(CANNONS[type].cost * .45 * 1.13 ** (level - 1));
export const energyMultiplier = (hp, maxHP = SETTINGS.maxHP) => .25 + .75 * clamp(hp / maxHP, 0, 1);
export const wallYFor = (pct, height) => height * (.5 - .2 * clamp(pct, -30, 30) / 30);
export const priceBand = pct => { const value = clamp(pct, -30, 30), nearest = Math.round(value); return Math.trunc(Math.abs(value - nearest) < 1e-9 ? nearest : value); };
// v26: fixed layout — four wall slots (two left, two right), the command post in the centre,
// and one forward slot north of the centre (stored as x = FORWARD_X).
export const WALL_SLOTS = Object.freeze([60, 138, 294, 372]);
export const FORWARD_X = 216, FORWARD_DY = 175, COMMAND_X = 216;
export const ALL_SLOTS = Object.freeze([...WALL_SLOTS, FORWARD_X]);
export const isSlotX = x => ALL_SLOTS.some(s => Math.abs(s - x) < .5);
export function validPlacement(x, cannons, exclude = null) { return Number.isFinite(x) && isSlotX(x) && cannons.every(c => c.type === 'drone' || c === exclude || Math.abs(c.x - x) >= .5); }
// Nearest free slot to a drop point. `north` = how far north of the wall the finger is (world units).
export function snapSlot(x, cannons, exclude = null, north = 0) { const free = ALL_SLOTS.filter(s => validPlacement(s, cannons, exclude)); if (!free.length) return null; return free.map(s => ({ s, d: s === FORWARD_X ? Math.hypot(x - s, Math.max(0, FORWARD_DY - north)) : Math.hypot(x - s, Math.max(0, north) * .9 + 8) })).sort((a, b) => a.d - b.d)[0].s; }
export function validDronePlacement(x, y, height) { return Number.isFinite(x) && Number.isFinite(y) && x >= DRONE.marginX && x <= WORLD_WIDTH - DRONE.marginX && y >= DRONE.marginTop && y <= height - DRONE.marginBottom; }

