/**
 * Centralized Configuration for Godshop
 * Handles production settings, Supabase keys, and public app URL.
 */

export const config = {
  supabaseUrl: (typeof localStorage !== 'undefined' && localStorage.getItem('custom_supabase_url')) || import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co',
  supabaseAnonKey: (typeof localStorage !== 'undefined' && localStorage.getItem('custom_supabase_key')) || import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://godshop.app'
};

export const getAppBaseUrl = (): string => {
  if (typeof window === 'undefined') return 'https://godshop.app';
  let url = window.location.href.split('#')[0].split('?')[0].replace(/\/$/, '');
  // Remove AI Studio preview container prefixes if present in production or share links
  if (url.includes('ais-dev-')) {
    url = url.replace('ais-dev-', 'ais-pre-');
  }
  return url;
};
