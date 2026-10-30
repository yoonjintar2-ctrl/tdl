import { WALL } from './config.js?v=182b83ac01';
// A flat seat beneath each ground tower blends into the original wall.
// The renderer and contact geometry split this extension equally north/south.
export function wallMountDepth(cannons,x){
 let strength=0;
 for(const c of cannons){if(c.type==='drone')continue;const distance=Math.abs(c.x-x);if(distance>=WALL.mountRadius)continue;const t=Math.max(0,(distance-WALL.mountShoulder)/(WALL.mountRadius-WALL.mountShoulder));strength=Math.max(strength,1-t*t*(3-2*t));}
 return strength*WALL.mountDepth;
}
