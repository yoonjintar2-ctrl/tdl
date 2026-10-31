import{clamp}from'./config.js?v=703d700c91';
// A game estimate, NOT aggressor-classified trades. Preserve total volume exactly.
export function estimateCandleFlow(c,previous=null){
 if(!c||![c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite)||c.volume<0||!Number.isSafeInteger(c.volume)||c.low<=0||c.high<Math.max(c.open,c.close)||c.low>Math.min(c.open,c.close))return null;
 const range=c.high-c.low,previousClose=previous?.close??c.open,scale=Math.max(range,previous?previous.high-previous.low:0,c.close*.00001),body=range?(c.close-c.open)/range:0,location=range?(2*c.close-c.high-c.low)/range:0,movement=clamp((c.close-previousClose)/scale,-1,1),buyShare=clamp(.5+.5*(.45*location+.35*body+.20*movement),.05,.95),buyVolume=Math.round(c.volume*buyShare);
 return{volume:c.volume,buyVolume,sellVolume:c.volume-buyVolume,buyShare,range,body,movement,method:'OHLC_PRICE_PRESSURE_V1',estimated:true};
}
