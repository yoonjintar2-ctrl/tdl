// Optional account sync (Supabase, shared with the TDL project). Guests play on local storage;
// signing in with Google keeps one save per account and syncs it across devices.
const SUPABASE_URL = 'https://bigmdpmwkalrezxdkbwt.supabase.co';
// Public anon key (row-level security limits every row to its owner).
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZ21kcG13a2FscmV6eGRrYnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjA4NzQsImV4cCI6MjEwMDkzNjg3NH0.V7xzifSsdoKBw7GYvNTOZ0o2llGe6Gx_Ap5v4snyDSg';
const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
const HINT = 'stock-siege-cloud-hint';
let client = null, loading = null;
const hint = v => { try { if (v === undefined) return localStorage.getItem(HINT) === '1'; localStorage.setItem(HINT, v ? '1' : '0'); } catch { return false; } };
async function sdk() {
  if (client) return client; if (loading) return loading;
  loading = new Promise((resolve, reject) => { if (window.supabase) return resolve(); const s = document.createElement('script'); s.src = SDK; s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('sdk_unavailable')); document.head.append(s); })
    .then(() => { client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'stock-siege-auth' } }); return client; })
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
export async function pull(user) { const sb = await sdk(); const { data, error } = await sb.from('siege_saves').select('data,updated_at').eq('user_id', user.id).maybeSingle(); if (error) throw error; return data ? { data: data.data, updatedAt: Date.parse(data.updated_at) } : null; }
export async function push(user, save) { const sb = await sdk(); const { error } = await sb.from('siege_saves').upsert({ user_id: user.id, data: save, updated_at: new Date(save.savedAt || Date.now()).toISOString() }); if (error) throw error; return true; }
