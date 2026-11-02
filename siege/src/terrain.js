import{QuarterCamera}from'./camera.js?v=01791418a7';import{WORLD_WIDTH,CAMERA_DEPTH,clamp}from'./config.js?v=01791418a7';
// Ground footprints traced against battlefield-clay-v1. Coordinates are fractions
// of the painted image, so the factory / mountain boundaries survive resizing.
export const TERRAIN_CORRIDOR=[
 [0,.19,.80],[.08,.20,.80],[.15,.16,.83],[.23,.17,.83],[.33,.10,.88],[.44,.09,.91],[.53,.14,.90],[.64,.15,.86],[.73,.19,.87],[.76,.24,.79],[.81,.31,.70],[.86,.31,.69],[.91,.25,.77],[.96,.14,.88],[1,.18,.86]
];
// The battlefield art is fitted by width. On tall phones it stretches (frac=1); on wider screens
// (iPad) it is cropped vertically around the centre, and terrain uses the same mapping so units keep
// avoiding the painted rocks/factories at every aspect ratio.
export const ART_ASPECT=948/1659;
// Cover-fit: wider screens crop top/bottom, taller screens crop the sides. Never stretches the painting.
// v68: the painted road must fill ~2/3 of a phone's width. Zoom into the painting (same aspect — never
// stretched) until the road's typical width reaches ROAD_SHARE of the screen, centred on the road.
// Wider screens (iPad) are capped at the same zoom, so they simply show more of the scenery.
export const ROAD_SHARE=.72;const zoomCache=new WeakMap();
export function roadSpan(corridor){const t=corridor||TERRAIN_CORRIDOR;if(zoomCache.has(t))return zoomCache.get(t);const ws=[],cs=[];for(let y=.3;y<=.85;y+=.025){const[l,r]=corridorFrom(t,y);ws.push(r-l);cs.push((l+r)/2);}ws.sort((a,b)=>a-b);cs.sort((a,b)=>a-b);const out={width:ws[ws.length>>1],centre:cs[cs.length>>1]};zoomCache.set(t,out);return out;}
export function artCrop(viewHeight,aspect=ART_ASPECT,corridor=null){const screen=WORLD_WIDTH/viewHeight;let top,frac,left,wfrac;if(screen>=aspect){frac=aspect/screen;top=(1-frac)*.5;left=0;wfrac=1;}else{wfrac=screen/aspect;frac=1;top=0;left=(1-wfrac)*.5;}
 if(corridor===false)return{top,frac,left,wfrac};const road=roadSpan(corridor),phoneW=(.462/aspect),zoom=clamp(road.width/ROAD_SHARE<phoneW?phoneW/(road.width/ROAD_SHARE):1,1,1.6);
 if(zoom>1){wfrac/=zoom;frac/=zoom;top=clamp(top+(1-1/zoom)*frac*zoom*.5,0,1-frac);}if(wfrac<1)left=clamp(road.centre-wfrac/2,0,1-wfrac);/* road centred under the forward outpost (#78) */return{top,frac,left,wfrac};}
export function corridorFrom(table,t){t=clamp(t,0,1);const i=table.findIndex(p=>p[0]>=t);if(i<=0)return table[0].slice(1);const a=table[i-1],b=table[i],u=(t-a[0])/(b[0]-a[0]);return[a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];}
export function corridorAt(t){t=clamp(t,0,1);const i=TERRAIN_CORRIDOR.findIndex(p=>p[0]>=t);if(i<=0)return TERRAIN_CORRIDOR[0].slice(1);const a=TERRAIN_CORRIDOR[i-1],b=TERRAIN_CORRIDOR[i],u=(t-a[0])/(b[0]-a[0]);return[a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];}
export class TerrainField{
 constructor(height){this.camera=new QuarterCamera(height);this.height=height;this.viewHeight=height*CAMERA_DEPTH;}
 bounds(y,x=216,radius=0){const c=this.camera,p=c.project(x,y),crop=artCrop(this.viewHeight,this.aspect,this.corridor),[l0,r0]=(this.corridor?corridorFrom(this.corridor,crop.top+p.y/this.viewHeight*crop.frac):corridorAt(crop.top+p.y/this.viewHeight*crop.frac)),l=(l0-crop.left)/crop.wfrac,r=(r0-crop.left)/crop.wfrac,margin=radius*.45+2;/* v49: road uses its full painted width */return{left:(l*WORLD_WIDTH+margin-c.b*y-c.tx)/c.a,right:(r*WORLD_WIDTH-margin-c.b*y-c.tx)/c.a};}
 setArt(aspect,corridor){this.aspect=aspect;this.corridor=corridor;}
 // Lanes are a global fraction of the spawn line, so actors that spawn outside the narrow
 // northern corridor do not double up with actors already occupying those lane fractions.
 projectSpawn(e){const b=this.bounds(e.y+e.radius,e.x,e.radius),inside=e.x>=b.left&&e.x<=b.right,offscreen=e.y<=0||e.y>=this.height,lane=offscreen||!inside?clamp((e.x-18)/(WORLD_WIDTH-36),.04,.96):clamp((e.x-b.left)/(b.right-b.left),.02,.98);if(!inside)e.x=b.left+(b.right-b.left)*lane;e.terrainLane=lane;}
 move(e,dy,speed,dt){
  const lead=this.bounds(e.y+e.radius+Math.sign(dy)*38,e.x,e.radius),current=this.bounds(e.y+e.radius,e.x,e.radius),next=this.bounds(e.y+e.radius+dy,e.x,e.radius),left=Math.max(current.left,next.left)+1,right=Math.min(current.right,next.right)-1;
  const laneTarget=Number.isFinite(e.wallSlot)?e.wallSlot:Number.isFinite(e.terrainLane)?lead.left+(lead.right-lead.left)*e.terrainLane:e.x,target=clamp(laneTarget,left,right);e.x+=clamp(target-e.x,-speed*1.4*dt,speed*1.4*dt);
  const safe=this.bounds(e.y+e.radius+dy,e.x,e.radius);if(e.x>=safe.left&&e.x<=safe.right)e.y+=dy;
 }
}
