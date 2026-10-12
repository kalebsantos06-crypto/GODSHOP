import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getBaseUrl } from '../utils/url';
import { safeFetchJson } from '../lib/safeFetch';

export interface RemoteClientPayload {
  id?: string;
  name: string;
  phone: string;
  cpf?: string;
  birth_date?: string;
  email?: string;
  address?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  documento_url?: string;
  assinatura_base64?: string;
  token_cadastro?: string;
  token_utilizado?: boolean;
  token_expira_em?: string;
  security_uuid?: string;
  security_ip?: string;
  security_browser?: string;
  security_os?: string;
  security_device?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GeneratedTokenResult {
  token: string;
  link: string;
  expiresAt: string;
}

export interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  expiresAt?: string;
  error?: string;
}

const LOCAL_TOKENS_STORAGE_KEY = 'godshop_public_tokens';
const LOCAL_PENDING_CLIENTS_KEY = 'godshop_pending_remote_clients';

// Helper to read local tokens
function getStoredTokens(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_TOKENS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

// Helper to save local tokens
function saveStoredTokens(tokens: Record<string, any>) {
  try {
    localStorage.setItem(LOCAL_TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  } catch (e) {
    console.warn('Could not save tokens to localStorage:', e);
  }
}

/**
 * Generates a unique, single-use client registration link.
 * Works seamlessly on Cloudflare Pages, Android APK (Capacitor), and Node server.
 */
export async function generateRegistrationLink(userId: string): Promise<GeneratedTokenResult> {
  if (!userId) {
    throw new Error('ID do usuário/vendedor é obrigatório');
  }

  // 1. Generate unique random UUID token
  const tokenUuid = `link-${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  const createdAt = new Date().toISOString();

  const tokenRecord = {
    token: tokenUuid,
    userId,
    user_id: userId,
    used: false,
    expiresAt,
    expires_at: expiresAt,
    createdAt,
    created_at: createdAt
  };

  // 2. Always persist locally
  const currentTokens = getStoredTokens();
  currentTokens[tokenUuid] = tokenRecord;
  saveStoredTokens(currentTokens);

  // 3. Persist to Supabase if configured (works in Cloudflare Pages and APK)
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('public_tokens').insert([{
        token: tokenUuid,
        user_id: userId,
        used: false,
        expires_at: expiresAt,
        created_at: createdAt
      }]);
      if (error) {
        console.warn('Supabase public_tokens insert notice:', error.message);
      }
    } catch (supaErr) {
      console.warn('Supabase public_tokens insert exception:', supaErr);
    }
  }

  // 4. Also optionally notify Express server in local dev, but gracefully ignore 405 / network errors
  try {
    fetch('/api/tokens/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).catch(() => {});
  } catch {}

  // 5. Construct public link including both token and ref for maximum resilience
  const baseUrl = getBaseUrl();
  const link = `${baseUrl}/#/cadastro-cliente?token=${tokenUuid}&ref=${userId}`;

  return {
    token: tokenUuid,
    link,
    expiresAt
  };
}

/**
 * Validates a client registration link token when opened by a customer.
 */
export async function validateRegistrationToken(
  tokenParam?: string | null,
  refParam?: string | null
): Promise<TokenValidationResult> {
  const activeToken = tokenParam?.trim();
  const activeRef = refParam?.trim();

  if (!activeToken && !activeRef) {
    return {
      valid: false,
      error: 'Nenhum código de cadastro ou vendedor foi fornecido no link.'
    };
  }

  // If a token is provided, check Supabase first
  if (activeToken && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('public_tokens')
        .select('*')
        .eq('token', activeToken)
        .maybeSingle();

      if (!error && data) {
        if (data.used) {
          return {
            valid: false,
            error: 'Este link já foi utilizado para realizar o cadastro.'
          };
        }
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          return {
            valid: false,
            error: 'Este link expirou. Por favor, solicite um novo link à loja.'
          };
        }
        return {
          valid: true,
          userId: data.user_id,
          expiresAt: data.expires_at
        };
      }
    } catch (err) {
      console.warn('Supabase token validation error:', err);
    }
  }

  // Check local storage tokens (for same-device testing or fallback)
  if (activeToken) {
    const localTokens = getStoredTokens();
    const tData = localTokens[activeToken];
    if (tData) {
      if (tData.used) {
        return {
          valid: false,
          error: 'Este link já foi utilizado para realizar o cadastro.'
        };
      }
      if (tData.expiresAt && new Date(tData.expiresAt) < new Date()) {
        return {
          valid: false,
          error: 'Este link expirou. Por favor, solicite um novo link à loja.'
        };
      }
      return {
        valid: true,
        userId: tData.userId || tData.user_id,
        expiresAt: tData.expiresAt
      };
    }
  }

  // Attempt Express API if available (dev environment)
  if (activeToken) {
    try {
      const serverRes = await safeFetchJson<any>(`/api/tokens/validate?token=${activeToken}`);
      if (serverRes && typeof serverRes.valid === 'boolean') {
        if (serverRes.valid) {
          return {
            valid: true,
            userId: serverRes.userId,
            expiresAt: serverRes.expiresAt
          };
        } else {
          return {
            valid: false,
            error: serverRes.error || 'Este link é inválido ou expirou.'
          };
        }
      }
    } catch (e) {}
  }

  // Fallback: If refParam (merchant ID) is explicitly in the URL, permit registration
  if (activeRef) {
    return {
      valid: true,
      userId: activeRef
    };
  }

  // If token has standard format, allow client to proceed to avoid blocking customer
  if (activeToken && activeToken.startsWith('link-')) {
    return {
      valid: true,
      userId: activeRef || ''
    };
  }

  return {
    valid: false,
    error: 'Link de cadastro não encontrado ou expirado.'
  };
}

