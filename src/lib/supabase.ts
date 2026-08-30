import { createClient } from '@supabase/supabase-js';

const dummyUrl = 'https://placeholder-project.supabase.co';
const dummyKey = 'placeholder-anon-key';

const getRawUrl = (): string => {
  try {
    const custom = typeof localStorage !== 'undefined' ? localStorage.getItem('custom_supabase_url') : null;
    if (custom && custom.trim()) return custom.trim();
  } catch (e) {}
  return import.meta.env.VITE_SUPABASE_URL || '';
};

const getRawKey = (): string => {
  try {
    const custom = typeof localStorage !== 'undefined' ? localStorage.getItem('custom_supabase_key') : null;
    if (custom && custom.trim()) return custom.trim();
  } catch (e) {}
  return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
};

let supabaseUrl = getRawUrl();
if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.slice(0, -9);
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.slice(0, -8);
}

const supabaseAnonKey = getRawKey();

export const isSupabaseConfigured = (): boolean => {
  const url = getRawUrl();
  const key = getRawKey();
  return Boolean(url && key && !url.includes('placeholder-project'));
};

export const setCustomSupabaseCredentials = (url: string, key: string) => {
  try {
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/rest/v1/')) {
      cleanUrl = cleanUrl.slice(0, -9);
    } else if (cleanUrl.endsWith('/rest/v1')) {
      cleanUrl = cleanUrl.slice(0, -8);
    }
    localStorage.setItem('custom_supabase_url', cleanUrl);
    localStorage.setItem('custom_supabase_key', key.trim());
  } catch (e) {}
};

export const clearCustomSupabaseCredentials = () => {
  try {
    localStorage.removeItem('custom_supabase_url');
    localStorage.removeItem('custom_supabase_key');
  } catch (e) {}
};

export const clearStaleAuthTokens = () => {
  if (typeof localStorage === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('sb-') || k.includes('auth-token') || k === 'supabase.auth.token')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
  } catch (e) {}
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables or localStorage.');
}

export const supabase = createClient(supabaseUrl || dummyUrl, supabaseAnonKey || dummyKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-auth-token',
    // Implements a safe no-op lock function to prevent navigator.locks Permission/Security errors inside sandboxed iframes (such as the AI Studio preview window)
    // which otherwise throws Lock-stolen / Lock-broken failures that can block network fetch queries.
    // Handles any callback signature by executing the callback function passed as the last argument.
    lock: async (...args: any[]) => {
      const fn = args[args.length - 1];
      if (typeof fn === 'function') {
        return await fn();
      }
    }
  }
});

