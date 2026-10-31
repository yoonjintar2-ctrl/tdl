import{validSymbol,stockFor}from'./symbols.js?v=f49daceb71';
import{apiUrl}from'./api.js?v=f49daceb71';
import{estimateCandleFlow}from'./candle-flow.js?v=f49daceb71';
import { SYMBOL, SCENARIOS, clamp } from './config.js?v=f49daceb71';
/** Provider contract: subscribe(snapshot), update(realSeconds), destroy().
 * Snapshot: source/status/symbol/market/price/previousClose/changePct/time,
 * candle {time,open,high,low,close,volume}, candles[], buyVolume, sellVolume,
 * averageVolumePerSecond, tradeClassification. Estimates are explicitly labelled.
 * Actual classified executions, unavailable classification, and OHLC estimates
 * must remain distinct. OHLC estimates partition the unchanged actual total;
 * they are never labelled real aggressor trade counts.
 */
export class MarketDataProvider {
  constructor() { this.listeners = new Set(); }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(snapshot) { this.listeners.forEach(fn => fn(snapshot)); }
  update() { throw new Error('MarketDataProvider.update must be implemented'); }
  destroy() { this.listeners.clear(); }
}
export const MARKET_ERRORS = {
  connection_required:'무료 데이터 계정을 연결해 주세요.',
  invalid_credentials:'API 키를 확인해 주세요. 키 내용은 저장하거나 표시하지 않았습니다.',
  feed_access_denied:'이 계정에서 통합 시세 접근이 허용되지 않았습니다.',
  provider_rate_limited:'데이터 제공사의 요청 한도에 도달했습니다. 잠시 후 다시 연결합니다.',
  network_unavailable:'시세 연결이 끊겼습니다. 마지막 수신 시각을 확인해 주세요.',
  session_unavailable:'보안 연결을 준비 중입니다. 잠시 후 다시 시도해 주세요.',
  no_market_data:'이 종목에서 수신된 거래 데이터가 없습니다.',invalid_symbol:'지원하는 종목을 선택해 주세요.',
  previous_close_unavailable:'전일 종가를 받지 못했습니다.',
  try_again_shortly:'잠시 후 다시 시도해 주세요.',
  invalid_data:'제공받은 시세 형식을 확인할 수 없습니다.',
  provider_unavailable:'데이터 제공사에 연결할 수 없습니다.',
};
// Public one-minute chart feed. It is explicitly NOT a tick-stream promise.
export class LiveMarketDataProvider extends MarketDataProvider{
 constructor({symbol='SOXL',fetcher=(...a)=>globalThis.fetch(...a),now=Date.now}={}){super();if(!validSymbol(symbol))throw Error('invalid_symbol');this.symbol=symbol;this.fetcher=fetcher;this.now=now;this.clock=0;this.interval=5;this.busy=false;this.destroyed=false;this.controllers=new Set();this.seen=new Set();this.last={source:stockFor(symbol).market==='KR'?'NAVER_KR':'YAHOO_CHART',symbol,market:stockFor(symbol).market,status:'connecting',price:null,previousClose:null,changePct:null,time:null,priceTime:null,volumeTime:null,priceSource:'YAHOO_CHART',volumeSource:'YAHOO_1MIN',priceStatus:'connecting',volumeStatus:'connecting',priceError:null,volumeError:null,pricePollSeconds:5,delayMinutes:null,candle:null,candles:[],quoteHistory:[],buyVolume:null,sellVolume:null,tradeClassification:'estimated-candle-flow',barEvent:null,barEvents:[]};}
 publish(patch){this.last={...this.last,barEvent:null,barEvents:[],...patch};this.emit({...this.last});}
 start(){return this.refresh();}
 async refresh(){if(this.busy||this.destroyed)return;this.busy=true;this.clock=0;const controller=new AbortController(),started=this.now(),timer=setTimeout(()=>controller.abort(),15000);this.controllers.add(controller);try{const r=await this.fetcher(apiUrl('/api/market?provider=yahoo&symbol=')+encodeURIComponent(this.symbol),{credentials:'same-origin',cache:'no-store',signal:controller.signal});let s;try{s=await r.json();}catch{throw Object.assign(Error('invalid_data'),{code:'invalid_data'});}if(!r.ok)throw Object.assign(Error(s.error||'provider_unavailable'),{code:s.error||'provider_unavailable'});if(this.destroyed)return;
  if(s.source!==(stockFor(this.symbol).market==='KR'?'NAVER_KR':'YAHOO_CHART')||s.symbol!==this.symbol||!Number.isFinite(s.price)||s.price<=0||!Number.isFinite(s.priceTime)||!Number.isFinite(s.receivedAt)||!Array.isArray(s.candles)||s.tradeClassification!=='estimated-candle-flow')throw Object.assign(Error('invalid_data'),{code:'invalid_data'});
  if(this.last.volumeTime&&s.volumeTime<this.last.volumeTime)return;const receivedAt=s.receivedAt+Math.max(0,this.now()-started),c=s.candle,validFlow=c&&Number.isSafeInteger(c.volume)&&c.volume>0&&Number.isSafeInteger(s.buyVolume)&&s.buyVolume>=0&&Number.isSafeInteger(s.sellVolume)&&s.sellVolume>=0&&s.buyVolume+s.sellVolume===c.volume;
  let barEvent=null;if(validFlow&&s.volumeStatus==='minute'&&s.playbackStart<=receivedAt&&receivedAt<s.playbackEnd&&!this.seen.has(c.time)){barEvent={time:c.time,volume:c.volume,buyVolume:s.buyVolume,sellVolume:s.sellVolume,baselineVolume:s.baselineVolume,playbackStart:s.playbackStart,playbackEnd:s.playbackEnd,receivedAt,estimated:true};this.seen.add(c.time);while(this.seen.size>100)this.seen.delete(this.seen.values().next().value);}
  // Extended-hours minutes often arrive with volume 0. Instead of an empty field, spawn a lighter
  // army sized by that minute's price movement, clearly labelled as price-driven (not volume).
  const silent=c&&['zero_volume','no_volume'].includes(s.volumeStatus)&&[c.open,c.high,c.low,c.close].every(Number.isFinite)&&c.close>0;let volumeNote=s.volumeNote;
  if(silent){volumeNote='거래량 0 제공 · 가격 변동으로 군집 생성';if(!barEvent&&s.playbackStart<=receivedAt&&receivedAt<s.playbackEnd&&!this.seen.has(c.time)){const prev=(s.candles||[]).filter(x=>x.time<c.time&&Number.isFinite(x.close)).at(-1),move=Math.max(c.high-c.low,Math.abs(c.close-(prev?.close??c.open)))/c.close*100,base=1000,volume=Math.round(base*clamp(move/.12,.15,2.5)),flow=estimateCandleFlow({time:c.time,open:c.open,high:c.high,low:c.low,close:c.close,volume},prev?{open:prev.open??prev.close,high:prev.high??prev.close,low:prev.low??prev.close,close:prev.close,volume:0}:null);if(flow){barEvent={time:c.time,volume,buyVolume:flow.buyVolume,sellVolume:flow.sellVolume,baselineVolume:base,playbackStart:s.playbackStart,playbackEnd:s.playbackEnd,receivedAt,estimated:true,priceDriven:true};this.seen.add(c.time);while(this.seen.size>100)this.seen.delete(this.seen.values().next().value);}}}
  this.interval=s.market==='KR'?7:5;this.publish({...s,volumeNote,priceError:null,volumeError:null,barEvent,barEvents:barEvent?[barEvent]:[]});
 }catch(e){if(!this.destroyed){const code=e.code||'network_unavailable';this.interval=code==='provider_rate_limited'?60:15;this.publish({status:'unavailable',priceStatus:'unavailable',volumeStatus:'unavailable',priceError:code,volumeError:code});}}finally{clearTimeout(timer);this.controllers.delete(controller);this.busy=false;}}
 update(dt){this.clock+=dt;if(this.clock>=this.interval)this.refresh();}
 destroy(){this.destroyed=true;for(const c of this.controllers)c.abort();this.controllers.clear();super.destroy();}
}
export class AlpacaMarketDataProvider extends MarketDataProvider {
  constructor({fetcher=(...args)=>globalThis.fetch(...args),now=Date.now,symbol='SOXL'}={}) {
    super();if(!validSymbol(symbol))throw Error('invalid_symbol');this.symbol=symbol;this.fetcher=fetcher;this.now=now;this.priceClock=0;this.volumeClock=0;this.priceBusy=false;this.volumeBusy=false;this.destroyed=false;this.seen=new Map();this.controllers=new Set();
    this.last={source:'ALPACA_HYBRID',status:'connecting',symbol:this.symbol,market:'US',price:null,previousClose:null,changePct:null,time:null,priceTime:null,volumeTime:null,priceSource:'ALPACA_IEX',volumeSource:'ALPACA_SIP',priceStatus:'connecting',volumeStatus:'connecting',priceError:null,volumeError:null,candle:null,candles:[],buyVolume:null,sellVolume:null,tradeClassification:'minute-candle-direction',delayMinutes:16,pricePollSeconds:2,quoteHistory:[],barEvent:null,barEvents:[]};
  }
  publish(patch){
    this.last={...this.last,barEvent:null,barEvents:[],...patch};const p=this.last;
    const priceReady=Number.isFinite(p.price)&&['live','last_trade'].includes(p.priceStatus),volumeReady=['delayed','no_recent_trades'].includes(p.volumeStatus);
    p.status=priceReady&&volumeReady?'ready':priceReady||volumeReady?'partial':p.priceStatus==='connecting'||p.volumeStatus==='connecting'?'connecting':p.priceStatus==='connection_required'||p.volumeStatus==='connection_required'?'connection_required':'unavailable';
    this.emit({...p});
  }
  async read(path){
    const controller=new AbortController();this.controllers.add(controller);const timer=setTimeout(()=>controller.abort(),15000);
    try{const response=await this.fetcher(path+'?provider=alpaca&symbol='+encodeURIComponent(this.symbol),{credentials:'same-origin',cache:'no-store',signal:controller.signal});let data;try{data=await response.json();}catch{throw Object.assign(new Error('invalid_data'),{code:'invalid_data'});}if(!response.ok)throw Object.assign(new Error(data.error||'provider_unavailable'),{code:data.error||'provider_unavailable'});return data;}
    finally{clearTimeout(timer);this.controllers.delete(controller);}
  }
  start(){return this.refresh();}
  refresh(){return Promise.all([this.refreshPrice(),this.refreshVolume()]);}
  async refreshPrice(){
    if(this.priceBusy||this.destroyed)return;this.priceBusy=true;this.priceClock=0;
    try{const s=await this.read('/api/market/price');if(this.destroyed)return;
      if(s.symbol&&s.symbol!==this.symbol)throw Object.assign(new Error('invalid_data'),{code:'invalid_data'});
      if(s.source!=='ALPACA_IEX'||!Number.isFinite(s.price)||s.price<=0||!Number.isFinite(s.time))throw Object.assign(new Error('invalid_data'),{code:'invalid_data'});
      // Drop an older response instead of rewinding a live wall.
      if(Number.isFinite(this.last.priceTime)&&s.time<this.last.priceTime)return;
      const quoteHistory=this.last.quoteHistory.filter(p=>s.time-p.time<86400000),bucket=Math.floor(s.time/60000),idx=quoteHistory.findIndex(p=>Math.floor(p.time/60000)===bucket);if(idx>=0)quoteHistory[idx]={time:s.time,price:s.price};else quoteHistory.push({time:s.time,price:s.price});
      this.publish({quoteHistory:quoteHistory.slice(-1500),price:s.price,previousClose:s.previousClose,changePct:s.changePct,time:s.time,priceTime:s.time,priceStatus:s.status,priceError:null,priceReferenceError:s.referenceError,barEvent:null});
    }catch(error){if(!this.destroyed){const code=error.code||'network_unavailable';this.publish({...code==='connection_required'?{price:null,changePct:null,time:null,priceTime:null}: {},priceStatus:code==='connection_required'?'connection_required':'unavailable',priceError:code,barEvent:null});}}
    finally{this.priceBusy=false;}
  }
  async refreshVolume(){
    if(this.volumeBusy||this.destroyed)return;this.volumeBusy=true;this.volumeClock=0;
    try{const s=await this.read('/api/market');if(this.destroyed)return;
      if(s.symbol&&s.symbol!==this.symbol)throw Object.assign(new Error('invalid_data'),{code:'invalid_data'});
      if(s.source!=='ALPACA_SIP'||!Number.isFinite(s.time)||!Array.isArray(s.candles)||!s.candle||!Number.isFinite(s.candle.volume))throw Object.assign(new Error('invalid_data'),{code:'invalid_data'});
      if(Number.isFinite(this.last.volumeTime)&&s.time<this.last.volumeTime)return;
      const barsByTime=new Map(s.candles.map(c=>[c.time,c]));barsByTime.set(s.candle.time,s.candle);const candles=[...barsByTime.values()].sort((a,b)=>a.time-b.time),first=!Number.isFinite(this.last.volumeTime),candidates=first?[s.candle]:candles.filter(c=>c.time>=this.last.volumeTime).slice(-3),barEvents=[];
      for(const c of candidates){const old=this.seen.get(c.time)||0,delta=Math.max(0,c.volume-old);if(s.status==='delayed'&&delta>0)barEvents.push({time:c.time,volume:delta,direction:Math.sign(c.close-c.open),baselineVolume:s.baselineVolume});}
      for(const c of candles)this.seen.set(c.time,Math.max(this.seen.get(c.time)||0,c.volume));this.seen.set(s.candle.time,Math.max(this.seen.get(s.candle.time)||0,s.candle.volume));while(this.seen.size>1200)this.seen.delete(this.seen.keys().next().value);
      const barEvent=barEvents.at(-1)||null;
      // Delayed OHLCV deliberately cannot overwrite current IEX price/percent/time.
      this.publish({candle:s.candle,candles:s.candles,baselineVolume:s.baselineVolume,volumeTime:s.time,volumeStatus:s.status,volumeError:null,barEvent,barEvents});
    }catch(error){if(!this.destroyed){const code=error.code||'network_unavailable';this.publish({...code==='connection_required'?{candle:null,candles:[],volumeTime:null}: {},volumeStatus:code==='connection_required'?'connection_required':'unavailable',volumeError:code,barEvent:null});}}
    finally{this.volumeBusy=false;}
  }
  update(dt){this.priceClock+=dt;this.volumeClock+=dt;if(this.priceClock>=2)this.refreshPrice();if(this.volumeClock>=20)this.refreshVolume();}
  destroy(){this.destroyed=true;for(const c of this.controllers)c.abort();this.controllers.clear();super.destroy();}
}
export class DemoMarketDataProvider extends MarketDataProvider {
  constructor({ random = Math.random,symbol='SOXL' } = {}) {
    super();this.symbol=validSymbol(symbol)?symbol:'SOXL'; this.random = random; this.speed = 1; this.accumulator = 0; this.elapsed = 0; this.scenarioTime = 0;
    this.scenario = 'rise'; this.price = SYMBOL.previousClose; this.anchor = 0; this.candles = [];
    this.time = Date.UTC(2026, 9, 29, 13, 30, 0); this.manual = null; this.last = null;
    // Warm-up uses the same tick path, so chart OHLCV is consistent with prices.
    for (let i = 0; i < 600; i++) this.tick(false);
    this.setScenario('rise');
  }
  setScenario(value) { if (!SCENARIOS.some(s => s[0] === value)) return; this.scenario = value; this.scenarioTime = 0; this.anchor = this.changePct; this.manual = null; }
  get changePct() { return (this.price / SYMBOL.previousClose - 1) * 100; }
  setManual(pct) { if (pct === null) { this.manual = null; this.anchor = this.changePct; this.scenarioTime = 0; return; } if (!Number.isFinite(pct)) return; this.manual = clamp(pct, -90, 300); this.price = SYMBOL.previousClose * (1 + this.manual / 100); this.tick(); }
  update(dt) { this.accumulator += dt * this.speed; while (this.accumulator >= 1) { this.accumulator--; this.tick(); } }
  tick(publish = true) {
    this.elapsed++; this.scenarioTime++; this.time += 1000;
    const t = this.scenarioTime, phase = (t % 160) / 160, r = this.random;
    let drift = .012, buyStrength = 1.1, sellStrength = .9;
    if (this.scenario === 'fall') { drift = -.014; buyStrength = .75; sellStrength = 1.4; }
    if (this.scenario === 'flat') { drift = -(this.changePct - this.anchor) * .05; buyStrength = sellStrength = .8; }
    if (this.scenario === 'sell') { drift = -.055; buyStrength = .35; sellStrength = 5.2 + r() * 2.5; }
    if (this.scenario === 'buy') { drift = .055; buyStrength = 5.2 + r() * 2.5; sellStrength = .4; }
    if (this.scenario === 'pump' || this.scenario === 'rebound') {
      const rising = (phase < .45) === (this.scenario === 'pump');
      drift = rising ? .13 : -.16; buyStrength = rising ? 4.5 : .5; sellStrength = rising ? .5 : 5;
    }
    const next = this.manual ?? clamp(this.changePct + drift + (r() - .5) * .16, -85, 200);
    this.price = SYMBOL.previousClose * (1 + next / 100);
    const buyVolume = Math.round(SYMBOL.averageVolumePerSecond * buyStrength * (.6 + r() * .8));
    const sellVolume = Math.round(SYMBOL.averageVolumePerSecond * sellStrength * (.6 + r() * .8));
    const bucket = Math.floor(this.time / 60000) * 60000;
    let candle = this.candles.at(-1);
    if (!candle || candle.time !== bucket) {
      candle = { time: bucket, open: this.price, high: this.price, low: this.price, close: this.price, volume: 0 };
      this.candles.push(candle); if (this.candles.length > 42) this.candles.shift();
    }
    candle.high = Math.max(candle.high, this.price); candle.low = Math.min(candle.low, this.price); candle.close = this.price; candle.volume += buyVolume + sellVolume;
    this.last = { source: 'SIMULATED', status: 'demo', symbol:this.symbol, market:stockFor(this.symbol).market, price: this.price, previousClose: SYMBOL.previousClose,
      changePct: this.changePct, time: this.time, candle: { ...candle }, candles: this.candles.map(c => ({ ...c })), buyVolume, sellVolume,
      averageVolumePerSecond: SYMBOL.averageVolumePerSecond, tradeClassification: 'simulated-exclusive-aggressor', scenario: this.scenario };
    if (publish) this.emit(this.last);
    return this.last;
  }
}

