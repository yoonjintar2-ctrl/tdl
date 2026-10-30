import {CANNONS,ENEMIES,SUPPLIES,WALL,WORLD_WIDTH,ACTOR_STYLE} from './config.js?v=7b6759f665';
export const ENEMY_ART=['enemy-small','enemy-tall','enemy-fat','enemy-giant'];
// Kind 4 (초미니 음봉) reuses the small candle art at a much smaller size.
const ENEMY_KIND_ART=[...ENEMY_ART,'enemy-small'];
export const SUPPLY_ART=['supply-dram','supply-processor','supply-wafer','supply-optical','supply-connector','supply-substrate'];
// Wall levels 1–10: two new shabby tiers (earth, wooden palisade) below the original eight.
export const WALL_ART=['castle-wall-low-0','castle-wall-low-1',...Array.from({length:8},(_,i)=>'castle-wall-'+i)];
export const BASTION_ART=['castle-bastion-low-0','castle-bastion-low-1',...Array.from({length:8},(_,i)=>'castle-bastion-'+i)];
export const TOWER_ART=['machine','sniper','laser','totem','sticky','poison','drone'];
const pictures=new Map(),unitSprites=new Map();let metadata={},pending=null;
const NAMES={'machine':'기관총','mortar':'박격포','sniper':'저격포','laser':'레이저','totem':'토템','sticky':'끈적이포','poison':'독 캐논','drone':'드론','enemy-small':'작은 음봉','enemy-tall':'키 큰 음봉','enemy-fat':'돼지 음봉','enemy-giant':'거인 음봉','supply-dram':'DRAM','supply-processor':'프로세서','supply-wafer':'실리콘 웨이퍼','supply-optical':'광통신 모듈','supply-connector':'광섬유 커넥터','supply-substrate':'반도체 기판','wall-soil':'흙 성벽','wall-wood':'나무 성벽','wall-reinforced-wood':'강화 나무 성벽','wall-mixed':'나무·돌 성벽','wall-stone':'돌 성벽','wall-reinforced-stone':'강화 돌 성벽','wall-iron':'철·돌 성벽','wall-gold':'황금 성벽'};
export const CLAY_CATALOG=[...TOWER_ART.map(key=>({key,name:NAMES[key],group:'tower'})),...ENEMY_ART.map(key=>({key,name:NAMES[key],group:'enemy'})),...SUPPLY_ART.map(key=>({key,name:NAMES[key],group:'supply'})),...WALL_ART.map((key,i)=>({key,name:['흙 토성','나무 목책','사암 성벽','이끼 낀 성벽','풍화석 성벽','목석 성벽','석회암 성벽','강화 화강암 성벽','철띠 성벽','황금 성벽'][i],group:'wall'})),...BASTION_ART.map((key,i)=>({key,name:'원형 보루 '+(i+1),group:'wall'})),{key:'bull-candle',name:'녹색 양봉',group:'supply'}];
export async function loadClayCollection(onProgress=()=>{}){
 if(typeof Image==='undefined')return false;if(pending)return pending;
 pending=(async()=>{try{const response=await fetch(new URL('../assets/clay/frames-v3.json',import.meta.url),{cache:'no-cache'});if(!response.ok)throw Error('Missing sprite metadata');metadata=await response.json();}catch{onProgress(0,CLAY_CATALOG.length,'metadata');return false;}
 let next=0,done=0,ok=true;const worker=async()=>{while(next<CLAY_CATALOG.length){const item=CLAY_CATALOG[next++];if(!pictures.has(item.key)){const image=new Image();image.decoding='async';image.src=new URL(`../assets/clay/${metadata[item.key]?.file||item.key+'-clay-v1.webp'}`,import.meta.url).href;try{await image.decode();if(!metadata[item.key]?.frames?.length)throw Error('Missing frames');pictures.set(item.key,image);}catch{ok=false;}}done++;onProgress(done,CLAY_CATALOG.length,ok?null:item.key);}};
 await Promise.all(Array.from({length:4},worker));return ok;})();const ok=await pending;if(!ok)pending=null;return ok;
}
export function clayReady(key){return pictures.has(key)&&!!metadata[key];}
export function frameForAngle(angle){return ((Math.round((angle+Math.PI/2)/(Math.PI/2))%4)+4)%4;}
function info(key,frame=0){const entry=metadata[key],image=pictures.get(key);if(!entry||!image)return null;return{entry,image,frame:entry.frames[((frame%entry.frames.length)+entry.frames.length)%entry.frames.length]};}
function sprite(c,key,frame,x,y,size){const data=info(key,frame);if(!data)return false;const f=data.frame,k=size/f.cellW;c.drawImage(data.image,f.x,f.y,f.w,f.h,x+(f.x-f.anchorX)*k,y+(f.y-f.anchorY)*k,f.w*k,f.h*k);return true;}
// Cache tiny actor frames at phone display resolution. Hundreds of actors must
// not each resample a large atlas rectangle every animation frame.
function unitSprite(c,key,frame,x,y,size){const data=info(key,frame);if(!data)return false;const f=data.frame,k=size/f.cellW,id=key+':'+frame+':'+size;let cached=unitSprites.get(id);if(!cached){const bitmap=document.createElement('canvas'),w=f.w*k,h=f.h*k;bitmap.width=Math.ceil(w*3);bitmap.height=Math.ceil(h*3);const ctx=bitmap.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(data.image,f.x,f.y,f.w,f.h,0,0,bitmap.width,bitmap.height);cached={bitmap,w,h};unitSprites.set(id,cached);}c.drawImage(cached.bitmap,x+(f.x-f.anchorX)*k,y+(f.y-f.anchorY)*k,cached.w,cached.h);return true;}
function halo(c,x,y,r,color){c.save();c.strokeStyle=color;c.lineWidth=1.2;c.beginPath();c.ellipse(x,y,r,r*.3,0,0,Math.PI*2);c.stroke();c.restore();}
function levelLabel(c,u,x,y){const tier=Math.min(8,Math.floor(u.level/5));c.fillStyle='#203c33ed';c.beginPath();c.roundRect(x-13,y+6,26,11,4);c.fill();c.strokeStyle=u.level>=40?'#f4d38b':'#adbf94';c.lineWidth=1;c.stroke();c.fillStyle='#f4edcc';c.textAlign='center';c.textBaseline='middle';c.font='700 7px system-ui';c.fillText(`Lv.${u.level}`,x,y+12);if(tier){for(let i=0;i<tier;i++){c.beginPath();c.arc(x-(tier-1)*2+i*4,y+4,1.1,0,Math.PI*2);c.fillStyle='#f0ce83';c.fill();}}}
export function drawClayTower(c,u,x,y,t=0,power=1,selected=false,icon=false){
 if(!clayReady(u.type))return false;const air=u.type==='drone',size=air?(icon?70:70*ACTOR_STYLE.droneScale):icon?78:78*WALL.cannonScale;
 c.save();if(selected&&!icon)halo(c,x,y+(air?36:-4),air?22:18,'#dcf6a0');
 if(!air&&!icon){c.fillStyle='#142f2b38';c.beginPath();c.ellipse(x,y-4,16,3,0,0,Math.PI*2);c.fill();}
 if(!icon&&air){c.save();c.globalAlpha=.2;c.fillStyle='#173b32';c.beginPath();c.ellipse(x+2,y+40,16,4,0,0,Math.PI*2);c.fill();c.restore();y+=Math.sin(t*3.1)*2;}
 if(power<.4&&!icon)c.filter='saturate(.6) brightness(.78)';
 sprite(c,u.type,frameForAngle(u.angle??-Math.PI/2),x,y+(u.recoil||0)*2.3,size);c.filter='none';
 if(u.type==='totem'&&!icon){c.save();c.globalAlpha=.1+Math.sin(t*3)*.04;halo(c,x,y-30,21,'#c5f4b9');c.restore();}
 if(u.level>=30&&!icon)halo(c,x,y+1,28+(u.level>=40?3:0),u.level>=40?'#f4dc8c88':'#9edfd944');
 c.restore();return true;
}
export function drawClayUnit(c,e,x,y,t=0,enemy=true,forcedFrame){
 const key=!enemy&&e.art==='candle'?'bull-candle':(enemy?ENEMY_KIND_ART:SUPPLY_ART)[e.kind];if(!clayReady(key))return false;
 const frame=forcedFrame??(enemy&&e.attacking?(e.attackPulse>.2?3:2):Math.floor(t*(enemy?7:9)+(e.phase||0))%(enemy?2:3));
 const size=(enemy?ENEMIES[e.kind].height+28:SUPPLIES[e.kind].radius*2+30)*ACTOR_STYLE.unitScale,bob=enemy&&e.attacking?0:Math.sin(t*8+(e.phase||0))*.5;
 c.save();c.globalAlpha*=Math.max(0,Math.min(1,(e.age??1)*3,(35-(e.age??1))*2,enemy?(20-(e.contact||0))*2:1));
 c.fillStyle='#26382625';c.beginPath();c.ellipse(x+1,y+1,e.radius*.8,2.3,0,0,Math.PI*2);c.fill();
 if(e.hit>0)c.filter='brightness(1.5)';else if(e.poisons?.length)c.filter='hue-rotate(320deg) saturate(.85)';
 // The impact pose anchors the hands to the cap; the wall masks the feet.
 const contactOffset=enemy&&e.attacking&&frame===3?[6,2,2,2,4][e.kind]*ACTOR_STYLE.unitScale:0;
 unitSprite(c,key,frame,x,y+bob+contactOffset,size);c.filter='none';
 if(enemy&&e.showHealth!==false&&(e.hp<e.maxHP||e.kind===3)){
  const f=info(key,frame).frame,top=y+(f.y-f.anchorY)*size/f.cellW-5,w=Math.max(12,ENEMIES[e.kind].width*.8*ACTOR_STYLE.unitScale);c.fillStyle='#3d463add';c.beginPath();c.roundRect(x-w/2-1,top-1,w+2,4,2);c.fill();c.fillStyle='#ed8e76';c.fillRect(x-w/2,top,Math.max(0,w*e.hp/e.maxHP),2);
 }
 c.restore();return true;
}
function texture(c,image,a,b,d,sx,sw,sy=0,sh=image.naturalHeight){
 c.save();c.transform((b.x-a.x)/sw,(b.y-a.y)/sw,(d.x-a.x)/sh,(d.y-a.y)/sh,a.x,a.y);c.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);c.restore();
}
function textureCap(c,image,a,b,ba,bb,sx,sw,sh){
 for(const [points,origin,u,v]of [[[a,b,ba],a,b,ba],[[b,bb,ba],{x:b.x+ba.x-bb.x,y:b.y+ba.y-bb.y},b,ba]]){c.save();c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();texture(c,image,origin,u,v,sx,sw,0,sh);c.restore();}
}
export function wallOutline(c,g,point){c.beginPath();for(let x=-24;x<=WORLD_WIDTH+24;x+=6){const p=point(x,g.wallBackAt(x),WALL.elevation);x===-24?c.moveTo(p.x,p.y):c.lineTo(p.x,p.y);}for(let x=WORLD_WIDTH+24;x>=-24;x-=6){const p=point(x,g.wallFaceAt(x),0);c.lineTo(p.x,p.y);}c.closePath();}
export function drawClayWall(c,g,point,mask=false){
 const data=info(WALL_ART[g.stage]);if(!data)return false;const f=data.frame,image=data.image,tile=96,step=4;
 c.save();c.imageSmoothingEnabled=true;
 if(!mask){c.strokeStyle='#29412b35';c.lineWidth=14;c.beginPath();for(let x=-24;x<=WORLD_WIDTH+24;x+=8){const p=point(x,g.wallAt(x));x===-24?c.moveTo(p.x,p.y):c.lineTo(p.x,p.y);}c.stroke();}
 // The cutout has transparent left/right bevels. Repeating those bevels made
 // full-height gaps through the curtain wall. Build an opaque masonry core
 // from the same clay bitmap before applying the decorative battlement layer.
 c.beginPath();for(let x=-24;x<=WORLD_WIDTH+24;x+=4){const a=point(x,g.wallAt(x)+WALL.back,WALL.elevation),d=point(x,g.wallAt(x)+WALL.north,0),p={x:a.x+(d.x-a.x)*.38,y:a.y+(d.y-a.y)*.38};x===-24?c.moveTo(p.x,p.y):c.lineTo(p.x,p.y);}for(let x=WORLD_WIDTH+24;x>=-24;x-=4){const p=point(x,g.wallAt(x)+WALL.north,0);c.lineTo(p.x,p.y);}c.closePath();c.fillStyle=['#b29266','#89866b','#ae9876','#a28a68','#b9a17a','#8c8c7c','#807565','#c2a05e'][Math.max(0,g.stage-2)];c.fill();
 for(let x=-24;x<WORLD_WIDTH+24;x+=step){
  const a=point(x,g.wallAt(x)+WALL.back,WALL.elevation),b=point(x+step,g.wallAt(x+step)+WALL.back,WALL.elevation),d=point(x,g.wallAt(x)+WALL.north,0),e=point(x+step,g.wallAt(x+step)+WALL.north,0),t=.38,top={x:a.x+(d.x-a.x)*t,y:a.y+(d.y-a.y)*t},next={x:b.x+(e.x-b.x)*t,y:b.y+(e.y-b.y)*t};
  const bodyWidth=f.w*.72,sx=f.x+f.w*.14+((x%tile+tile)%tile)/tile*bodyWidth;
  texture(c,image,top,next,d,sx,step/tile*bodyWidth,f.y+f.h*.38,f.h*.56);
 }
 for(let x=-24;x<WORLD_WIDTH+24;x+=step){const a=point(x,g.wallAt(x)+WALL.back,WALL.elevation),b=point(x+step,g.wallAt(x+step)+WALL.back,WALL.elevation),d=point(x,g.wallAt(x)+WALL.north,0),sx=f.x+((x%tile+tile)%tile)/tile*f.w,sw=step/tile*f.w;texture(c,image,a,b,d,sx,sw,f.y,f.h);}
 const bastion=info(BASTION_ART[g.stage]);if(bastion){const f=bastion.frame;for(const tower of g.cannons.filter(t=>t.type!=='drone').sort((a,b)=>a.x-b.x)){const base=point(tower.x,g.cannonPosition(tower).y,WALL.elevation),height=76,width=height*f.w/f.h;c.drawImage(bastion.image,f.x,f.y,f.w,f.h,base.x-width/2,base.y-height*.26,width,height);}}
 c.restore();return true;
}
export function drawClayPreview(canvas,key,frame=0){const data=info(key,frame);if(!data)return false;const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);const f=data.frame,pad=Math.min(canvas.width,canvas.height)*.07,scale=Math.min((canvas.width-pad*2)/f.w,(canvas.height-pad*2)/f.h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(data.image,f.x,f.y,f.w,f.h,(canvas.width-f.w*scale)/2,(canvas.height-f.h*scale)/2,f.w*scale,f.h*scale);return true;}
export function collectionDiagnostics(){return{loaded:pictures.size,expected:CLAY_CATALOG.length,frames:Object.fromEntries(Object.entries(metadata).map(([key,value])=>[key,value.frames.length]))};}
