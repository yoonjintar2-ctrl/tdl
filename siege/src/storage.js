import{campaignProgress}from'./campaign-courses.js?v=19af3ae636';
import{SETTINGS,CANNONS,DRONE,WORLD_WIDTH,validPlacement,snapSlot,clamp}from'./config.js?v=19af3ae636';
import{validSymbol}from'./symbols.js?v=19af3ae636';
import{legacySlotXP,playerLevelFor,towerSlots,WALL_MAX_XP}from'./progression.js?v=19af3ae636';
import{MODE_ORDER,MAX_CARD_LEVEL}from'./cards.js?v=19af3ae636';
export const campaignModes=raw=>({nightmare:campaignProgress(raw?.nightmare),hell:campaignProgress(raw?.hell)});
// Some hosts throw on localStorage access itself (private windows, sandboxed frames).
const memoryStore=new Map();export const memoryStorage={getItem:k=>memoryStore.get(k)??null,setItem:(k,v)=>memoryStore.set(k,String(v)),removeItem:k=>memoryStore.delete(k)};
export function safeStorage(){try{const s=globalThis.localStorage;if(!s)return memoryStorage;return s;}catch{return memoryStorage;}}
export function initialState(){return{version:5,freePack:true,campaignModes:campaignModes(),campaign:campaignProgress(),gold:SETTINGS.initialGold,playerXP:0,wallXP:1500,inventory:[{type:'machine',level:1,xp:0}],cannons:[{type:'machine',level:1,x:138}],settings:{mode:'normal',symbol:'SOXL',marketProvider:'yahoo',autoUpgrade:false,speed:1,scenario:'rise',quality:'auto',sound:false}};}
export function readSave(storage=safeStorage()){try{
 const raw=JSON.parse(storage.getItem(SETTINGS.saveKey));if(!raw||![1,2,3,4,5].includes(raw.version))return initialState();const result=initialState();result.gold=Number.isFinite(raw.gold)?clamp(Math.floor(raw.gold),0,1e10):result.gold;result.playerXP=Number.isFinite(raw.playerXP)?clamp(raw.playerXP,0,1e9):0;result.wallXP=Number.isFinite(raw.wallXP)?clamp(raw.wallXP,0,WALL_MAX_XP):1500;result.inventory=[];result.cannons=[];
 for(const c of [...(Array.isArray(raw.inventory)?raw.inventory:[]),...(Array.isArray(raw.cannons)?raw.cannons:[])]){if(!CANNONS[c.type])continue;const level=clamp(Math.floor(Number(c.level)||1),1,MAX_CARD_LEVEL),xp=clamp(Math.floor(Number(c.xp??(Number(c.copies)||0)*10)||0),0,1e6),item=result.inventory.find(v=>v.type===c.type);if(item){if(level>item.level){item.level=level;item.xp=xp;}}else result.inventory.push({type:c.type,level,xp});}
 for(const c of Array.isArray(raw.cannons)?raw.cannons:[]){if(!CANNONS[c.type]||result.cannons.some(v=>v.type===c.type))continue;const level=result.inventory.find(v=>v.type===c.type).level;if(c.type==='drone'){result.cannons.push({type:c.type,x:clamp(Number.isFinite(c.x)?c.x:216,DRONE.marginX,WORLD_WIDTH-DRONE.marginX),yRatio:clamp(Number.isFinite(c.yRatio)?c.yRatio:.35,.05,.95),level});continue;}let x=Number(c.x);if(!validPlacement(x,result.cannons))x=snapSlot(Number.isFinite(x)?x:216,result.cannons,null,0,c.type)??undefined;if(x!==undefined)result.cannons.push({type:c.type,x,level});}
 if(raw.version<3)result.playerXP=Math.max(result.playerXP,legacySlotXP(result.cannons.length));{const d=result.cannons.filter(c=>c.type==='drone').slice(0,1);result.cannons=[...result.cannons.filter(c=>c.type!=='drone').slice(0,6),...d];/* v79: 5 + rear support slot */}
 result.playerName=typeof raw.playerName==='string'?raw.playerName.replace(/[<>]/g,'').trim().slice(0,12):'';result.lifetimeKills=Number.isFinite(raw.lifetimeKills)?clamp(Math.floor(raw.lifetimeKills),0,1e12):0;result.wallInvest=Number.isFinite(raw.wallInvest)?clamp(Math.floor(raw.wallInvest),0,20):0;result.grantsApplied=Array.isArray(raw.grantsApplied)?raw.grantsApplied.filter(x=>typeof x==='string').slice(-50):[];result.campaign=campaignProgress(raw.campaign);result.campaignModes=campaignModes(raw.campaignModes);result.freePack=raw.version<5?true:raw.freePack===true;const s=raw.settings||{};result.settings={...result.settings,mode:MODE_ORDER.includes(s.mode)?s.mode:'normal',symbol:validSymbol(s.symbol)?s.symbol:'SOXL',marketProvider:s.marketProvider==='alpaca'?'alpaca':'yahoo',autoUpgrade:s.autoUpgrade===true,speed:[1,2,5].includes(s.speed)?s.speed:1,scenario:['rise','fall','flat','sell','buy','pump','rebound'].includes(s.scenario)?s.scenario:'rise',quality:['auto','low','high'].includes(s.quality)?s.quality:'auto',sound:s.sound===true};return result;
 }catch{return initialState();}}
