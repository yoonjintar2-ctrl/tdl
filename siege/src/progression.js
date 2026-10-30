export const SLOT_LEVELS=[1,1,3,6,10,15,21,28];
export const playerXPAt=level=>{const n=Math.max(0,level-1);return 20*n+5*n*n;};
export function playerLevelFor(xp){return Math.min(99,1+Math.floor((-20+Math.sqrt(400+20*Math.max(0,xp)))/10));}
export const towerSlots=level=>SLOT_LEVELS.filter(n=>n<=level).length;
export const legacySlotXP=count=>playerXPAt(SLOT_LEVELS[Math.max(0,Math.min(7,count-1))]);
export const WALL_MAX_LEVEL=10;
// v20: XP bands widened 2.5x so walls level up more slowly.
export const wallXPAt=level=>{const n=Math.max(0,level-1);return 300*n+75*n*n;};
export const wallLevelFor=xp=>Math.min(WALL_MAX_LEVEL,1+Math.floor((-300+Math.sqrt(90000+300*Math.max(0,xp)))/150+1e-9));
export const WALL_MAX_XP=wallXPAt(WALL_MAX_LEVEL);
export const wallPower=level=>.75+.075*Math.min(20,Math.max(0,level-1));
export function money(value,market='US',price=false){return new Intl.NumberFormat(market==='KR'?'ko-KR':'en-US',{style:'currency',currency:market==='KR'?'KRW':'USD',maximumFractionDigits:market==='KR'?0:price?2:0,minimumFractionDigits:market==='KR'?0:price?2:0}).format(value);}
