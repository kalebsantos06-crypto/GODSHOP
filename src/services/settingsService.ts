import { supabase } from '../lib/supabase';

export const getSetting = async (key: string, userId: string) => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data?.value;
};

export const saveSetting = async (key: string, value: string, userId: string) => {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, user_id: userId, updated_at: new Date() });
  if (error) console.error('Error saving setting:', error);
};

export const migrateSettingsToSupabase = async (userId: string, settingsToMigrate: string[]) => {
    for (const key of settingsToMigrate) {
        const localValue = localStorage.getItem(key);
        if (localValue) {
            await saveSetting(key, localValue, userId);
        }
    }
}

// Device Linking
export const generateDeviceLinkCode = async (userId: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const { error } = await supabase
        .from('device_links')
        .insert({ code, user_id: userId, expires_at: expiresAt.toISOString() });
    
    if (error) throw error;
    return code;
};

export const verifyDeviceLinkCode = async (code: string) => {
    const { data, error } = await supabase
        .from('device_links')
        .select('user_id, expires_at')
        .eq('code', code)
        .single();
    
    if (error || !data) throw new Error('Invalid or expired code');
    if (new Date(data.expires_at) < new Date()) throw new Error('Code expired');

    // Code is valid, return user_id
    return data.user_id;
};
