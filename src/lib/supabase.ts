import { createClient } from '@supabase/supabase-js';

const dummyUrl = 'https://placeholder-project.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.slice(0, -9);
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.slice(0, -8);
}
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
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