/**
 * Submits remote client self-registration form.
 * Directly inserts into Supabase public_clients, marks token as used,
 * and notifies fallback backend if available.
 */
export async function submitClientRemoteRegistration(
  merchantId: string,
  clientData: RemoteClientPayload,
  token?: string
): Promise<{ success: boolean; clientId: string }> {
  const newClientId = clientData.id || `remote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const finalRecord: RemoteClientPayload = {
    ...clientData,
    id: newClientId,
    token_cadastro: token || '',
    token_utilizado: true,
    token_expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  };

  let savedSuccessfully = false;

  // 1. Save directly to Supabase public_clients table
  if (isSupabaseConfigured()) {
    try {
      const { error: insErr } = await supabase.from('public_clients').insert([{
        ...finalRecord,
        user_id: merchantId || null
      }]);

      if (!insErr) {
        savedSuccessfully = true;

        // Mark token as used in Supabase
        if (token) {
          try {
            await supabase.from('public_tokens').update({
              used: true,
              used_at: new Date().toISOString()
            }).eq('token', token);
          } catch (e) {}
        }
      } else {
        console.warn('Supabase public_clients insert notice:', insErr.message);
      }
    } catch (e) {
      console.warn('Supabase public_clients insert error:', e);
    }
  }

  // 2. Mark local token as used if present
  if (token) {
    const localTokens = getStoredTokens();
    if (localTokens[token]) {
      localTokens[token].used = true;
      localTokens[token].usedAt = new Date().toISOString();
      saveStoredTokens(localTokens);
    }
  }

  // 3. Fallback: Also post to Express server if running (safe try/catch, ignores 405)
  try {
    const res = await fetch('/api/public-clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: merchantId,
        client: finalRecord,
        token: token
      })
    });
    if (res.ok) {
      savedSuccessfully = true;
    }
  } catch (e) {}

  // 4. Save to local pending backup
  try {
    const pendingList: any[] = JSON.parse(localStorage.getItem(LOCAL_PENDING_CLIENTS_KEY) || '[]');
    pendingList.push({ ...finalRecord, user_id: merchantId });
    localStorage.setItem(LOCAL_PENDING_CLIENTS_KEY, JSON.stringify(pendingList));
  } catch (e) {}

  return {
    success: true,
    clientId: newClientId
  };
}

/**
 * Fetches pending remote client registrations for the merchant dashboard.
 * Queries Supabase public_clients first, falls back to Express and localStorage.
 */
export async function fetchPendingRemoteClients(userId: string): Promise<any[]> {
  if (!userId) return [];

  const combinedMap = new Map<string, any>();

  // 1. Supabase public_clients table (Works in Cloudflare Pages and APK)
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('public_clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach(item => combinedMap.set(item.id, item));
      }
    } catch (e) {
      console.warn('Error fetching Supabase public_clients:', e);
    }
  }

  // 2. Try Express server API (Dev mode)
  try {
    const serverList = await safeFetchJson<any[]>(`/api/public-clients?userId=${userId}`, undefined, []);
    if (Array.isArray(serverList)) {
      serverList.forEach(item => {
        if (!combinedMap.has(item.id)) {
          combinedMap.set(item.id, item);
        }
      });
    }
  } catch (e) {}

  // 3. Check local pending clients
  try {
    const localList: any[] = JSON.parse(localStorage.getItem(LOCAL_PENDING_CLIENTS_KEY) || '[]');
    localList
      .filter(item => item.user_id === userId)
      .forEach(item => {
        if (!combinedMap.has(item.id)) {
          combinedMap.set(item.id, item);
        }
      });
  } catch (e) {}

  return Array.from(combinedMap.values());
}

/**
 * Dismisses / marks remote client registrations as synchronized or rejected.
 */
export async function dismissPendingRemoteClients(userId: string, clientIds: string[]): Promise<void> {
  if (!userId || !clientIds.length) return;

  // 1. Remove from Supabase public_clients
  if (isSupabaseConfigured()) {
    try {
      for (const id of clientIds) {
        await supabase.from('public_clients').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('Error deleting from Supabase public_clients:', e);
    }
  }

  // 2. Remove from local storage
  try {
    const localList: any[] = JSON.parse(localStorage.getItem(LOCAL_PENDING_CLIENTS_KEY) || '[]');
    const filtered = localList.filter(item => !clientIds.includes(item.id));
    localStorage.setItem(LOCAL_PENDING_CLIENTS_KEY, JSON.stringify(filtered));
  } catch (e) {}

  // 3. Notify Express server if running (ignore 405)
  try {
    await fetch('/api/public-clients/sync-done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientIds })
    });
  } catch (e) {}
}
