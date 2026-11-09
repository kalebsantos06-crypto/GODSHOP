import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

/**
 * Shared Supabase Client instance for GODSHOP
 */
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;
