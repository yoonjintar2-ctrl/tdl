import{validSymbol}from'./symbols.js?v=c5c424ee2f';
const key=s=>String(s??'').normalize('NFKC').toLocaleLowerCase().replace(/[\s._-]+/g,'');
export function searchOpenStocks(items,query=''){const q=key(query);return(items||[]).filter(s=>s.eligible&&['pre','regular','post'].includes(s.session)&&validSymbol(s.symbol)&&(!q||key(s.symbol+' '+s.name+' '+(s.searchTerms||'')).includes(q)));}
