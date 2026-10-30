const SEARCH_NAMES={SOXL:'Direxion semiconductor bull 반도체 레버리지',SOXS:'Direxion semiconductor bear 인버스',NVDA:'Nvidia',AMD:'Advanced Micro Devices',AVGO:'Broadcom',TSM:'Taiwan Semiconductor TSMC',MU:'Micron',ARM:'Arm Holdings',ASML:'ASML',MSFT:'Microsoft',GOOGL:'Google Alphabet 구글',AMZN:'Amazon',META:'Meta Facebook 페이스북',PLTR:'Palantir',AAPL:'Apple',TSLA:'Tesla',SPY:'SPDR S&P500 에스앤피',QQQ:'Invesco Nasdaq 나스닥',IWM:'Russell 러셀',JPM:'JPMorgan Chase 제이피모건',KO:'Coca Cola',XOM:'Exxon Mobil',GLD:'Gold 금'};
// Supported data symbols are shared by client and server. No arbitrary URL paths.
const US_STOCKS=[
 ['SOXL','반도체 3×',true],['SOXS','반도체 인버스 3×',true],['NVDA','엔비디아',true],['AMD','AMD',true],['AVGO','브로드컴',true],['TSM','TSMC',true],['MU','마이크론',true],['ARM','Arm',true],['ASML','ASML',true],['MSFT','마이크로소프트',true],['GOOGL','알파벳',true],['AMZN','아마존',true],['META','메타',true],['PLTR','팔란티어',true],
 ['AAPL','애플',true],['TSLA','테슬라',true],['SPY','S&P 500',false],['QQQ','나스닥 100',false],['IWM','러셀 2000',false],['JPM','JP모건',false],['KO','코카콜라',false],['XOM','엑슨모빌',false],['GLD','금 ETF',false]
].map(([symbol,name,ai])=>Object.freeze({symbol,name,ai,market:'US',searchTerms:SEARCH_NAMES[symbol]||''}));
const KR_STOCKS=[
 ['005930','삼성전자',true,'Samsung Electronics 삼성'],['000660','SK하이닉스',true,'SK Hynix 하이닉스'],
 ['005380','현대차',false,'Hyundai Motor 현대자동차'],['000270','기아',false,'Kia'],
 ['035420','NAVER',true,'네이버 Naver'],['035720','카카오',false,'Kakao'],
 ['373220','LG에너지솔루션',false,'LG Energy Solution 엘지 배터리'],['207940','삼성바이오로직스',false,'Samsung Biologics 삼바'],
 ['068270','셀트리온',false,'Celltrion'],['105560','KB금융',false,'KB Financial 국민은행']
].map(([symbol,name,ai,searchTerms])=>Object.freeze({symbol,name,ai,market:'KR',searchTerms}));
export const STOCKS=[...US_STOCKS,...KR_STOCKS];
export const stockFor=symbol=>STOCKS.find(s=>s.symbol===symbol);
export const validSymbol=symbol=>!!stockFor(symbol);
export const isAIStock=symbol=>stockFor(symbol)?.ai===true;
