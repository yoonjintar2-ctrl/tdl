import { WORLD_WIDTH as W,CANNONS,ENEMIES,SUPPLIES,WALL_STAGES,DRONE,WALL,cannonStats,validPlacement,validDronePlacement,clamp } from './config.js?v=9e634d462c';
import{WALL_MAX_LEVEL,WALL_MAX_XP}from'./progression.js?v=9e634d462c';
import{isAIStock}from'./symbols.js?v=9e634d462c';
import { QuarterCamera, DEPTH_SCALE, WALL_ELEVATION } from './camera.js?v=9e634d462c';
import { drawClayMortar, drawClayMortarIcon, clayBattlefield } from './clay-assets.js?v=9e634d462c';
import{drawProjectile,drawEffect}from'./combat-fx.js?v=9e634d462c';
import{artCrop}from'./terrain.js?v=9e634d462c';
import { drawClayTower, drawClayUnit, drawClayWall, drawClayPreview, wallOutline, tierOf, tierTint, drawTierBack, drawTierFront } from './clay-runtime.js?v=9e634d462c';
const TAU=Math.PI*2;
function box(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=1;c.strokeStyle=stroke;c.stroke();}}
function line(c,pts,col,w=1){c.beginPath();c.lineWidth=w;c.strokeStyle=col;pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function dot(c,x,y,r,col,stroke){c.beginPath();c.arc(x,y,r,0,TAU);if(col){c.fillStyle=col;c.fill();}if(stroke){c.lineWidth=1;c.strokeStyle=stroke;c.stroke();}}
function text(c,s,x,y,size=10,col='#e7f2d5',align='center'){c.font=`700 ${size}px system-ui`;c.fillStyle=col;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y);}
function shadow(c,x,y,w,h){c.fillStyle='#51462a35';c.beginPath();c.ellipse(x,y,w,h,0,0,TAU);c.fill();}
function metal(c,x,y,w,h,r,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);box(c,x,y,w,h,r,g,'#343b32');}
function polygon(c, points, fill, stroke) { c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=1;c.strokeStyle=stroke;c.stroke();} }
export function drawDrone(c,u,x,y,t=0,power=1,selected=false,icon=false) {
 if(drawClayTower(c,u,x,y,t,power,selected,icon))return;
 const tier=u.level>=40?8:Math.floor(u.level/5),bob=icon?0:Math.sin(t*2.8)*2.2;
 c.save();c.translate(x,y);if(!icon){shadow(c,2,DRONE.altitude+4,17,5);if(selected)dot(c,0,DRONE.altitude+4,21,null,'#b8fa8a');}c.translate(0,bob);
 c.save();c.rotate((u.angle??-Math.PI/2)+Math.PI/2);
 for(const dx of [-1,1])for(const dy of [-1,1]){
  const px=dx*(17+(tier>=2?2:0)),py=dy*12;
  line(c,[[dx*5,dy*4],[px,py]],tier>=3?'#b0bdc3':'#8b9ea2',tier>=3?5:3);
  dot(c,px,py,8+(tier>=1?1:0),'#d4e4da','#677d7c');dot(c,px,py,5,'#647f87');
  c.save();c.translate(px,py);c.scale(1,.55);c.rotate(t*(tier>=6?45:32)+px*.3+py);
  for(let blade=0;blade<(tier>=1?3:2);blade++){c.rotate(TAU/(tier>=1?3:2));box(c,-1,-10-(tier>=6?2:0),2,20+(tier>=6?4:0),1,'#f1fae7b0');}c.restore();dot(c,px,py,2,'#ecfff9');
  if(tier>=4)dot(c,px-dx*2,py,1.6,power<.4?'#ffab76':'#93f8ff');
 }
 metal(c,-11,-13,22,27,7,tier>=3?'#d3e5e9':'#f0f1d5',tier>=2?'#658a9c':'#9eb6b6');
 box(c,-8,-9,16,10,4,power<.4?'#6a6258':'#235263','#a6dae0');dot(c,-3,-5,1.5,'#a8f7ff');dot(c,3,-5,1.5,'#a8f7ff');
 metal(c,-4,-20-(tier>=5?4:0),8,10+(tier>=5?4:0),2,'#91d4e4','#406f86');dot(c,0,-20-(tier>=5?4:0),3,'#baffff');
 if(tier>=1)box(c,-3,7,6,3,1,'#eccd7a');
 if(tier>=2){metal(c,-14,-6,4,19,2,'#c1d6d6','#637c8e');metal(c,10,-6,4,19,2,'#c1d6d6','#637c8e');}
 if(tier>=3)line(c,[[-10,-12],[-5,-16],[5,-16],[10,-12]],'#f2d6a1',2);
 if(tier>=5)for(const p of [-1,1])metal(c,p*13-2,-22,4,16,1,'#a8e6ea','#447189');
 if(tier>=6){dot(c,0,5,5,'#4ab7d2','#d5ffff');line(c,[[-10,13],[0,18],[10,13]],'#b1eeff',2);}
 if(tier>=7){c.globalAlpha=.45+Math.sin(t*6)*.12;dot(c,0,0,31,null,'#a4f2ff');c.globalAlpha=1;}
 if(tier>=8){for(const p of [-1,1])line(c,[[p*14,3],[p*31,-1],[p*27,-14],[p*16,-8]],'#ffe19d',3);dot(c,0,5,7,null,'#ffde7b');}
 if(u.recoil>0&&!icon)dot(c,0,-23-(tier>=5?4:0),3+u.recoil*3,'#e7ffff');
 c.restore();if(!icon){box(c,-16,21,32,12,3,'#28434a','#bbded5');text(c,`L${u.level}`,0,27,8,'#e5fff1');if(power<.4)text(c,'↓',29,3,14,'#a54b33');}c.restore();
}

// Wall-level buff aura: nothing at Lv.1, then a pulsing ring, more rings, rising motes and finally golden flames.
export function buffAura(c,x,y,t,lv,front=false){if(lv<2)return;const k=(lv-1)/7,col=lv>=7?'255,204,90':lv>=5?'140,220,255':'170,240,150';c.save();c.globalCompositeOperation='lighter';
 if(!front){const pulse=.5+.5*Math.sin(t*3.2);const g=c.createRadialGradient(x,y-14,2,x,y-14,26+k*16);g.addColorStop(0,`rgba(${col},${.12+.22*k})`);g.addColorStop(1,`rgba(${col},0)`);c.fillStyle=g;c.beginPath();c.arc(x,y-14,26+k*16,0,Math.PI*2);c.fill();
  const rings=lv>=7?3:lv>=4?2:1;for(let i=0;i<rings;i++){const ph=(t*.7+i/rings)%1;c.beginPath();c.ellipse(x,y-3,15+ph*(10+k*8),5+ph*(3+k*2),0,0,Math.PI*2);c.strokeStyle=`rgba(${col},${(1-ph)*(.35+.4*k)})`;c.lineWidth=1.2+k;c.stroke();}
  c.beginPath();c.ellipse(x,y-3,15+pulse*2,5+pulse*.6,0,0,Math.PI*2);c.strokeStyle=`rgba(${col},${.3+.3*k})`;c.lineWidth=1;c.stroke();}
 else if(lv>=4){const n=Math.round(3+lv*1.6);for(let i=0;i<n;i++){const ph=(t*(.35+.05*(i%3))+i/n)%1,mx=x+Math.sin(i*2.39+t*1.3)*(10+k*6),my=y-6-ph*(34+k*16),a=Math.sin(ph*Math.PI)*(.5+.4*k),r=1+k*1.4*(i%2?1:.6);
  if(lv>=7&&i%2===0){const g=c.createRadialGradient(mx,my,0,mx,my,r*4);g.addColorStop(0,`rgba(255,240,200,${a})`);g.addColorStop(.4,`rgba(255,170,60,${a*.6})`);g.addColorStop(1,'rgba(255,120,30,0)');c.fillStyle=g;c.beginPath();c.arc(mx,my,r*4,0,Math.PI*2);c.fill();}
  else{c.fillStyle=`rgba(${col},${a})`;c.beginPath();c.arc(mx,my,r,0,Math.PI*2);c.fill();}
  if(lv>=8&&ph>.45&&ph<.5){c.strokeStyle=`rgba(255,250,230,${a})`;c.lineWidth=.8;c.beginPath();c.moveTo(mx-5,my);c.lineTo(mx+5,my);c.moveTo(mx,my-5);c.lineTo(mx,my+5);c.stroke();}}}
 c.restore();}
