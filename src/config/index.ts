import { getBaseUrl } from '../utils/url';

/**
 * GODSHOP Core Configuration & Metadata
 * Centralizes environment settings, Capacitor mobile configuration, and database endpoints.
 */
export const APP_CONFIG = {
  name: 'Godshop',
  displayName: 'GODSHOP Pro',
  id: 'com.godshop.app',
  version: '1.0.0',
  description: 'Sistema completo de gestão comercial, estoque multissegmento, vendas e carnês.',
  androidScheme: 'https',
  defaultThemeColor: '#090d16',
} as const;

export const config = {
  supabaseUrl:
    (typeof localStorage !== 'undefined' && localStorage.getItem('custom_supabase_url')) ||
    import.meta.env.VITE_SUPABASE_URL ||
    'https://placeholder-project.supabase.co',
  supabaseAnonKey:
    (typeof localStorage !== 'undefined' && localStorage.getItem('custom_supabase_key')) ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    'placeholder-anon-key',
  appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://godshop.pages.dev',
};

export const getAppBaseUrl = (): string => {
  return getBaseUrl();
};

export default config;