export function snapshotGame(game){const inventory=new Map(game.inventory.map(c=>[c.type,{type:c.type,level:c.level,xp:c.xp||0}]));for(const c of game.cannons){const prev=inventory.get(c.type);if(!prev||c.level>prev.level)inventory.set(c.type,{type:c.type,level:c.level,xp:prev&&prev.level===c.level?prev.xp:0});}return{version:5,playerName:game.playerName||'',lifetimeKills:Math.floor(game.lifetimeKills||0),grantsApplied:(game.grantsApplied||[]).slice(-50),wallInvest:game.wallInvest||0,freePack:game.freePack===true,campaignModes:campaignModes(game.campaignModes),gold:Math.floor(game.gold),playerXP:game.playerXP,wallXP:game.wallXP,campaign:campaignProgress(game.campaign),inventory:[...inventory.values()],cannons:game.cannons.map(({type,x,y,level})=>({type,x,level,...(type==='drone'?{yRatio:y/game.height}:{})})),settings:{...game.settings}};}
export function writeSave(game,storage=safeStorage()){try{storage.setItem(SETTINGS.saveKey,JSON.stringify({...snapshotGame(game),savedAt:Date.now()}));return true;}catch{return false;}}
export function readRawSave(storage=safeStorage()){try{return JSON.parse(storage.getItem(SETTINGS.saveKey));}catch{return null;}}
export function writeRawSave(data,storage=safeStorage()){try{storage.setItem(SETTINGS.saveKey,JSON.stringify(data));return true;}catch{return false;}}
// v79: never lose progress on login — merge saves field by field instead of "one whole save wins".
// Progress (player XP, card levels, mission clears, kills, wall investment) takes the max of every copy;
// spendable / situational state (gold, layout, settings) comes from the most recently saved copy,
// unless that copy looks like a fresh reset (then the richer gold is kept).
export function mergeSaves(...saves){
 const list=saves.filter(s=>s&&typeof s==='object'&&Array.isArray(s.inventory));if(!list.length)return null;if(list.length===1)return list[0];
 const newest=list.slice().sort((a,b)=>(b.savedAt||0)-(a.savedAt||0))[0],maxXP=Math.max(...list.map(s=>s.playerXP||0));
 const inv=new Map();for(const s of list)for(const c of s.inventory||[]){if(!c||!CANNONS[c.type])continue;const p=inv.get(c.type);if(!p||c.level>p.level||(c.level===p.level&&(c.xp||0)>(p.xp||0)))inv.set(c.type,{type:c.type,level:c.level||1,xp:c.xp||0});}
 const camp=k=>{const cs=list.map(s=>k?campaignProgress(s.campaignModes?.[k]):campaignProgress(s.campaign));return{cleared:Math.max(...cs.map(c=>c.cleared)),settled:[...new Set(cs.flatMap(c=>c.settled))].slice(-64)};};
 const reset=(newest.playerXP||0)<maxXP*.5;
 return{...newest,version:5,playerXP:maxXP,lifetimeKills:Math.max(...list.map(s=>s.lifetimeKills||0)),wallInvest:Math.max(...list.map(s=>s.wallInvest||0)),
  inventory:[...inv.values()],cannons:(newest.cannons||[]).map(c=>({...c,level:inv.get(c.type)?.level||c.level})),
  campaign:camp(null),campaignModes:{nightmare:camp('nightmare'),hell:camp('hell')},
  gold:reset?Math.max(...list.map(s=>s.gold||0)):(newest.gold||0),freePack:list.every(s=>s.freePack===true),
  grantsApplied:[...new Set(list.flatMap(s=>Array.isArray(s.grantsApplied)?s.grantsApplied:[]))].slice(-50),
  playerName:newest.playerName||list.map(s=>s.playerName).find(Boolean)||'',savedAt:Date.now()};
}
export const coreOf=s=>s?JSON.stringify([Math.floor(s.playerXP||0),Math.floor(s.lifetimeKills||0),s.wallInvest||0,(s.inventory||[]).map(c=>c.type+c.level+':'+(c.xp||0)).sort(),campaignProgress(s.campaign).cleared,campaignProgress(s.campaignModes?.nightmare).cleared,campaignProgress(s.campaignModes?.hell).cleared,Math.floor(s.gold||0),(s.grantsApplied||[]).length]):'';
