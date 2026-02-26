'use strict';

function getSupabaseConfig() {
  const cfg = window.DEVICELY_SUPABASE || {};
  const url = (cfg.url || '').trim();
  const anonKey = (cfg.anonKey || '').trim();
  const invalid = !url || !anonKey || url.includes('YOUR-PROJECT') || anonKey.includes('YOUR_SUPABASE');
  return { url, anonKey, invalid };
}

function getSupabaseClient() {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    return null;
  }
  const { url, anonKey, invalid } = getSupabaseConfig();
  if (invalid) return null;
  if (!window.__DEVICELY_SUPABASE_CLIENT__) {
    window.__DEVICELY_SUPABASE_CLIENT__ = window.supabase.createClient(url, anonKey);
  }
  return window.__DEVICELY_SUPABASE_CLIENT__;
}

async function getCurrentSession() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session || null;
}

function getNextPath(defaultPath) {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (!next) return defaultPath;
  if (next.startsWith('http://') || next.startsWith('https://')) return defaultPath;
  if (next.includes('..')) return defaultPath;
  return next.startsWith('/') ? next.slice(1) : next;
}

window.getSupabaseClient = getSupabaseClient;
window.getCurrentSession = getCurrentSession;
window.getSupabaseConfig = getSupabaseConfig;
window.getNextPath = getNextPath;
