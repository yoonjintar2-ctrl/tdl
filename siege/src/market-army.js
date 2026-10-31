import{WORLD_WIDTH,SETTINGS,clamp}from'./config.js?v=dcdc5554e3';
// Actors visualize normalized volume, never individual shares. Keep a visible
// crowd in quiet traded minutes, then increase the size and frequency of surges.
export function swarmCount(intensity){return Math.round(clamp(1200*Math.pow(intensity,.4),480,SETTINGS.swarmMinuteCap));}
function formation({count,buyCount,intensity,now,duration,wallNow=null,budgetCap=520}){
 const weight=Math.min(budgetCap,Math.max(2,Math.round(intensity*120)))/count;
 const packs=Math.max(1,Math.ceil(duration/1.8)),period=duration/packs,ranks={buy:0,sell:0};
 return Array.from({length:count},(_,i)=>{
  const side=Math.floor((i+1)*buyCount/count)>Math.floor(i*buyCount/count)?'buy':'sell',rank=ranks[side]++,group=Math.floor(i*packs/count),within=i-Math.ceil(group*count/packs),groupCount=Math.ceil((group+1)*count/packs)-Math.ceil(group*count/packs),fraction=within/Math.max(1,groupCount),phase=fraction<.82?fraction/.82*.52:.52+(fraction-.82)/.18*.48,offset=Math.min(duration-.001,group*period+phase*period),column=(rank*13+Math.floor(rank/28)*5)%28,jitter=Math.sin(rank*12.9898+group*3.17)*.28;
  return{at:now+offset,...(wallNow==null?{}:{spawnAt:wallNow+offset*1000,expiresAt:wallNow+duration*1000}),side,weight,kind:side==='sell'?(intensity>=.8&&(rank===7||rank===Math.floor((count-buyCount)*.55))?3:(intensity>3&&rank%9===0)||(intensity>1.2&&rank%17===0)||rank%31===15?2:(intensity>1.5&&rank%5===0)||(intensity>.7&&rank%9===0)||rank%23===11?2:rank%4===0?1:rank%5===1?4:0):rank%6,x:22+(column+.5+jitter)*(WORLD_WIDTH-44)/28,y:side==='sell'?-18-Math.floor(within/28)*7:undefined};
 });
}
export function estimatedArmy(event,now,wallNow){
 if(!(event?.volume>0&&event.baselineVolume>0)||!Number.isFinite(event.buyVolume)||event.buyVolume<0||!Number.isFinite(event.sellVolume)||event.sellVolume<0||event.buyVolume+event.sellVolume!==event.volume)return[];
 const duration=Math.min(60,Math.max(0,(event.playbackEnd-event.receivedAt)/1000));if(!duration)return[];
 const intensity=clamp(event.volume/event.baselineVolume,.02,8),count=swarmCount(intensity),rawBuy=event.buyVolume===0?0:event.sellVolume===0?count:clamp(Math.round(count*event.buyVolume/event.volume),1,count-1);
 // v23: friendly bull crowds are thinned to 60% so the field doesn't flood with supplies.
 const buyCount=rawBuy?Math.max(1,Math.round(rawBuy*.6)):0;
 return formation({count:count-rawBuy+buyCount,buyCount,intensity,now,duration,wallNow});
}
export function marketArmy(event,now){
 if(!(event?.volume>0&&event.baselineVolume>0)||![-1,1].includes(event.direction))return[];
 const intensity=clamp(event.volume/event.baselineVolume,.02,8),count=swarmCount(intensity);
 return formation({count,buyCount:event.direction>0?count:0,intensity,now,duration:60,budgetCap:event.direction>0?360:520});
}
