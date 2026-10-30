import{campaignProgress}from'./campaign-courses.js?v=87308430e0';
import { SETTINGS, CANNONS, ENEMIES, SUPPLIES, WORLD_WIDTH, DRONE, WALL, CAMERA_DEPTH, ACTOR_STYLE, cannonStats, upgradeCost, energyMultiplier, wallYFor, priceBand, validPlacement, validDronePlacement, clamp } from './config.js?v=87308430e0';
import { wallMountDepth } from './fortification.js?v=87308430e0';
import { marketArmy,estimatedArmy } from './market-army.js?v=87308430e0';
import {playerLevelFor,towerSlots,wallLevelFor,wallPower,money,WALL_MAX_XP} from './progression.js?v=87308430e0';
import{TerrainField}from'./terrain.js?v=87308430e0';
const WALL_SLOT=8;
import{isAIStock}from'./symbols.js?v=87308430e0';
import {weaponMuzzle} from './weapon-geometry.js?v=87308430e0';
export class Game {
  constructor(state, { height = 620, random = Math.random,now=Date.now,rewardMultiplier=1 } = {}) {
    this.campaign=campaignProgress(state.campaign);this.rewardMultiplier=clamp(rewardMultiplier,0,1);this.now=now;this.random = random; this.height = height; this.gold = state.gold; this.settings = { ...state.settings };
    this.cannons = state.cannons.map(c => ({ ...c, ...(c.type === 'drone' ? { y: clamp(Number.isFinite(c.yRatio) ? c.yRatio * height : c.y ?? height * .35, DRONE.marginTop, height - DRONE.marginBottom) } : {}), cooldown: .2, recoil: 0, angle: -Math.PI / 2, targetId: null, targetLock: 0 }));
    this.playerXP=Math.max(0,state.playerXP||0);this.wallXP=clamp(state.wallXP??360,0,WALL_MAX_XP);this.wallLevel=wallLevelFor(this.wallXP);this.wallTransition=null;
    this.inventory=[];for(const item of [...(state.inventory||[]),...this.cannons]){if(!CANNONS[item.type])continue;const owned=this.inventory.find(v=>v.type===item.type);if(owned)owned.level=Math.max(owned.level,item.level||1);else this.inventory.push({type:item.type,level:item.level||1});}
    this.enemies = []; this.supplies = []; this.effects = []; this.projectiles = []; this.zones = [];
    this.time = 0; this.wallY = height / 2; this.band = 0; this.targetBand = 0; this.move = null; this.stage = Math.min(7,this.wallLevel-1);
    this.terrain=new TerrainField(height);this.pricePlaced=false;this.market = null; this.selected = null; this.placement = null; this.dirty = false; this.nextId = 1; this.autoTimer = 0; this.messages = []; this.marketWaves=[];
    this.marketGoldRemainder=0;
    this.metrics = { kills: 0, crushedEnemies: 0, crushedSupplies: 0, healed: 0, goldEarned: 0, shots: {}, wallSteps: 0, expired: 0 };
  }
  wallAt(x, y = this.wallY) { return y + Math.sin(x / WORLD_WIDTH * Math.PI * 2 - .4) * 5 + Math.sin(x / WORLD_WIDTH * Math.PI * 4) * 1.5; }
  wallFaceAt(x) { return this.wallAt(x) + WALL.north + wallMountDepth(this.cannons,x)/2; }
  wallBackAt(x) { return this.wallAt(x) + WALL.back - wallMountDepth(this.cannons,x)/2; }
  // Legacy fixture aliases. The game uses uncapped wall XP and levels.
  get hp(){return this.wallXP;}set hp(value){this.wallXP=Math.max(0,value);}
  get maxHP(){return SETTINGS.maxHP;}
  get playerLevel(){return playerLevelFor(this.playerXP);}
  get slotLimit(){return towerSlots(this.playerLevel);}
  get power(){return wallPower(this.wallLevel);}
  get marketCode(){return this.market?.market||this.settings.market||'US';}
  cash(value){return money(value,this.marketCode);}
  owned(type){return this.inventory.find(c=>c.type===type)||this.cannons.find(c=>c.type===type);}
  gainPlayerXP(amount){const before=this.playerLevel,slots=this.slotLimit;this.playerXP+=amount;this.dirty=true;if(this.playerLevel>before){this.effect('player-level',216,this.wallY,'#ffe5a2',`${before} → ${this.playerLevel}`,2,{slots:this.slotLimit,unlocked:this.slotLimit>slots});}}
  wallXPLabel(amount,x){if(!amount)return;const lane=Math.floor(x/25),same=this.effects.find(f=>f.type==='wall-xp'&&f.lane===lane&&Math.sign(f.amount)===Math.sign(amount)&&f.life>.55);if(same){same.amount+=amount;same.life=.9;}else this.effect('wall-xp',x,this.wallBackAt(x),'',amount,.9,{sourceAltitude:WALL.elevation+8,lane});}
  addWallXP(amount,x=216){const before=this.wallXP;this.wallXP=clamp(this.wallXP+amount,0,WALL_MAX_XP);const delta=this.wallXP-before;this.wallXPLabel(delta,x);this.dirty=true;return delta;}
  updateWallLevel(dt){const desired=wallLevelFor(this.wallXP);if(!this.wallTransition&&desired!==this.wallLevel)this.wallTransition={from:this.wallLevel,to:desired,elapsed:0,duration:desired>this.wallLevel?1.8:.75};const f=this.wallTransition;if(!f)return;f.elapsed+=dt;f.to=desired;if(f.elapsed>=f.duration){const before=this.wallLevel;this.wallLevel=desired;this.stage=Math.min(7,desired-1);this.wallTransition=null;if(desired!==before)this.notify(`장벽 Lv.${before} → Lv.${desired}`);}}
  // Billboards must stop at the VISIBLE north silhouette, not the facade's
  // ground baseline. Otherwise small enemies appear inside/below the wall.
  wallAttackAt(x) { return this.wallBackAt(x) - WALL.elevation / CAMERA_DEPTH; }
  enemyStopAt(e) { return this.wallAttackAt(e.x) - e.radius; }
  // Wall-front occupancy in 8px buckets. Approaching enemies reserve the least crowded
  // reachable slot (inside the painted corridor at wall depth) so attacks spread along the wall.
  wallLoad() { const load = new Float32Array(Math.ceil(WORLD_WIDTH / WALL_SLOT)); for (const e of this.enemies) if (e.alive && Number.isFinite(e.wallSlot)) load[clamp(Math.floor(e.wallSlot / WALL_SLOT), 0, load.length - 1)] += e.radius * 2; return load; }
  assignWallSlot(e, stop, load) {
    const b = this.terrain.bounds(stop + e.radius, e.x, e.radius), cur = clamp(Math.floor(e.x / WALL_SLOT), 0, load.length - 1);
    if (e.y >= stop - 4) { e.wallSlot = clamp(e.x, b.left, b.right); load[cur] += e.radius * 2; return; }
    const lo = Math.max(0, Math.ceil(b.left / WALL_SLOT), cur - 12), hi = Math.min(load.length - 1, Math.floor(b.right / WALL_SLOT) - 1, cur + 12);
    let best = clamp(cur, lo, hi), score = Infinity;
    for (let i = lo; i <= hi; i++) { const v = load[i] + Math.abs(i - cur) * 1.2 + this.random() * .5; if (v < score) { score = v; best = i; } }
    e.wallSlot = clamp((best + .2 + this.random() * .6) * WALL_SLOT, b.left, b.right); load[best] += e.radius * 2;
  }
  resize(height) { const ratio = height / this.height; this.wallY *= ratio; if (this.move) { this.move.from *= ratio; this.move.to *= ratio; } this.enemies.forEach(e => e.y *= ratio); this.supplies.forEach(e => e.y *= ratio); this.zones.forEach(e => e.y *= ratio); this.cannons.filter(c => c.type === 'drone').forEach(c => c.y = clamp(c.y * ratio, DRONE.marginTop, height - DRONE.marginBottom)); this.height = height;this.terrain=new TerrainField(height); }
  cannonPosition(c) { return { x: c.x, y: c.type === 'drone' ? c.y : this.wallAt(c.x) + WALL.deck + WALL.mountOffset }; }
  notify(text) { this.messages.push({ text, until: this.time + 3 }); }
  resetMarket(){this.market=null;this.marketWaves=[];this.enemies=[];this.supplies=[];this.effects=[];this.projectiles=[];this.zones=[];this.pricePlaced=false;this.move=null;this.band=0;this.targetBand=0;this.wallY=this.height/2;}
  onMarket(snapshot) {
    // Keep already received finite waves through a temporary provider failure.
    if(snapshot.priceStatus==='connection_required'&&snapshot.volumeStatus==='connection_required')this.marketWaves=[];
    this.market = snapshot;
    if(Number.isFinite(snapshot.changePct)){this.targetBand=priceBand(snapshot.changePct);if(!this.pricePlaced){this.pricePlaced=true;this.band=this.targetBand;this.wallY=wallYFor(this.band,this.height);this.move=null;}}
    if(snapshot.tradeClassification==='estimated-candle-flow'){const epoch=this.now();this.marketWaves=this.marketWaves.filter(w=>!w.expiresAt||w.expiresAt>epoch);for(const event of snapshot.barEvents||[snapshot.barEvent]){if(!event)continue;this.marketWaves.push(...estimatedArmy(event,this.time,epoch));}this.marketWaves.sort((a,b)=>a.at-b.at);this.marketWaves=this.marketWaves.slice(-SETTINGS.swarmMinuteCap*2);return;}
    if(snapshot.tradeClassification==='minute-candle-direction'){
      const events=snapshot.barEvents||[snapshot.barEvent];let start=Math.max(this.time,(this.marketWaves.at(-1)?.at??this.time-1)+1);for(const event of events){if(!event)continue;const waves=marketArmy(event,start);this.marketWaves.push(...waves);if(waves.length)start+=60;}this.marketWaves.sort((a,b)=>a.at-b.at);this.marketWaves=this.marketWaves.slice(-SETTINGS.swarmMinuteCap*3);return;
    }
    if(!Number.isFinite(snapshot.changePct))return; const avg = snapshot.averageVolumePerSecond;
    if (!(avg > 0)) return;
    for (const [value, side] of [[snapshot.sellVolume, 'sell'], [snapshot.buyVolume, 'buy']]) {
      if (!Number.isFinite(value) || value <= 0) continue;
      const strength = clamp(value / avg, 0, 12), count = Math.min(5, Math.floor(strength * .8) + (this.random() < Math.min(.95, strength * .65) ? 1 : 0));
      for (let i = 0; i < count; i++) {
        if (side === 'sell') { const r = this.random(); this.spawnEnemy(strength > 4 && r < .16 ? 3 : strength > 2.5 && r < .46 ? 2 : strength > 1.1 && r < .65 ? 1 : 0); }
        else this.spawnSupply(strength > 3 ? Math.floor(this.random() * 6) : [0, 1, 3, 4][Math.floor(this.random() * 4)]);
      }
    }
  }
  spawnEnemy(kind = 0, x = 24 + this.random() * (WORLD_WIDTH - 48), y = -30,{marketWeight=1}={}) {
    if (this.enemies.length >= SETTINGS.enemyCap) return null;
    const c = ENEMIES[kind],radius=c.radius*ACTOR_STYLE.footprintScale,e = { id: this.nextId++, kind, x: clamp(x, radius, WORLD_WIDTH - radius), y, hp: c.hp*marketWeight, maxHP: c.hp*marketWeight,marketWeight, radius, alive: true, age: 0, contact: 0, attack: .6, attackPulse: 0, hit: 0, slowUntil: 0, slow: 0, poisons: [], phase: this.random() * 6, attacking: false };
    this.terrain.projectSpawn(e);this.enemies.push(e); return e;
  }
  spawnSupply(kind = 0, x = 24 + this.random() * (WORLD_WIDTH - 48), y = this.height + 25,{marketWeight=1}={}) {
    if (this.supplies.length >= SETTINGS.supplyCap) return null;
    const c = SUPPLIES[kind],radius=c.radius*ACTOR_STYLE.footprintScale,e = { id: this.nextId++, kind, x: clamp(x, radius, WORLD_WIDTH - radius), y, radius,marketWeight, alive: true, age: 0, phase: this.random() * 6 };
    e.art=isAIStock(this.market?.symbol||this.settings.symbol||'SOXL')?'semiconductor':'candle';this.terrain.projectSpawn(e);this.supplies.push(e); return e;
  }
  effect(type, x, y, color, amount = '', duration = .55, extra = {}) {
    if (this.effects.length >= SETTINGS.effectCap) this.effects.shift();
    this.effects.push({ type, x, y, color, amount, life: duration, maxLife: duration, ...extra });
  }
  burst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) { const a = this.random() * Math.PI * 2, s = 20 + this.random() * 65; this.effect('particle', x, y, color, '', .35 + this.random() * .4, { vx: Math.cos(a) * s, vy: Math.sin(a) * s }); }
  }
  remove(entity, reason) {
    if (!entity.alive) return; entity.alive = false;
    const enemy = entity.maxHP !== undefined;
    if (reason === 'cannon' && enemy) { const weight=entity.marketWeight??1,reward=this.creditMarketGold(ENEMIES[entity.kind].reward*weight);this.metrics.kills++;this.gainPlayerXP([1,2,3,5][entity.kind]*weight*this.rewardMultiplier);this.dirty=true;if(reward)this.effect('text',entity.x,entity.y-15,'#ffdc8c',`+${this.cash(reward)}`,.65); }
    if (reason === 'crush') { this.metrics[enemy ? 'crushedEnemies' : 'crushedSupplies']++; this.effect('crush', entity.x, entity.y, enemy ? '#ff6876' : '#54efbc', '', .5); }
    if (reason === 'expire') { this.metrics.expired++; this.effect('ghost', entity.x, entity.y, enemy ? '#ff6876' : '#54efbc', '', .6, { radius: entity.radius }); }
    else this.burst(entity.x, entity.y, enemy ? '#ff6876' : '#54efbc', reason === 'cannon' ? 5 : 3);
  }
  // All damage, including poison ticks and wall hits, is resolved here.
  damage(target, base, { source = 'cannon', cannonType = null, scaled = false } = {}) {
    if (!(base >= 0)) return 0;
    if (target === 'wall') return -this.addWallXP(-base);
    if (!target?.alive) return 0;
    const value = base * (scaled ? 1 : this.power);
    target.hp -= value; target.hit = .14;
    if (target.hp <= 0) this.remove(target, source);
    return value;
  }
  heal(amount,x=216) { this.metrics.healed += this.addWallXP(amount,x); }
  creditMarketGold(amount){const total=this.marketGoldRemainder+amount*this.rewardMultiplier,whole=Math.floor(total+1e-9);this.marketGoldRemainder=Math.max(0,total-whole);this.gold+=whole;this.metrics.goldEarned+=whole;if(whole)this.dirty=true;return whole;}
  deliverSupply(s){const weight=s.marketWeight??1,amount=SUPPLIES[s.kind].heal*weight;if(this.wallXP>=WALL_MAX_XP){const reward=this.creditMarketGold(Math.max(4,Math.round(SUPPLIES[s.kind].heal*.35))*weight);if(!reward)return;const lane=Math.floor(s.x/30),f=this.effects.find(v=>v.type==='wall-gold'&&v.lane===lane&&v.life>.5);if(f){f.amount+=reward;f.life=.9;}else this.effect('wall-gold',s.x,this.wallAt(s.x),'#ffe5a2',reward,.9,{lane,sourceAltitude:WALL.elevation+10});}else this.heal(amount,s.x);}
  buyTower(type){if(!CANNONS[type]||this.owned(type)||this.gold<CANNONS[type].cost)return false;this.gold-=CANNONS[type].cost;this.inventory.push({type,level:1});this.dirty=true;return true;}
  beginPlacement(type){if(!this.owned(type)||this.cannons.some(c=>c.type===type)||this.cannons.length>=this.slotLimit)return false;this.placement=type;return true;}
  beginPurchase(type) {
    if (!CANNONS[type] || this.owned(type)) return false;
    if(this.cannons.length>=this.slotLimit){this.notify(`유저 Lv.${this.playerLevel} · 설치 ${this.slotLimit}기 제한`);return false;}
    if (this.gold < CANNONS[type].cost) { this.notify('자금이 부족합니다'); return false; }
    this.placement = type; return true;
  }
  place(x, y) {
    const type = this.placement;
    const owned=this.owned(type);if (!type || this.cannons.length>=this.slotLimit || !(type === 'drone' ? validDronePlacement(x, y, this.height) : validPlacement(x, this.cannons)) || (!owned&&this.gold<CANNONS[type].cost) || this.cannons.some(c => c.type === type)) return false;
    if(!owned&&!this.buyTower(type))return false;const c = { type, x, ...(type === 'drone' ? { y } : {}), level: this.owned(type).level, cooldown: .25, recoil: 0, angle: -Math.PI / 2, targetId: null, targetLock: 0 }; this.cannons.push(c); this.placement = null; this.selected = c; this.dirty = true; this.burst(x, type === 'drone' ? y : this.wallAt(x), CANNONS[type].color); return true;
  }
  swapPlan(a,b){
    if(a===b||!this.cannons.includes(a)||!this.cannons.includes(b))return null;
    const remaining=this.cannons.filter(c=>c!==a&&c!==b),ay=b.type==='drone'?b.y:this.wallAt(b.x)+WALL.deck+WALL.mountOffset,by=a.type==='drone'?a.y:this.wallAt(a.x)+WALL.deck+WALL.mountOffset;
    if(!(a.type==='drone'?validDronePlacement(b.x,ay,this.height):validPlacement(b.x,remaining))||!(b.type==='drone'?validDronePlacement(a.x,by,this.height):validPlacement(a.x,remaining)))return null;
    return{ax:b.x,ay,bx:a.x,by};
  }
  swapCannons(a,b){const plan=this.swapPlan(a,b);if(!plan)return false;a.x=plan.ax;b.x=plan.bx;if(a.type==='drone')a.y=plan.ay;if(b.type==='drone')b.y=plan.by;for(const c of[a,b]){c.targetId=null;c.targetLock=0;}this.dirty=true;return true;}
  moveCannon(c,x,y){if(!this.cannons.includes(c))return false;const other=this.cannons.find(t=>t!==c&&(t.type==='drone')===(c.type==='drone')&&Math.abs(t.x-x)<24&&(t.type!=='drone'||Math.abs(t.y-y)<35));if(other)return this.swapCannons(c,other);if(!(c.type==='drone'?validDronePlacement(x,y,this.height):validPlacement(x,this.cannons,c)))return false;c.x=x;if(c.type==='drone'){c.y=y;c.targetId=null;c.targetLock=0;}this.dirty=true;return true;}
  replaceTower(c,type){const owned=this.owned(type);if(!owned||!this.cannons.includes(c)||this.cannons.some(t=>t.type===type))return false;const y=c.type==='drone'?c.y:this.wallAt(c.x)+WALL.deck+WALL.mountOffset;if(type!=='drone'&&!validPlacement(c.x,this.cannons,c))return false;if(type==='drone'&&!validDronePlacement(c.x,y,this.height))return false;Object.assign(c,{type,level:owned.level,cooldown:.25,angle:-Math.PI/2,recoil:0,targetId:null,targetLock:0});if(type==='drone')c.y=y;else delete c.y;this.selected=c;this.dirty=true;return true;}
  storeTower(c){if(!this.cannons.includes(c))return false;this.cannons=this.cannons.filter(v=>v!==c);if(this.selected===c)this.selected=null;this.dirty=true;return true;}
  upgrade(c) {
    const owned=this.owned(c?.type);if(!owned)return false;c=this.cannons.find(v=>v.type===c.type)||owned;if(c.level>=SETTINGS.maxLevel)return false;
    const cost = upgradeCost(c.type, c.level); if (this.gold < cost) return false;
    this.gold -= cost; c.level++;owned.level=c.level; this.dirty = true;if(this.cannons.includes(c))this.burst(c.x,this.cannonPosition(c).y,CANNONS[c.type].color,8);return true;
  }
  attackBuff(c) { return Math.min(SETTINGS.maxBuff, this.cannons.filter(t => t !== c && t.type === 'totem' && (c.type === 'drone' ? Math.hypot(c.x - t.x, c.y - this.cannonPosition(t).y) : Math.abs(c.x - t.x)) <= cannonStats('totem', t.level).range).reduce((n, t) => n + cannonStats('totem', t.level).buff, 0)); }
  wallUpdate(dt) {
    if (!this.move && this.band !== this.targetBand) {
      const next = this.band + Math.sign(this.targetBand - this.band);
      this.move = { from: this.wallY, to: wallYFor(next, this.height), next, elapsed: 0 };
      this.metrics.wallSteps++; const color = next > this.band ? '#54efbc' : '#ff6876';
      this.effect('wave', WORLD_WIDTH / 2, this.wallY, color, '', .65); this.effect('text', WORLD_WIDTH / 2, this.wallY - 58, color, `${next > this.band ? '+' : '−'}1%`, .7);
      this.burst(WORLD_WIDTH / 2, this.wallY, color, 8);
    }
    if (!this.move) return;
    const oldY = this.wallY, m = this.move; m.elapsed += dt; const u = clamp(m.elapsed / SETTINGS.wallMoveSeconds, 0, 1), smooth = u * u * (3 - 2 * u);
    this.wallY = m.from + (m.to - m.from) * smooth;
    // Swept boundary: resolve crush BEFORE AI, healing, poison or firing.
    // Contacting units are crushed as soon as the wall sweeps into their body.
    if (this.wallY < oldY) for (const e of this.enemies) if (e.alive && e.y + e.radius > this.wallAttackAt(e.x)) this.remove(e, 'crush');
    if (this.wallY > oldY) for (const s of this.supplies) if (s.alive && s.y - s.radius < this.wallAt(s.x) + 13) this.remove(s, 'crush');
    if (u >= 1) { this.band = m.next; this.move = null; }
  }
  fire(c,stats,target){
    const pos=this.cannonPosition(c),dx=target.x-pos.x,dy=target.y-pos.y,len=Math.hypot(dx,dy)||1;if(c.type!=='drone')c.angle=Math.atan2(dy,dx);c.recoil=1;this.metrics.shots[c.type]=(this.metrics.shots[c.type]||0)+1;
    const muzzle=weaponMuzzle(this,c),base={x:muzzle.x,y:muzzle.y,sourceAltitude:muzzle.z,tx:target.x,ty:target.y,targetId:target.id,elapsed:0,damage:stats.damage,color:stats.color,stats:{...stats},targetAltitude:8};
    this.effect('muzzle',muzzle.x,muzzle.y,c.type==='machine'?'#ffdf8c':stats.color,'',c.type==='machine'?.065:.12,{sourceAltitude:muzzle.z,weapon:c.type});
    if(c.type==='drone'){this.effect('beam',muzzle.x,muzzle.y,stats.color,'',.12,{tx:target.x,ty:target.y,width:1.1,sourceAltitude:muzzle.z,targetAltitude:8});this.damage(target,stats.damage,{cannonType:'drone'});return;}
    if(c.type==='laser'){
      const ex=pos.x+dx/len*stats.range,ey=pos.y+dy/len*stats.range;this.effect('beam',muzzle.x,muzzle.y,stats.color,'',.20,{tx:ex,ty:ey,width:2.2,sourceAltitude:muzzle.z,targetAltitude:8});
      this.enemies.filter(e=>{const vx=e.x-pos.x,vy=e.y-pos.y,dot=(vx*dx+vy*dy)/len;return e.alive&&dot>=0&&dot<=stats.range&&Math.abs(vx*dy-vy*dx)/len<=e.radius+4;}).sort((a,b)=>Math.hypot(a.x-pos.x,a.y-pos.y)-Math.hypot(b.x-pos.x,b.y-pos.y)).slice(0,stats.pierce).forEach(e=>this.damage(e,stats.damage,{cannonType:'laser'}));return;
    }
    const type={machine:'bullet',sniper:'slug',mortar:'mortar',sticky:'slime',poison:'venom'}[c.type];
    if(type){const burst=type==='bullet'?3:1;for(let i=0;i<burst;i++)this.projectiles.push({...base,type,weapon:c.type,elapsed:-i*.032,damage:stats.damage/burst,duration:type==='mortar'?.62:type==='slime'?.38:type==='venom'?.30:Math.max(.055,Math.min(.24,len/(type==='slug'?2000:1200))),radius:stats.radius});if(this.projectiles.length>450)this.projectiles.splice(0,this.projectiles.length-450);}
  }
  resolveProjectile(p){
    const target=this.enemies.find(e=>e.id===p.targetId&&e.alive),st=p.stats;
    if(p.type==='mortar'||p.type==='slime'){
      this.effect('explosion',p.tx,p.ty,p.color,'',p.type==='mortar'?.45:.32,{radius:p.radius});this.burst(p.tx,p.ty,p.color,p.type==='mortar'?7:3);
      if(p.type==='slime'){this.zones.push({x:p.tx,y:p.ty,radius:p.radius,life:st.duration,slow:st.slow});if(this.zones.length>22)this.zones.shift();}
      this.enemies.forEach(e=>{if(e.alive&&Math.hypot(e.x-p.tx,e.y-p.ty)<=p.radius+e.radius){if(p.type==='slime'){e.slowUntil=this.time+st.duration;e.slow=st.slow;// Slime is a control tool: one splash never removes more than splashCap of an actor's max HP,
// so fractional-weight swarm actors survive long enough for the slow to matter.
this.damage(e,Math.min(p.damage*this.power,e.maxHP*(st.splashCap||1)),{cannonType:p.weapon,scaled:true});return;}this.damage(e,p.damage,{cannonType:p.weapon});}});return;
    }
    if(!target)return;this.damage(target,p.damage,{cannonType:p.weapon});this.effect('bullet-hit',target.x,target.y,p.type==='venom'?'#c093ff':'#ffe4a5','',.16,{sourceAltitude:7,heavy:p.type==='slug'});
    if(p.type==='venom'&&target.alive){if(target.poisons.length>=4)target.poisons.shift();target.poisons.push({until:this.time+st.duration,dps:st.dot});}
  }
  update(dt) {
    dt = Math.min(dt, .05); this.time += dt; this.wallUpdate(dt);
    const epoch=this.now();this.marketWaves=this.marketWaves.filter(w=>{if(w.expiresAt&&epoch>=w.expiresAt)return false;if(w.spawnAt!=null){if(w.spawnAt>epoch)return true;if(epoch-w.spawnAt>2000)return false;}else if(w.at>this.time)return true;if(w.side==='sell')this.spawnEnemy(w.kind,w.x,w.y,{marketWeight:w.weight??1});else this.spawnSupply(w.kind,w.x,w.y,{marketWeight:w.weight??1});return false;});
    this.zones.forEach(z => z.life -= dt); this.zones = this.zones.filter(z => z.life > 0);
    // Spatial crowd lanes avoid quadratic separation and stop dense armies stacking.
    const lanes = new Map(), wallLoad = this.wallLoad();
    for (const e of this.enemies) {
      if (!e.alive) continue; e.age += dt; e.hit = Math.max(0, e.hit - dt); e.attackPulse = Math.max(0, (e.attackPulse || 0) - dt * 5);
      if (e.age >= 35 || e.contact >= 20) { this.remove(e, 'expire'); continue; }
      e.poisons = e.poisons.filter(p => p.until > this.time);
      if (e.poisons.length) this.damage(e, e.poisons.reduce((v,p) => v + p.dps * dt, 0), { cannonType: 'poison' });
      if (!e.alive) continue;
      const def = ENEMIES[e.kind], stop = this.enemyStopAt(e);
      if (!Number.isFinite(e.wallSlot) && stop - e.y < 46) this.assignWallSlot(e, stop, wallLoad);
      const atWall = e.y >= stop - .1, sliding = atWall && Number.isFinite(e.wallSlot) && Math.abs(e.wallSlot - e.x) > 1.5;
      e.attacking = atWall && !sliding;
      if (sliding) {
        // Shuffle along the wall face to the reserved slot, never leaving the corridor.
        const sb = this.terrain.bounds(stop + e.radius, e.x, e.radius), step = def.speed * (e.slowUntil > this.time ? 1 - e.slow : 1) * dt, nx = clamp(e.x + clamp(e.wallSlot - e.x, -step, step), Math.min(e.x, sb.left), Math.max(e.x, sb.right));
        if (Math.abs(nx - e.x) < 1e-4) e.wallSlot = e.x; e.x = nx; e.y = this.enemyStopAt(e);
      }
      else if (e.attacking) { e.y = stop; e.contact += dt; e.attack -= dt; if (e.attack <= 0) { e.attack += def.interval; e.attackPulse = 1; this.addWallXP(-def.damage*(e.marketWeight??1),e.x); this.effect('impact', e.x, this.wallBackAt(e.x), '#ffb582', '', .25, { sourceAltitude: WALL.hitHeight }); } }
      else {
        let factor = e.slowUntil > this.time ? 1 - e.slow : 1;
        for (const z of this.zones) {
          if (Math.hypot(e.x-z.x,e.y-z.y) <= z.radius + e.radius) { factor = Math.min(factor, 1-z.slow); e.slowUntil = Math.max(e.slowUntil,this.time + .1); e.slow = z.slow; }
          else if (e.y < z.y && z.y-e.y < z.radius + e.radius + 34 && Math.abs(e.x-z.x) < z.radius + e.radius) {
            let dir = e.x < z.x ? -1 : 1; const edge = z.x + dir * (z.radius + e.radius + 6);
            if (edge < e.radius + 3 || edge > WORLD_WIDTH - e.radius - 3) dir *= -1;
            const possible = z.x + dir*(z.radius+e.radius+6);
            if (possible >= e.radius && possible <= WORLD_WIDTH-e.radius) e.x = clamp(e.x + dir*def.speed*dt*.8, e.radius, WORLD_WIDTH-e.radius);
          }
        }
        const lane = Math.floor(e.x / 12), prev = lanes.get(lane);
        if (prev && Math.abs(prev.y - e.y) < prev.radius + e.radius + 3) { const dir = e.x <= prev.x ? -1 : 1; e.x = clamp(e.x + dir*13*dt,e.radius,WORLD_WIDTH-e.radius); factor *= .8; }
        lanes.set(lane,e);{const cb=this.terrain.bounds(e.y+e.radius,e.x,e.radius);if(cb.right>cb.left)e.x=clamp(e.x,cb.left,cb.right);}this.terrain.move(e,def.speed*factor*dt,def.speed,dt);e.y=Math.min(this.enemyStopAt(e),e.y);
      }
    }
    for (const s of this.supplies) {
      if (!s.alive) continue; s.age += dt; if (s.age >= 35) { this.remove(s,'expire'); continue; }
      this.terrain.move(s,-SUPPLIES[s.kind].speed*dt,SUPPLIES[s.kind].speed,dt);
      if (s.y-s.radius <= this.wallAt(s.x)+13) { this.deliverSupply(s); this.effect('supply-deliver',s.x,s.y+s.radius,'#bcefb0','',.4,{kind:s.kind,radius:s.radius,art:s.art});this.remove(s,'heal'); }
    }
    this.enemies = this.enemies.filter(e => e.alive); this.supplies = this.supplies.filter(s => s.alive);
    for (const c of this.cannons) {
      c.recoil = Math.max(0,c.recoil-dt*6); if (c.type === 'totem') continue;
      if (c.type === 'drone') { this.updateDrone(c, dt); continue; }
      c.cooldown -= dt; if (c.cooldown > 0) continue;
      const stats = cannonStats(c.type,c.level), y = this.cannonPosition(c).y;
      const targets = this.enemies.filter(e => e.alive && Math.hypot(e.x-c.x,e.y-y) <= stats.range && e.y < this.wallAt(e.x));
      targets.sort(c.type === 'sniper' ? (a,b) => b.hp-a.hp : (a,b) => Math.hypot(a.x-c.x,a.y-y)-Math.hypot(b.x-c.x,b.y-y));
      if (!targets.length) { c.cooldown = .06; continue; }
      this.fire(c,stats,targets[0]); c.cooldown = 1/(stats.rate*(1+this.attackBuff(c)));
    }
    for(const p of this.projectiles){p.elapsed+=dt;if(p.elapsed>=p.duration)this.resolveProjectile(p);}
    this.projectiles=this.projectiles.filter(p=>p.elapsed<p.duration);
    for (const f of this.effects) { f.life -= dt; if (f.type === 'particle') { f.x += f.vx*dt; f.y += f.vy*dt; f.vy += 90*dt; } }
    this.effects = this.effects.filter(f => f.life>0); this.messages = this.messages.filter(m=>m.until>this.time);
    this.updateWallLevel(dt);
    this.autoTimer += dt;
    if (this.settings.autoUpgrade && this.autoTimer >= 1) { this.autoTimer = 0; const list = this.cannons.filter(c=>c.level<40).sort((a,b)=>upgradeCost(a.type,a.level)-upgradeCost(b.type,b.level)); const c=list[0]; if (c) this.upgrade(c); }
  }
  updateDrone(c, dt) {
    const stats = cannonStats('drone', c.level), pos = this.cannonPosition(c);
    c.cooldown -= dt;
    const inRange = e => e.alive && Math.hypot(e.x - pos.x, e.y - pos.y) <= stats.range;
    let target = this.enemies.find(e => e.id === c.targetId && inRange(e));
    if (!target) {
      target = this.enemies.filter(inRange).sort((a, b) => Math.hypot(a.x-pos.x,a.y-pos.y)-Math.hypot(b.x-pos.x,b.y-pos.y))[0];
      c.targetId = target?.id ?? null; c.targetLock = target ? stats.targetSwitch : 0;
    }
    if (!target) { c.cooldown = Math.max(0, c.cooldown); return; }
    const desired = Math.atan2(target.y-pos.y,target.x-pos.x), delta = Math.atan2(Math.sin(desired-c.angle),Math.cos(desired-c.angle));
    c.angle += clamp(delta, -dt*(8+c.level*.1), dt*(8+c.level*.1));
    c.targetLock = Math.max(0, c.targetLock-dt);
    if (c.cooldown <= 0 && c.targetLock <= 0) { this.fire(c,stats,target); c.cooldown = 1/(stats.rate*(1+this.attackBuff(c))); }
  }
}

