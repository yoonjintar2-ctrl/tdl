import{QuarterCamera}from'./camera.js?v=182b83ac01';import{WALL,DRONE,ACTOR_STYLE}from'./config.js?v=182b83ac01';import{SPRITE_MUZZLES}from'./weapon-anchors.js?v=182b83ac01';
export const spriteFrame=(angle,count=4)=>((Math.round((angle+Math.PI/2)/(Math.PI*2/count))%count)+count)%count;
export function weaponMuzzle(game,c){
 const camera=new QuarterCamera(game.height),pos=game.cannonPosition(c),base=camera.cannonAnchor(c,game),a=camera.project(pos.x,pos.y),b=camera.project(pos.x+Math.cos(c.angle||0)*20,pos.y+Math.sin(c.angle||0)*20),angle=Math.atan2(b.y-a.y,b.x-a.x),frame=spriteFrame(angle,c.type==='mortar'?8:4),size=c.type==='mortar'?76*WALL.cannonScale:c.type==='drone'?70*ACTOR_STYLE.droneScale:78*WALL.cannonScale,offset=SPRITE_MUZZLES[c.type]?.[frame]||[0,-.4],recoil=(c.recoil||0)*(c.type==='mortar'?3:2.3),bob=c.type==='drone'?Math.sin(game.time*3.1)*2:0,z=c.type==='drone'?DRONE.altitude:WALL.elevation,screen={x:base.x+offset[0]*size,y:base.y+offset[1]*size+recoil+bob};
 return{...camera.unproject(screen.x,screen.y,z),z,screen,frame};
}
