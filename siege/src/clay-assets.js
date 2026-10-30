import { loadClayCollection,CLAY_CATALOG } from './clay-runtime.js?v=182b83ac01';
import { WALL } from './config.js?v=182b83ac01';
const images = new Map();
export const CLAY_ART = {
  mortar: new URL('../assets/clay/mortar-master-v1.webp', import.meta.url).href,
  atlas: new URL('../assets/clay/mortar-turnaround-v2.webp', import.meta.url).href,
  battlefield: new URL('../assets/clay/battlefield-clay-v1.webp', import.meta.url).href,
};
export function clayBattlefield(){return images.get('battlefield');}
// Swap the battlefield painting (per-stock themes). Resolves true once decoded.
const fields=new Map();export async function useBattlefield(file){if(typeof Image==='undefined')return false;if(fields.has(file)){images.set('battlefield',fields.get(file));return true;}const img=new Image();img.decoding='async';img.src=new URL('../assets/clay/'+file,import.meta.url).href;try{await img.decode();fields.set(file,img);images.set('battlefield',img);return true;}catch{return false;}}
export async function loadClayAssets({onProgress=()=>{}}={}) {
  if (typeof Image === 'undefined') return false;
  let baseDone=0,collectionDone=0;const total=CLAY_CATALOG.length+2;const report=()=>onProgress(baseDone+collectionDone,total);
  const collection=loadClayCollection(done=>{collectionDone=done;report();});
  const results = await Promise.all(Object.entries(CLAY_ART).filter(([key])=>key!=='mortar').map(async ([key, url]) => {
    const img = new Image(); img.decoding = 'async'; img.src = url;
    try { await img.decode(); images.set(key, img);baseDone++;report(); return true; }
    catch {baseDone++;report();return false; }
  }));
  return results.every(Boolean)&&await collection;
}
export function mortarFrame(angle = -Math.PI / 2) {
  return ((Math.round((angle + Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8;
}
export function drawClayMortar(c, u, x, y, power = 1, selected = false, icon = false) {
  const atlas = images.get('atlas'); if (!atlas) return false;
  const size = icon ? 74 : 76*WALL.cannonScale, frame = mortarFrame(u.angle), sw = atlas.naturalWidth / 4, sh = atlas.naturalHeight / 2;
  c.save(); c.translate(x, y);
  if (!icon) { c.beginPath();c.ellipse(0,1,16,3,0,0,Math.PI*2);c.fillStyle='#142f2b38';c.fill(); }
  if (selected && !icon) { c.beginPath(); c.ellipse(0, 1, 18, 5, 0, 0, Math.PI * 2); c.fillStyle='#d2ee9950'; c.fill(); c.lineWidth=1.5; c.strokeStyle='#e9ffb6'; c.stroke(); }
  c.translate(0, (u.recoil || 0) * 3);
  if (power < .4 && !icon) c.filter = 'saturate(.65) brightness(.85)';
  c.drawImage(atlas, (frame % 4) * sw, Math.floor(frame / 4) * sh, sw, sh, -size/2, -size*.79, size, size);
  c.filter='none';
  if (!icon) {
    const level=u.level||1,t=Math.min(4,Math.floor(level/10)),rim=['#c9b98a','#e09a5a','#e2e8ee','#ffd34f','#c78bff'][t]; c.fillStyle='#1d3328ee'; c.beginPath(); c.roundRect(-15,6,30,13,6.5); c.fill(); c.strokeStyle=rim; c.lineWidth=1.3; c.stroke();
    c.font='800 8px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff3d0';c.fillText(`Lv.${level}`,0,12.8);
  }
  c.restore(); return true;
}
export function drawClayMortarIcon(canvas) {
  if (!images.get('atlas')) return false;
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
  c.save();const scale=Math.min(canvas.width/84,canvas.height/82);c.translate(canvas.width/2,canvas.height*.7);c.scale(scale,scale);
  drawClayMortar(c,{angle:Math.PI*.75,level:1},0,0,1,false,true);c.restore();return true;
}
