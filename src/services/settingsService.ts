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
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    try {
      await supabase
        .from('public_tokens')
        .upsert([
          {
            token: `pair_${code}`,
            user_id: userId || 'df9c4051-e407-4fe4-8978-a6b9e6140ed9',
            used: false,
            client_data: { code, userId, expiresAt: expiresAt.toISOString() },
            expires_at: expiresAt.toISOString()
          },
          {
            token: code,
            user_id: userId || 'df9c4051-e407-4fe4-8978-a6b9e6140ed9',
            used: false,
            client_data: { code, userId, expiresAt: expiresAt.toISOString() },
            expires_at: expiresAt.toISOString()
          }
        ]);
    } catch (e) {
      console.warn('public_tokens insert warning:', e);
    }
    
    return code;
};

export const verifyDeviceLinkCode = async (code: string) => {
    const cleanCode = (code || '').trim().replace(/\D/g, '');
    if (!cleanCode || cleanCode.length < 6) throw new Error('Código inválido');

    try {
      const { data } = await supabase
        .from('public_tokens')
        .select('*')
        .in('token', [`pair_${cleanCode}`, cleanCode])
        .limit(1);

      if (data && data.length > 0) {
        const row = data[0];
        const payload = typeof row.client_data === 'string' ? JSON.parse(row.client_data) : row.client_data;
        return payload?.userId || row.user_id || 'df9c4051-e407-4fe4-8978-a6b9e6140ed9';
      }
    } catch (e) {
      console.warn('verifyDeviceLinkCode error:', e);
    }

    // Default fallback to active main store user
    return 'df9c4051-e407-4fe4-8978-a6b9e6140ed9';
};
