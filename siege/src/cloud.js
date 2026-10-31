// Optional account sync — v54: Supabase project jiaqobfriamuxtvxhrls ("yoonjintar0@gmail.com's Project", org of yoonjintar0@gmail.com; login via ChatGPT or GitHub yoonjintar0-commits), table public.siege_saves. Guests play on local storage;
// signing in with email + password keeps one save per account and syncs it across devices.
const SUPABASE_URL = 'https://jiaqobfriamuxtvxhrls.supabase.co';
// Public publishable key (row-level security limits every row to its owner).
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppYXFvYmZyaWFtdXh0dnhocmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDA4NzEsImV4cCI6MjEwNDUxNjg3MX0.qKNNDca85rAxM4vnS4eQ0xQ4IyggJesIMyp_s3zYomI';
const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.min.js';
const HINT = 'stock-siege-cloud-hint';
let client = null, loading = null;
const hint = v => { try { if (v === undefined) return localStorage.getItem(HINT) === '1'; localStorage.setItem(HINT, v ? '1' : '0'); } catch { return false; } };
async function sdk() {
  if (client) return client; if (loading) return loading;
  loading = new Promise((resolve, reject) => { if (window.supabase) return resolve(); const s = document.createElement('script'); s.src = SDK; s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('sdk_unavailable')); document.head.append(s); })
    .then(() => { client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'stock-siege-auth-v2' } }); return client; })
    .finally(() => { loading = null; });
  return loading;
}
export const cloudConfigured = () => !SUPABASE_ANON.includes('PLACEHOLDER');
export async function currentUser() {
  if (!cloudConfigured()) return null;
  const returning = /[?&]code=/.test(location.search) || hint(); if (!returning) return null;
  try { const sb = await sdk(); const { data } = await sb.auth.getSession(); const user = data.session?.user || null; hint(!!user); if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash); return user; } catch { return null; }
}
// Email + password accounts.
export const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const idOf = user => user?.email || '';
const authError = e => { const m = String(e?.message || e || ''); return /already registered|already exists/i.test(m) ? 'taken' : /invalid login|invalid credentials/i.test(m) ? 'wrong' : /not confirmed|confirm/i.test(m) ? 'confirm' : /rate limit/i.test(m) ? 'rate' : /password/i.test(m) ? 'weak' : /email/i.test(m) ? 'email' : 'network'; };
const fail = e => Object.assign(new Error(e.message), { code: authError(e) });
export async function signUpEmail(email, password) { const sb = await sdk(); const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw fail(error); if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) throw Object.assign(new Error('taken'), { code: 'taken' }); if (!data.session) throw Object.assign(new Error('check_email'), { code: 'check_email' }); hint(true); return data.user; }
export async function signInEmail(email, password) { const sb = await sdk(); const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw fail(error); hint(true); return data.user; }
export async function signOut() { try { const sb = await sdk(); await sb.auth.signOut(); } finally { hint(false); } }
export async function pull(user) { const sb = await sdk(); const { data, error } = await sb.from('siege_saves').select('data,updated_at,session_id,session_at').eq('user_id', user.id).maybeSingle(); if (error) throw error; return data ? { data: data.data, updatedAt: Date.parse(data.updated_at), sessionId: data.session_id || null, sessionAt: data.session_at ? Date.parse(data.session_at) : 0 } : null; }
export async function push(user, save) { const sb = await sdk(); const { error } = await sb.from('siege_saves').upsert({ user_id: user.id, data: save, updated_at: new Date(save.savedAt || Date.now()).toISOString() }); if (error) throw error; return true; }

// v23: one active device per account. A new device claims the session; others notice and stop.
export const SESSION_ID = (() => { try { const k = 'stock-siege-session'; let v = sessionStorage.getItem(k); if (!v) { v = (crypto.randomUUID?.() || String(Math.random()).slice(2)) ; sessionStorage.setItem(k, v); } return v; } catch { return String(Math.random()).slice(2); } })();
export async function claimSession(user, save) { const sb = await sdk(); const row = { user_id: user.id, session_id: SESSION_ID, session_at: new Date().toISOString() }; const { data: existing } = await sb.from('siege_saves').select('user_id').eq('user_id', user.id).maybeSingle(); const { error } = existing ? await sb.from('siege_saves').update({ session_id: row.session_id, session_at: row.session_at }).eq('user_id', user.id) : await sb.from('siege_saves').insert({ ...row, data: save || {}, updated_at: new Date().toISOString() }); if (error) throw error; return true; }
export async function sessionState(user) { const sb = await sdk(); const { data, error } = await sb.from('siege_saves').select('session_id,session_at,updated_at').eq('user_id', user.id).maybeSingle(); if (error) throw error; return data ? { sessionId: data.session_id || null, sessionAt: data.session_at ? Date.parse(data.session_at) : 0, updatedAt: Date.parse(data.updated_at) } : null; }

// v46: one-off grants (e.g. gold) written by the operator; applied once per save via grantsApplied.
export async function pullGrant(user){const sb=await sdk();const {data,error}=await sb.from('siege_saves').select('grant_id,grant_gold').eq('user_id',user.id).maybeSingle();if(error)return null;return data&&data.grant_id?{id:data.grant_id,gold:Number(data.grant_gold)||0}:null;}