export function drawCannon(c,u,x,y,t=0,power=1,selected=false,icon=false){
 if(u.type==='mortar'&&drawClayMortar(c,u,x,y,power,selected,icon))return;
 if(drawClayTower(c,u,x,y,t,power,selected,icon))return;
 if(u.type==='drone'){drawDrone(c,u,x,y,t,power,selected,icon);return;}
 const d=CANNONS[u.type],tier=u.level>=40?8:Math.floor(u.level/5),col=d.color;
 c.save();c.translate(x,y);c.lineCap='round';shadow(c,1,13,24,8);
 if(selected)dot(c,0,7,27,'#c3ff7c35','#a1fa6c');
 metal(c,-21,0,42,18,7,'#d0aa66','#735b36');box(c,-23,10,46,6,3,'#756247','#3f4339');
 for(let i=-15;i<20;i+=10)box(c,i,12,4,3,1,'#aa8c5d');
 dot(c,0,2,16,'#454a43','#d1b379');dot(c,0,0,12,'#6b7266','#242e28');
 if(u.type==='totem'){
  metal(c,-10,-29,20,33,5,'#91e856','#2f733e');for(let i=0;i<3;i++)box(c,-13,-21+i*9,26,4,2,'#c8e9a3','#617348');
  dot(c,0,-34,12,'#63ca54','#c2f79d');box(c,-3,-42,6,16,1,'#eeffd7');box(c,-8,-37,16,6,1,'#eeffd7');
  if(tier>=1)dot(c,0,-7,3,'#ffd372');if(tier>=2){metal(c,-19,-13,7,25,2,'#bccda3','#677b55');metal(c,12,-13,7,25,2,'#bccda3','#677b55');}if(tier>=3)line(c,[[-16,-9],[-17,-24],[17,-24],[16,-9]],'#e3cc88',3);if(tier>=4){dot(c,-17,-10,2,'#c6ff93');dot(c,17,-10,2,'#c6ff93');}if(tier>=5){line(c,[[-20,-10],[-24,-32],[-15,-43]],'#b8ed96',4);line(c,[[20,-10],[24,-32],[15,-43]],'#b8ed96',4);}if(tier>=6){dot(c,0,-34,17,null,'#f0f6bd');}if(tier>=8){for(const p of [-1,1])line(c,[[p*12,-20],[p*25,-36],[p*21,-47],[p*14,-36]],'#ffe299',3);}if(!icon){c.globalAlpha=.18+Math.sin(t*4)*.08;dot(c,0,-34,18+(tier>=7?5:0),null,'#c6ff7a');c.globalAlpha=1;}
 }else{
  c.save();c.translate(0,-6);c.rotate((icon?-Math.PI/2:u.angle??-Math.PI/2)+Math.PI/2);c.translate(0,(u.recoil||0)*4);
  if(u.type==='machine'){
   metal(c,-9,-21,18,26,5,'#b5bcb2','#434c4e');for(const q of [-5,0,5]){metal(c,q-2,-37-tier,4,25,1,'#b8bbb0','#414849');box(c,q-2,-39-tier,4,5,1,'#263235');}
   box(c,10,-12,7,17,2,'#c89a46','#514733');for(let j=0;j<4;j++)line(c,[[10,-9+j*4],[16,-9+j*4]],'#f3ce79',2);
  }else if(u.type==='mortar'){
   metal(c,-12,-31,24,33,6,'#e8b454','#8e642c');dot(c,0,-29,12,'#ddb569','#3b3e30');dot(c,0,-29,8,'#273233','#f4d391');dot(c,0,-29,5,'#0b191b');
  }else if(u.type==='sniper'){
   metal(c,-6,-47-tier,12,48,3,'#a0a9a7','#3f494b');box(c,-9,-49-tier,18,7,2,'#3b4547','#d1d7b9');metal(c,5,-25,9,17,3,'#536b70','#23363a');dot(c,10,-27,3,'#6bd6f1');
  }else if(u.type==='laser'){
   metal(c,-11,-25,22,29,5,'#64ccea','#235b86');metal(c,-6,-38,12,23,3,'#bcf5ef','#178bc8');for(let j=0;j<3;j++)box(c,-14,-25+j*8,28,3,1,'#7ce5ff');dot(c,0,-38,5,'#d9ffff');
  }else if(u.type==='sticky'){
   dot(c,-8,-11,10,'#4e832e','#c8df67');dot(c,8,-11,10,'#4e832e','#c8df67');metal(c,-8,-31,16,28,4,'#9fc942','#3d6929');dot(c,0,-31,6,'#203529','#c9ed7e');dot(c,-4,-22,3,'#c1ff5b');
  }else if(u.type==='poison'){
   metal(c,-12,-18,24,24,5,'#8a56a6','#492e68');for(const px of [-9,9]){metal(c,px-4,-28,8,25,3,'#cca0e8','#654290');box(c,px-2,-21,4,14,2,'#b26eff');}metal(c,-5,-36,10,25,2,'#ae91c4','#45305a');dot(c,0,-36,4,'#d0a2ff');
  }
  if(tier>=1)box(c,-4,-1,8,4,1,'#e6ba59');
  if(tier>=2){metal(c,-18,-10,6,20,2,'#a3b8ac','#4e6768');metal(c,12,-10,6,20,2,'#a3b8ac','#4e6768');}
  if(tier>=3)line(c,[[-17,-3],[-13,-21],[13,-21],[17,-3]],'#d5b873',3);
  if(tier>=5){line(c,[[-18,-8],[-20,-29],[-14,-36]],col,4);line(c,[[18,-8],[20,-29],[14,-36]],col,4);}
  if(tier>=6)for(let j=0;j<3;j++)box(c,-21,-10-j*7,5,3,1,'#e7f6d4');
  c.restore();dot(c,0,-4,7,'#526064','#c3ccba');dot(c,0,-4,3,power<.4?'#c47748':col);
  if(tier>=4){dot(c,-16,4,2,col);dot(c,16,4,2,col);}
  if(tier>=7&&!icon){c.globalAlpha=.3+Math.sin(t*5)*.12;dot(c,0,-10,27,null,col);c.globalAlpha=1;}
  if(tier>=8){for(const px of [-1,1])line(c,[[px*17,0],[px*28,-11],[px*25,-23],[px*18,-17]],'#ffe49c',3);dot(c,0,-4,10,null,'#ffdb72');}
  if(power<.45&&!icon)text(c,'↓',24,-9,15,'#ab492e');
 }
 if(!icon){box(c,-13,19,26,12,3,'#283f31e8','#c6bd8a');text(c,`L${u.level}`,0,25,8,'#f0ebc9');}
 c.restore();
}
export class Renderer{
 constructor(canvas,game){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.game=game;this.quality=1;this.ghost=null;this.camera=new QuarterCamera(game.height);}
 resize(width,height){this.width=width;this.height=height;this.viewHeight=W*height/width;this.game.resize(this.viewHeight/DEPTH_SCALE);this.camera.resize(this.game.height);this.dpr=Math.min(globalThis.devicePixelRatio||1,this.quality<.7?1.25:2);this.canvas.width=Math.round(width*this.dpr);this.canvas.height=Math.round(height*this.dpr);this.bg=document.createElement('canvas');this.bg.width=W;this.bg.height=Math.ceil(this.viewHeight);this.background(this.bg.getContext('2d'));this.wallFlash=document.createElement('canvas');this.wallFlash.width=W;this.wallFlash.height=Math.ceil(this.viewHeight);}
 point(x,y,z=0){return this.camera.project(x,y,z);}
 cannonAnchor(c){return this.camera.cannonAnchor(c,this.game);}
 screenAngle(c){const pos=this.game.cannonPosition(c),a=this.point(pos.x,pos.y),b=this.point(pos.x+Math.cos(c.angle)*20,pos.y+Math.sin(c.angle)*20);return Math.atan2(b.y-a.y,b.x-a.x);}
 tree(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);shadow(c,3,5,11,4);box(c,-2,-8,4,15,1,'#8a784a');for(let j=0;j<3;j++){const yy=-8-j*8,rr=14-j*3;c.beginPath();c.moveTo(-rr,yy);c.quadraticCurveTo(-3,yy-14,0,yy-23);c.quadraticCurveTo(6,yy-12,rr,yy);c.quadraticCurveTo(0,yy+8,-rr,yy);c.fillStyle=['#497b42','#5b944c','#73a452'][j];c.fill();line(c,[[1,yy-16],[rr-4,yy-1]],'#376d4233',2);}c.restore();}
 building(c,x,y,s=1,type=0){c.save();c.translate(x,y);c.scale(s,s);shadow(c,5,20,48,12);metal(c,-36,-20,72,43,3,'#b9c1ae','#747f72');box(c,-35,-25,69,14,2,'#e1debe','#8e9478');box(c,-29,-33,56,13,2,'#b8c3b4','#7e9185');
 for(let i=0;i<4;i++){box(c,-28+i*15,-6,9,18,1,'#496a68','#91a798');line(c,[[-27+i*15,-4],[-27+i*15,9]],'#86b9b0',1);}
 if(type===1){const g=c.createLinearGradient(-20,-45,20,-20);g.addColorStop(0,'#a4ced5');g.addColorStop(.5,'#d0b9d2');g.addColorStop(1,'#c2e3a5');c.fillStyle=g;c.beginPath();c.ellipse(0,-32,26,15,0,0,TAU);c.fill();c.strokeStyle='#84958b';c.stroke();for(let i=-2;i<3;i++)line(c,[[-20,-32+i*4],[20,-32+i*4]],'#7da8a960');}
 else{box(c,-24,-39,29,10,1,'#638c9c','#c9d6bf');for(let i=0;i<4;i++)line(c,[[-22+i*7,-38],[-22+i*7,-30]],'#afc8b966');box(c,13,-44,9,19,2,'#d4d4b5','#8b9b89');}
 if(type===2)text(c,'SOXL',0,3,14,'#315c69');else if(type===0)text(c,'FAB',0,3,12,'#315c69');c.restore();}
 background(c){const h=this.viewHeight,art=clayBattlefield();if(art){const crop=artCrop(h,art.naturalWidth/art.naturalHeight);c.drawImage(art,art.naturalWidth*crop.left,art.naturalHeight*crop.top,art.naturalWidth*crop.wfrac,art.naturalHeight*crop.frac,0,0,W,h);this.groundColor=sampleGround(art,crop);return;}const grad=c.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#c7b17b');grad.addColorStop(.45,'#e0c791');grad.addColorStop(.65,'#b6c078');grad.addColorStop(1,'#819d65');c.fillStyle=grad;c.fillRect(0,0,W,h);
 // Deterministic terrain speckles do not consume market/game randomness.
 let seed=1207;const r=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<700;i++){const x=r()*W,y=r()*h;dot(c,x,y,.5+r()*1.6,i%3?'#786a3e17':'#fff4c624');}
 const road=c.createLinearGradient(0,0,W,0);road.addColorStop(0,'#e9d49d00');road.addColorStop(.25,'#efd49f55');road.addColorStop(.75,'#efd49f55');road.addColorStop(1,'#e9d49d00');c.fillStyle=road;c.fillRect(42,0,W-84,h);
 // Ground-plane diamonds make the camera angle legible without compressing sprites.
 c.save();c.globalAlpha=.16;for(let y=0;y<this.game.height;y+=52){const a=this.point(0,y),b=this.point(W,y);line(c,[[a.x,a.y],[b.x,b.y]],'#b2965b',1);}for(let x=0;x<=W;x+=54){const a=this.point(x,0),b=this.point(x,this.game.height);line(c,[[a.x,a.y],[b.x,b.y]],'#b2965b',1);}c.restore();
 for(let i=0;i<18;i++){const x=i%2?W-7-r()*15:5+r()*15,y=25+i/18*(h-35);const g=c.createLinearGradient(x-15,y-15,x+15,y+10);g.addColorStop(0,'#ceccb0');g.addColorStop(1,'#8c9579');box(c,x-14,y-10,25,23,5,g,'#909278');if(i%2)this.tree(c,x+(i%3)*7,y-4,.65+r()*.4);}
 for(let i=0;i<11;i++){const x=30+r()*(W-60),y=r()<.45?r()*55:h-75+r()*70;this.tree(c,x,y,.45+r()*.3);}
 // Chip city is kept at the south edge so supplies remain readable.
 c.save();c.globalAlpha=.6;for(let i=0;i<8;i++){const x=24+i*54;line(c,[[x,h],[x,h-58],[x+17,h-74],[x+17,h-115]],'#efd28c',2);dot(c,x+17,h-115,3,'#bbd28e','#eee3ac');}c.restore();
 this.building(c,55,h-27,.8,2);this.building(c,371,h-31,.82,0);this.building(c,201,h-12,.93,1);this.building(c,-14,h-103,.58,0);this.building(c,445,h-126,.65,1);
 for(const [x,y,s]of [[12,h-13,.8],[111,h-22,.62],[301,h-14,.8],[410,h-10,.9]])this.tree(c,x,y,s);
 }
 enemy(c,e){const clayFoot=this.point(e.x,e.y+e.radius);if(drawClayUnit(c,e,clayFoot.x,clayFoot.y,this.game.time,true))return;const d=ENEMIES[e.kind],t=this.game.time,run=Math.sin(t*(e.kind===3?6:12)+e.phase),bob=e.attacking?Math.sin(t*8):Math.abs(run)*2;
 const foot=this.point(e.x,e.y+e.radius),pulse=e.attackPulse||0,bodyY=foot.y-(d.height/2+6)*.84-bob+pulse*2;
 c.save();c.translate(foot.x,bodyY);c.scale(.84,.84);c.globalAlpha=clamp(Math.min(e.age*3,(35-e.age)*2,(20-e.contact)*2),0,1);c.lineCap='round';shadow(c,2,d.height/2+7,d.width*.7,4);
 for(const side of [-1,1]){
  if(e.attacking){const wx=e.x+side*d.width*.55,hit=this.point(wx,this.game.wallBackAt(wx),WALL.hitHeight),hx=(hit.x-foot.x)/.84,hy=(hit.y-bodyY)/.84-(1-pulse)*5;line(c,[[side*d.width*.45,0],[side*d.width*.72,hy*.5],[hx,hy]],'#4e4740',2.7);dot(c,hx,hy,2.7,'#6b5645');}
  else{const arm=run*4*side;line(c,[[side*d.width*.45,0],[side*d.width*.75,5+arm],[side*d.width*.8,3+arm]],'#4e4740',2.7);}
 }
 for(const p of [-1,1])line(c,[[p*d.width*.2,d.height*.4],[p*(d.width*.28+run*3),d.height*.5+6],[p*(d.width*.28+run*3+3),d.height*.5+6]],'#454c3c',2.8);
 line(c,[[0,-d.height/2-8],[0,d.height/2+3]],'#c64d3d',2);dot(c,0,-d.height/2-9,2,'#ffb25a');
 metal(c,-d.width/2,-d.height/2,d.width,d.height,e.kind===2?9:4,e.hit>0?'#fff3c7':e.poisons.length?'#d48baa':'#ff8670',e.hit>0?'#ffbfa1':'#d6423a');
 line(c,[[-d.width/2+3,-d.height/2+4],[-d.width/2+3,d.height/2-5]],'#ffc2a677',2);
 const yy=-d.height*.09;dot(c,-d.width*.2,yy,1.8,'#3e3031');dot(c,d.width*.2,yy,1.8,'#3e3031');line(c,[[-3,yy+7],[0,yy+4],[3,yy+7]],'#793d36',1.5);
 if(e.kind===3||e.kind===1){line(c,[[-d.width*.3,yy-6],[-2,yy-3]],'#683c36',2);line(c,[[d.width*.3,yy-6],[2,yy-3]],'#683c36',2);}
 if(e.kind===2){dot(c,-10,yy+5,2,'#ffa995');dot(c,10,yy+5,2,'#ffa995');}
 if(e.hp<e.maxHP||e.kind===3||e.attacking){box(c,-d.width/2-2,-d.height/2-18,d.width+4,5,2,'#4e5143','#eee5bc');box(c,-d.width/2-1,-d.height/2-17,(d.width+2)*clamp(e.hp/e.maxHP,0,1),3,1,'#ef6d61');}
 if(e.poisons.length){dot(c,d.width/2+3,-8,5,'#c195e8','#e9c9fb');text(c,e.poisons.length,d.width/2+3,-8,7,'#55356b');}c.restore();}
 supply(c,s){const clayFoot=this.point(s.x,s.y+s.radius);if(drawClayUnit(c,s,clayFoot.x,clayFoot.y,this.game.time,false))return;const r=s.radius,t=this.game.time,run=Math.sin(t*10+s.phase),p=this.point(s.x,s.y+s.radius);c.save();c.translate(p.x,p.y-(r+5)*.9-Math.max(0,run)*3);c.scale(.9,.9);c.globalAlpha=clamp(Math.min(s.age*3,(35-s.age)*2),0,1);c.lineCap='round';shadow(c,2,r+7,r,3);
 line(c,[[-r*.7,0],[-r-4,-5-run*3],[-r-5,-7-run*3]],'#536148',2);line(c,[[r*.7,0],[r+4,-5+run*3],[r+5,-7+run*3]],'#536148',2);
 for(const p of [-1,1])line(c,[[p*r*.35,r*.6],[p*(r*.4+run*3),r+5],[p*(r*.4+run*3+3),r+5]],'#4a5140',2.6);
 if(s.kind===2){const g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#b4e2c0');g.addColorStop(.4,'#b9d5ec');g.addColorStop(.7,'#e7bfd8');g.addColorStop(1,'#f1dc96');dot(c,0,0,r,g,'#648b6a');c.save();c.beginPath();c.arc(0,0,r-1,0,TAU);c.clip();for(let j=-r;j<r;j+=6){line(c,[[j,-r],[j,r]],'#689a8d66');line(c,[[-r,j],[r,j]],'#689a8d66');}c.restore();}
 else if(s.kind===0||s.kind===1){for(let j=-r+2;j<r;j+=5){line(c,[[j,-r-2],[j,r+2]],'#d6bc73',2);line(c,[[-r-2,j],[r+2,j]],'#d6bc73',2);}metal(c,-r,-r*.75,r*2,r*1.5,3,'#9fc98a','#4a8055');box(c,-r+3,-r*.75+3,r*2-6,r*1.5-6,2,s.kind===0?'#3e6348':'#bfd0ac','#d6d2a0');}
 else if(s.kind===3){metal(c,-r,-r*.65,r*2,r*1.3,3,'#cad8c5','#6e9c8b');box(c,r-8,-r*.4,10,r*.8,2,'#2f5957','#aec5a6');box(c,r-4,-3,5,6,1,'#9cffff');}
 else if(s.kind===4){line(c,[[0,r],[0,r+9],[10,r+14],[17,r+8]],'#d9ad52',3);metal(c,-r*.7,-r,r*1.4,r*1.7,3,'#92c7bb','#3c878a');box(c,-r*.45,-r-4,r*.9,6,1,'#dae4b5');}
 else{metal(c,-r,-r*.65,r*2,r*1.3,3,'#8dcc8b','#478f57');for(let j=0;j<3;j++){box(c,-r+5+j*10,-r*.4,7,r*.6,1,'#2e5946','#d6ca7d');line(c,[[-r+7+j*10,r*.2],[-r+7+j*10,r*.5]],'#d3d895',1);}}
 box(c,-6,-2,12,11,4,'#b8db9e');dot(c,-3,1,1.4,'#304c38');dot(c,3,1,1.4,'#304c38');c.beginPath();c.arc(0,3,3,0,Math.PI);c.strokeStyle='#426040';c.lineWidth=1.2;c.stroke();c.restore();}
 wall(c){
  const current=this.game,key=[current.stage,current.wallY,current.height,...current.cannons.filter(t=>t.type!=='drone').map(t=>t.x)].join('|');
  if(this.clayWallCache?.key===key){const layer=this.clayWallCache;c.drawImage(layer.canvas,0,layer.top,W,142);return;}
  const layer=document.createElement('canvas'),top=Math.floor(this.point(216,current.wallY).y-90);layer.width=W*2;layer.height=284;const lc=layer.getContext('2d');lc.setTransform(2,0,0,2,0,-top*2);
  if(drawClayWall(lc,current,(x,y,z)=>this.point(x,y,z))){this.clayWallCache={key,canvas:layer,top};c.drawImage(layer,0,top,W,142);return;}
  const g=this.game,k=Math.max(0,g.stage-2),pal=[['#af9462','#d5bb82'],['#92754c','#c4a46a'],['#8d754f','#c6ab76'],['#96917b','#d8cba4'],['#a4aa96','#e2ddbf'],['#909e91','#dbe3c8'],['#7f918a','#d4e2d4'],['#bd9c53','#ffe9a4']][k];
  const north=(x,z=0)=>this.point(x,g.wallFaceAt(x),z),back=(x)=>this.point(x,g.wallAt(x)+WALL.south,WALL_ELEVATION);
  c.save();c.lineJoin='round';
  const ground=[];for(let x=-26;x<=W+26;x+=8)ground.push(this.point(x,g.wallAt(x)+6));
  line(c,ground.map(p=>[p.x,p.y]),'#4d5b3945',19);
  // The deck extends SOUTH of the shared collision face. Attackers stand north
  // of it and their fists project onto that same face at hitHeight.
  for(let x=-25;x<W+25;x+=24){
   const a=north(x,WALL_ELEVATION),b=north(x+24,WALL_ELEVATION),d=north(x),e=north(x+24);
   polygon(c,[back(x),back(x+24),b,a],pal[1],'#8d9879');
   const face=c.createLinearGradient(a.x,a.y,d.x,d.y);face.addColorStop(0,pal[0]);face.addColorStop(1,k===7?'#8b783f':'#78806a');polygon(c,[a,b,e,d],face,'#616a50');
   if(k===0){line(c,[[a.x+5,a.y+7],[a.x+12,a.y+10],[d.x+15,d.y-4]],'#817144',1);dot(c,d.x+8,d.y-5,2,'#c5ae78');}
   else if(k<=2){for(let j=6;j<24;j+=8){const q=north(x+j);line(c,[[a.x+j,a.y+2],[q.x,q.y-2]],'#655735',1);}if(k===2){const q=north(x,12),r=north(x+24,12);line(c,[[q.x,q.y],[r.x,r.y]],'#99ab96',4);dot(c,q.x+4,q.y,1.3,'#e8e6bd');}}
   else{const m=north(x,13),n=north(x+24,13);line(c,[[m.x,m.y],[n.x,n.y]],'#6c7864',1);const v=north(x+12);line(c,[[m.x+11,m.y],[v.x,v.y]],'#6c7864',1);if(k===3)line(c,[[a.x+17,a.y],[d.x+17,d.y]],'#9c8054',4);}
   if(k>=5){const q=north(x+2,WALL_ELEVATION),r=north(x+2);line(c,[[q.x,q.y],[r.x,r.y]],k===7?'#f0ce79':'#c1d0b6',4);dot(c,q.x,q.y+4,1.1,'#f5f4d3');dot(c,r.x,r.y-4,1.1,'#f5f4d3');}
   if(k>=6){const q=north(x+13,17);box(c,q.x-4,q.y,9,13,1,k===7?'#426d66':'#526e67',k===7?'#ead089':'#bed7c1');line(c,[[q.x-1,q.y+4],[q.x+2,q.y+4],[q.x+2,q.y+9],[q.x-1,q.y+9],[q.x-1,q.y+4]],'#e1c77b',1);}
   line(c,[[a.x,a.y],[b.x,b.y]],k===7?'#fff0ba':'#e6e6c5',2);
  }
  if(k>=3)for(let x=12;x<W;x+=54){const p=back(x);metal(c,p.x-6,p.y-6,13,10,2,pal[1],pal[0]);}
  c.restore();
 }
 // Totem aura: the wall span it covers glows, and every tower it buffs gets a link and a +% tag.
 totemLinks(c,x,level,self){const g=this.game,st=cannonStats('totem',level),t=g.time,y=g.wallAt(x)+WALL.deck+WALL.mountOffset;c.save();
  const pts=[];for(let i=0;i<=24;i++){const wx=x-st.range+i*st.range/12;if(wx<0||wx>W)continue;const p=this.point(wx,g.wallAt(wx)+WALL.deck+WALL.mountOffset,WALL_ELEVATION);pts.push([p.x,p.y]);}
  c.globalAlpha=.55+Math.sin(t*4)*.15;line(c,pts,'#ffd36a',7);c.globalAlpha=1;line(c,pts,'#fff3c4',2);
  const src=this.point(x,y,WALL_ELEVATION+26);let n=0;
  for(const u of g.cannons){if(u===self||u.type==='totem')continue;const d=u.type==='drone'?Math.hypot(u.x-x,u.y-y):Math.abs(u.x-x);const ok=d<=st.range,p=u.type==='drone'?this.point(u.x,u.y,24):this.point(u.x,g.wallAt(u.x)+WALL.deck+WALL.mountOffset,WALL_ELEVATION+18);
   if(ok){n++;c.save();c.setLineDash([4,4]);c.lineDashOffset=-t*30;line(c,[[src.x,src.y],[p.x,p.y]],'#ffe08a',2);c.restore();c.save();c.globalAlpha=.6+Math.sin(t*6)*.25;c.strokeStyle='#ffe08a';c.lineWidth=2.5;c.beginPath();c.ellipse(p.x,p.y+14,17,6,0,0,TAU);c.stroke();c.restore();box(c,p.x-17,p.y-40,34,15,7,'#3d5e2ef0','#ffe08a');text(c,'+'+Math.round(st.buff*100)+'%',p.x,p.y-32,9,'#fff3c4');}
   else{c.save();c.globalAlpha=.5;box(c,p.x-15,p.y-38,30,13,6,'#3a2a22e0','#a08a7a');text(c,'범위 밖',p.x,p.y-31,7,'#e0d0c0');c.restore();}}
  const lbl=this.point(x,y,WALL_ELEVATION+60);box(c,lbl.x-52,lbl.y-12,104,20,9,'#2c4634f2','#ffd36a');text(c,n?`버프 적용 ${n}기`:'주변에 타워 없음',lbl.x,lbl.y-2,10,'#fff3c4');c.restore();}
 auraCheck(c,x,self){const g=this.game,tot=g.cannons.filter(u=>u.type==='totem'&&u!==self);if(!tot.length)return;const inside=tot.some(u=>Math.abs(u.x-x)<=cannonStats('totem',u.level).range);
  for(const u of tot){const st=cannonStats('totem',u.level),pts=[];for(let i=0;i<=24;i++){const wx=u.x-st.range+i*st.range/12;if(wx<0||wx>W)continue;const p=this.point(wx,g.wallAt(wx)+WALL.deck+WALL.mountOffset,WALL_ELEVATION);pts.push([p.x,p.y]);}c.save();c.globalAlpha=.35;line(c,pts,'#ffd36a',7);c.restore();}
  const p=this.point(x,g.wallAt(x)+WALL.deck+WALL.mountOffset,WALL_ELEVATION+70);box(c,p.x-44,p.y-12,88,20,9,inside?'#3d5e2ef0':'#3a2a22e8',inside?'#ffd36a':'#a08a7a');text(c,inside?'토템 버프 ✓':'토템 범위 밖',p.x,p.y-2,10,inside?'#fff3c4':'#e0d0c0');}
 knightsAndSweeps(c,t){const g=this.game;
  for(const k of g.knights||[]){const foot=this.point(k.x,k.y+8);const fake={art:'candle',kind:0,radius:8,phase:k.phase,age:k.age,attacking:k.attacking};c.save();if(!drawClayUnit(c,fake,foot.x,foot.y,t,false)){c.fillStyle='#6fbf4c';c.fillRect(foot.x-5,foot.y-20,10,18);}
   // helmet + sword
   c.fillStyle='#d9dde2';c.strokeStyle='#4a4f56';c.lineWidth=1;c.beginPath();c.ellipse(foot.x,foot.y-27,6.5,4.2,0,Math.PI,0);c.fill();c.stroke();c.fillStyle='#ffd34f';c.fillRect(foot.x-.8,foot.y-34,1.6,5);
   const sw=k.attacking?Math.sin(t*18+k.phase)*.9:-.5;c.save();c.translate(foot.x+7,foot.y-14);c.rotate(sw);c.fillStyle='#eef2f6';c.strokeStyle='#5a5f66';c.beginPath();c.moveTo(0,0);c.lineTo(2,-15);c.lineTo(0,-18);c.lineTo(-2,-15);c.closePath();c.fill();c.stroke();c.fillStyle='#a8733a';c.fillRect(-3.5,-.5,7,2);c.restore();c.restore();}
  for(const s of g.sweeps||[]){const p=this.point(s.x,s.y,8),q=this.point(s.x+s.dx*10,s.y+s.dy*10,8),ang=Math.atan2(q.y-p.y,q.x-p.x);c.save();
   if(s.kind==='rocket'){c.globalCompositeOperation='lighter';for(let i=1;i<9;i++){const b=this.point(s.x-s.dx*i*14,s.y-s.dy*i*14,8);c.globalAlpha=.35*(1-i/9);c.fillStyle='#ffb04a';c.beginPath();c.arc(b.x,b.y,s.width*.25*(1-i/12),0,TAU);c.fill();}c.globalCompositeOperation='source-over';c.globalAlpha=1;
    c.translate(p.x,p.y);c.rotate(ang);c.fillStyle='#f4f6f8';c.strokeStyle='#4a4f56';c.lineWidth=1.2;c.beginPath();c.moveTo(16,0);c.lineTo(6,-5);c.lineTo(-14,-5);c.lineTo(-14,5);c.lineTo(6,5);c.closePath();c.fill();c.stroke();c.fillStyle='#d8402a';c.beginPath();c.moveTo(-10,-5);c.lineTo(-17,-10);c.lineTo(-14,-4);c.fill();c.beginPath();c.moveTo(-10,5);c.lineTo(-17,10);c.lineTo(-14,4);c.fill();c.fillStyle='#ffd34f';c.beginPath();c.moveTo(-14,-3);c.lineTo(-24-Math.random()*6,0);c.lineTo(-14,3);c.fill();
    c.rotate(-ang);c.globalAlpha=.18;c.strokeStyle='#ffe8b0';c.lineWidth=s.width*.6;c.beginPath();c.moveTo(0,0);const back=this.point(s.x-s.dx*120,s.y-s.dy*120,8);c.lineTo(back.x-p.x,back.y-p.y);c.stroke();}
   else{for(let i=1;i<6;i++){const b=this.point(s.x-s.dx*i*9,s.y-s.dy*i*9,2);c.globalAlpha=.25*(1-i/6);c.fillStyle='#c9b08a';c.beginPath();c.arc(b.x+(Math.random()-.5)*4,b.y,4+i*2,0,TAU);c.fill();}c.globalAlpha=1;
    c.translate(p.x,p.y);c.rotate(ang);c.fillStyle='#b9c3cc';c.strokeStyle='#3e454c';c.lineWidth=1.2;c.beginPath();c.moveTo(14,3);c.lineTo(14,-3);c.lineTo(2,-6);c.lineTo(-12,-5);c.lineTo(-13,5);c.lineTo(2,6);c.closePath();c.fill();c.stroke();c.fillStyle='#24303a';c.beginPath();c.moveTo(6,-4.6);c.lineTo(1,-5.6);c.lineTo(1,5.6);c.lineTo(6,4.6);c.closePath();c.fill();c.fillStyle='#ff5a4a';c.fillRect(-13.5,-4,1.5,8);c.fillStyle='#fff6d0';c.fillRect(13.2,-3,1.2,6);c.fillStyle='#2a2f34';for(const wy of [-6.6,5.2])for(const wx of [-8,8]){c.fillRect(wx-2.5,wy,5,1.6);}}
   c.restore();}}
 // v23: soft plain-ground strip under the wall so painted buildings don't clash with the masonry.
 wallGround(c){const g=this.game,col=this.groundColor;if(!col)return;const pts=[];for(let i=0;i<=24;i++){const x=i*W/24,p=this.point(x,g.wallAt(x)+WALL.deck*.4,0);pts.push([p.x,p.y]);}
  const [r,gg,b]=col;c.save();c.lineCap='round';c.lineJoin='round';for(const [w,a] of [[150,.16],[124,.2],[100,.24],[78,.3],[56,.36]]){c.strokeStyle=`rgba(${r},${gg},${b},${a})`;c.lineWidth=w;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}c.restore();}
 range(c,x,y,r,color='#a3f2ea',altitude=0){
  c.save();c.beginPath();for(let i=0;i<=80;i++){const a=i/80*TAU,p=this.point(x+Math.cos(a)*r,y+Math.sin(a)*r,altitude);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.closePath();c.fillStyle=color+'12';c.fill();c.setLineDash([5,4]);c.strokeStyle=color+'b0';c.lineWidth=1.2;c.stroke();c.restore();
 }
 effects(c,front){for(const f of this.game.effects){const isFront=['text','wall-xp','wall-gold','player-level','impact','bullet-hit','beam','muzzle','supply-deliver','dmg'].includes(f.type);if(isFront!==front)continue;const p=1-f.life/f.maxLife,pos=this.point(f.x,f.y,f.sourceAltitude||0);c.save();c.globalAlpha=Math.min(1,f.life/f.maxLife*1.8);
  if(drawEffect(c,f,pos,p,(x,y,z)=>this.point(x,y,z))){c.restore();continue;}
  if(f.type==='supply-deliver'){/* v24: the bull dissolves into the wall with a green blessing burst */c.save();c.globalAlpha=1-p;const k=1-p*.6;c.translate(pos.x,pos.y-p*10);c.scale(k,k);drawClayUnit(c,{kind:f.kind,radius:f.radius,age:1,art:f.art},0,0,this.game.time,false,3);c.restore();
   c.save();c.globalCompositeOperation='lighter';const r=10+p*26;const g=c.createRadialGradient(pos.x,pos.y-8,0,pos.x,pos.y-8,r);g.addColorStop(0,`rgba(220,255,190,${.75*(1-p)})`);g.addColorStop(.5,`rgba(130,230,110,${.4*(1-p)})`);g.addColorStop(1,'rgba(80,200,80,0)');c.fillStyle=g;c.beginPath();c.arc(pos.x,pos.y-8,r,0,TAU);c.fill();
   c.strokeStyle=`rgba(190,255,150,${.8*(1-p)})`;c.lineWidth=2;c.beginPath();c.ellipse(pos.x,pos.y,6+p*22,(6+p*22)*.35,0,0,TAU);c.stroke();
   for(let i=0;i<5;i++){const a=f.x*7+i*1.3,sx=pos.x+Math.cos(a)*(6+p*14),sy=pos.y-6-p*(22+i*5);c.fillStyle=`rgba(230,255,200,${1-p})`;c.fillRect(sx-.8,sy-3,1.6,6);c.fillRect(sx-3,sy-.8,6,1.6);}c.restore();}
  if(f.type==='particle'){if(this.quality>.6||f.life>.3)dot(c,pos.x,pos.y,2,f.color);}
  if(f.type==='wall-gold')text(c,'+'+this.game.cash(f.amount),pos.x,pos.y-p*26,11,'#ffe6a0');
  if(f.type==='wall-xp'){/* v24: a plain +N / −N shows the wall gaining or losing strength (no 'XP' wording) */const negative=f.amount<0,v=Math.abs(f.amount),n=v>=1?Math.round(v):v.toFixed(v>=.1?1:2);c.save();c.font=`900 ${negative?11:12}px system-ui`;c.textAlign='center';c.lineJoin='round';c.lineWidth=3;c.strokeStyle=negative?'#4a0e06':'#0e3a12';const yy=pos.y-p*26;c.globalAlpha=Math.min(1,(1-p)*2.2);c.strokeText(`${negative?'−':'+'}${n}`,pos.x,yy);c.fillStyle=negative?'#ff8a72':'#b6ff8a';c.fillText(`${negative?'−':'+'}${n}`,pos.x,yy);c.restore();}
  if(f.type==='bullet-hit'){const rr=(f.heavy?8:4)*p;for(let i=0;i<4;i++){const a=i*TAU/4;line(c,[[pos.x+Math.cos(a)*2,pos.y+Math.sin(a)*2],[pos.x+Math.cos(a)*rr,pos.y+Math.sin(a)*rr]],f.color,1.1);}dot(c,pos.x,pos.y,1.5,'#fff2c4');}
  if(f.type==='player-level'){const yy=60-p*12;box(c,121,yy,190,f.unlocked?56:44,12,'#304c37f2','#e6cf8b');text(c,'PLAYER LEVEL UP',216,yy+13,9,'#e8d69b');text(c,`Lv.${f.amount}`,216,yy+30,16,'#f6efcd');if(f.unlocked)text(c,'설치 슬롯 +1 · 최대 '+f.slots+'기',216,yy+46,8,'#e3e9b7');}
  if(f.type==='text'){c.shadowColor='#183622';c.shadowBlur=3;text(c,f.amount,pos.x,pos.y-p*28,14,f.color);}
  if(f.type==='beam'){const end=this.point(f.tx,f.ty,f.targetAltitude||0);line(c,[[pos.x,pos.y],[end.x,end.y]],f.color,f.width+3);line(c,[[pos.x,pos.y],[end.x,end.y]],'#ffffd8',f.width*.5);}
  if(f.type==='explosion'){dot(c,pos.x,pos.y,f.radius*(.2+p)*.8,f.color+'35',f.color);dot(c,pos.x,pos.y,f.radius*p*.5,null,'#fff3bd');}
  if(f.type==='impact'){dot(c,pos.x,pos.y,3+p*8,null,f.color);for(let i=0;i<5;i++){const a=i/5*TAU;line(c,[[pos.x+Math.cos(a)*4,pos.y+Math.sin(a)*4],[pos.x+Math.cos(a)*(8+p*9),pos.y+Math.sin(a)*(8+p*9)]],'#fff0b1',1.6);}}
  if(f.type==='muzzle'){const r=(f.weapon==='machine'?2.6:3.5)*(1-p);dot(c,pos.x,pos.y,r,f.color);dot(c,pos.x,pos.y,r*.45,'#fffce1');}
  if(f.type==='wave'){c.globalAlpha*=.65;for(let i=0;i<2;i++){const a=this.point(0,f.y+(p*40-20)*(i?1:-1)),b=this.point(W,f.y+(p*40-20)*(i?1:-1));line(c,[[a.x,a.y],[b.x,b.y]],f.color,2-p);}}
  if(f.type==='crush'){c.translate(pos.x,pos.y);c.scale(1+p*2,1-p*.9);box(c,-10,-8,20,16,5,f.color);for(let i=0;i<4;i++)line(c,[[-15-i*3,-8],[0,-12-i*2],[15+i*3,-8]],'#ffefc0',1);}
  if(f.type==='ghost')dot(c,pos.x,pos.y-p*10,f.radius,null,f.color);
  c.restore();}

 }
 wallLevelFX(c){
  const g=this.game,f=g.wallTransition;if(!f)return;const p=clamp(f.elapsed/f.duration,0,1),up=f.to>f.from,fade=Math.sin(Math.PI*Math.min(1,p*1.5))*(1-p),point=(x,y,z)=>this.point(x,y,z);
  if(up){c.save();c.globalCompositeOperation='screen';for(let x=0;x<=W;x+=18){const a=this.point(x,g.wallBackAt(x),WALL_ELEVATION),b=this.point(x,g.wallFaceAt(x),WALL_ELEVATION);const glow=c.createRadialGradient(a.x,a.y,1,a.x,a.y,28+24*p);glow.addColorStop(0,'#fff6be'+Math.round(fade*160).toString(16).padStart(2,'0'));glow.addColorStop(1,'#ffdd7700');c.fillStyle=glow;c.fillRect(a.x-55,a.y-55,110,110);for(let i=0;i<3;i++){const angle=(x*.43+i*2.1),length=(12+24*p)*(1-p*.5);line(c,[[a.x+Math.cos(angle)*5,a.y+Math.sin(angle)*5],[a.x+Math.cos(angle)*length,a.y+Math.sin(angle)*length]],'#fff0b3'+Math.round(fade*190).toString(16).padStart(2,'0'),1);}}
  c.restore();const mask=this.wallFlash.getContext('2d');mask.clearRect(0,0,W,this.viewHeight);drawClayWall(mask,g,point,true);mask.globalCompositeOperation='source-in';mask.fillStyle='#fffbe7';mask.fillRect(0,0,W,this.viewHeight);mask.globalCompositeOperation='source-over';c.save();c.globalAlpha=(p<.13?p/.13:Math.pow(1-p,2))*.82;c.drawImage(this.wallFlash,0,0);c.restore();}
 }
 wallLevelBanner(c){const f=this.game.wallTransition;if(!f||f.to===f.from)return;const p=f.elapsed/f.duration,center=this.point(216,this.game.wallAt(216)),y=center.y-105,up=f.to>f.from;c.save();c.globalAlpha=Math.min(1,p*8,(1-p)*5);c.shadowColor='#152a2390';c.shadowBlur=12;box(c,118,y,196,58,14,up?'#345844f2':'#6b493ef2',up?'#ffe3a3':'#eba58d');c.shadowBlur=0;text(c,up?'WALL UPGRADE':'WALL DAMAGED',216,y+16,9,up?'#f8d98e':'#ffd4be');text(c,up?'성벽 강화!':'성벽이 무너졌어요',216,y+38,20,'#fff3ce');c.restore();}
 wallHUD(c){
  const g=this.game,pct=Number.isFinite(g.market?.changePct)?g.market.changePct:null,center=this.point(W/2,g.wallAt(W/2)),y=center.y+43;
  box(c,12,y-5,119,42,9,'#2c4634ed','#d8d8a9');text(c,'WALL LEVEL',22,y+5,7,'#c8d5ae','left');text(c,`Lv.${g.wallLevel}`,22,y+23,18,'#f7e6b4','left');text(c,g.wallXP>=WALL_MAX_XP?'MAX · GOLD':`${Math.floor(g.wallXP)} XP`,121,y+24,8,'#d6e5c1','right');
 }
 projectile(c,p){if(p.elapsed<0)return;const u=clamp(p.elapsed/p.duration,0,1),arc=p.type==='mortar'?85:p.type==='shell'?150:p.type==='slime'?20:p.type==='venom'?10:0,position=v=>this.point(p.x+(p.tx-p.x)*v,p.y+(p.ty-p.y)*v,(p.sourceAltitude||0)*(1-v)+(p.targetAltitude||0)*v+Math.sin(v*Math.PI)*arc),pt=position(u);if(this.quality>.6){drawProjectile(c,p,position,this.game.time);return;}
  if(p.type==='bullet'||p.type==='slug'){const tail=position(Math.max(0,u-(p.type==='slug'?.13:.08)));line(c,[[tail.x,tail.y],[pt.x,pt.y]],p.type==='slug'?'#fff7cb':'#eab957',p.type==='slug'?2:1.5);dot(c,pt.x,pt.y,p.type==='slug'?1.8:1.3,'#fff8d6');}
  else{dot(c,pt.x,pt.y,p.type==='mortar'?3.4:p.type==='slime'?3:2.5,p.color,'#f5f1bb');if(p.type!=='mortar'){const tail=position(Math.max(0,u-.09));dot(c,tail.x,tail.y,1.6,p.color+'80');}}
 }
 render(){
  const c=this.ctx,g=this.game,s=this.width*this.dpr/W,t=g.time;c.setTransform(s,0,0,s,0,0);c.globalAlpha=1;c.drawImage(this.bg,0,0,W,this.viewHeight);
  /* faction captions removed (v17): they collided with the HUD on phones */
  for(const z of g.zones){const p=this.point(z.x,z.y);c.save();c.globalAlpha=Math.min(.35,z.life*.2);c.fillStyle='#7da522';c.beginPath();c.ellipse(p.x,p.y,z.radius*.92,z.radius*DEPTH_SCALE,0,0,TAU);c.fill();c.restore();}
  if(g.selected){const u=g.selected,st=cannonStats(u.type,u.level),pos=g.cannonPosition(u);if(u.type==='totem')this.totemLinks(c,u.x,u.level,u);else{this.range(c,pos.x,pos.y,st.range,u.type==='drone'?'#8be2fa':'#f0f6b8');if(st.minRange)this.range(c,pos.x,pos.y,st.minRange,'#ff8a7a');}}
  this.effects(c,false);
  for(const e of g.enemies.filter(e=>e.alive).sort((a,b)=>this.point(a.x,a.y+a.radius).y-this.point(b.x,b.y+b.radius).y))this.enemy(c,e);
  this.knightsAndSweeps(c,t);
  this.wallGround(c);this.wall(c);this.wallLevelFX(c);
  for(const u of g.cannons.filter(u=>u.type!=='drone')){const p=this.cannonAnchor(u);c.save();if(this.ghost?.cannon===u)c.globalAlpha=.2;buffAura(c,p.x,p.y,t,g.wallLevel);drawCannon(c,{...u,angle:this.screenAngle(u)},p.x,p.y,t,g.power,u===g.selected);buffAura(c,p.x,p.y,t,g.wallLevel,true);c.restore();}
  // Attackers stop at the north upper silhouette; masonry covers only their
  // south-facing contact edge. Supply units approach from the foreground.
  for(const s of g.supplies.filter(s=>s.alive).sort((a,b)=>this.point(a.x,a.y+a.radius).y-this.point(b.x,b.y+b.radius).y))this.supply(c,s);
  for(const p of g.projectiles)this.projectile(c,p);
  for(const u of g.cannons.filter(u=>u.type==='drone')){const p=this.cannonAnchor(u);c.save();if(this.ghost?.cannon===u)c.globalAlpha=.2;drawDrone(c,{...u,angle:this.screenAngle(u)},p.x,p.y,t,g.power,u===g.selected);c.restore();}
  this.effects(c,true);this.wallLevelBanner(c);
  if(g.placement||this.ghost){
   const exclude=this.ghost?.cannon||null,type=g.placement||exclude.type,air=type==='drone',x=this.ghost?.x??216,y=this.ghost?.y??g.height*.35;
   const valid=this.ghost?.inBounds!==false&&(this.ghost?.swapTarget?!!g.swapPlan(exclude,this.ghost.swapTarget):(air?validDronePlacement(x,y,g.height):validPlacement(x,g.cannons,exclude))),col=valid?'#b5ff7b':'#ff6d70';
   if(air)this.range(c,x,y,cannonStats(type,exclude?.level||1).range,col);
   else{c.save();c.setLineDash([5,5]);line(c,Array.from({length:45},(_,i)=>{const p=this.point(i*10,g.wallAt(i*10)+WALL.deck+WALL.mountOffset,WALL_ELEVATION);return[p.x,p.y];}),col,2);c.restore();}
   if(!air&&type==='totem')this.totemLinks(c,x,exclude?.level||g.owned('totem')?.level||1,exclude);else if(!air)this.auraCheck(c,x,exclude);
   const temp={type,x,y,level:exclude?.level||g.owned(type)?.level||1,angle:exclude?.angle??-Math.PI/2},p=this.cannonAnchor(temp);c.save();c.globalAlpha=.6;drawCannon(c,{...temp,angle:this.screenAngle(temp)},p.x,p.y,t,1,true);c.restore();
   const bannerY=Math.min(this.viewHeight-46,this.point(216,g.wallY).y+94);box(c,82,bannerY,268,23,6,'#294835eb',col);text(c,this.ghost?.swapTarget?(valid?'놓으면 두 타워의 자리 교환':'교환할 수 없는 위치입니다'):valid?(air?'전투 공간을 터치해 공중 배치':'성벽을 터치해 배치'):(air?'전투 영역 안에 배치하세요':'캐논 사이 간격을 띄워 주세요'),216,bannerY+12,11,col);
  }
 }
}

// Average colour of the painted road (centre strip of the art) — used to clear the art behind the wall.
function sampleGround(art,crop){try{const k=document.createElement('canvas');k.width=k.height=8;const x=k.getContext('2d',{willReadFrequently:true});const sx=art.naturalWidth*(crop.left+crop.wfrac*.44),sw=art.naturalWidth*crop.wfrac*.12,sy=art.naturalHeight*(crop.top+crop.frac*.35),sh=art.naturalHeight*crop.frac*.3;x.drawImage(art,sx,sy,sw,sh,0,0,8,8);const d=x.getImageData(0,0,8,8).data;let r=0,g=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}const n=d.length/4;return[r/n|0,g/n|0,b/n|0];}catch{return null;}}
function tierize(canvas,level){if(!tierOf(level)||typeof document==='undefined')return;const w=canvas.width,h=canvas.height,copy=document.createElement('canvas');copy.width=w;copy.height=h;copy.getContext('2d').drawImage(canvas,0,0);const c=canvas.getContext('2d'),k=w/88;c.clearRect(0,0,w,h);drawTierBack(c,w/2,h*.88,level,k);c.filter=tierTint(level);c.drawImage(copy,0,0);c.filter='none';drawTierFront(c,w/2,h*.16,h*.88,level,0,k);}
export function renderShopIcon(canvas,type,level=1){if(type==='mortar'&&drawClayMortarIcon(canvas)){tierize(canvas,level);return;}if(drawClayPreview(canvas,type)){tierize(canvas,level);return;}const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.save();c.translate(canvas.width/2,canvas.height*.75);c.scale(.72,.72);drawCannon(c,{type,level,angle:-Math.PI/2},0,0,0,1,false,true);c.restore();}


