// Optional remote market relay for static builds: <meta name="stock-siege-api" content="https://…">.
export const API_BASE=(typeof document!=='undefined'&&document.querySelector('meta[name="stock-siege-api"]')?.content||'').replace(/\/$/,'');
export const apiUrl=path=>API_BASE+path;
