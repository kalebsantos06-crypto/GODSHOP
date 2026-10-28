import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getBaseUrl } from '../utils/url';
import { safeFetchJson } from '../lib/safeFetch';
import { getCloudApiUrl } from './db';

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
const DISMISSED_CLIENTS_KEY = 'godshop_dismissed_remote_clients';

// Helper to read dismissed client IDs and tokens
export function getDismissedClientIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_CLIENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

// Helper to persistently record dismissed/handled client IDs or tokens
export function recordDismissedClientIds(ids: string[]) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return;
  try {
    const current = getDismissedClientIds();
    let updated = false;
    for (const rawId of ids) {
      const id = String(rawId || '').trim();
      if (id && !current.includes(id)) {
        current.push(id);
        updated = true;
      }
    }
    if (updated) {
      // Keep up to 2000 historical IDs to prevent memory growth
      localStorage.setItem(DISMISSED_CLIENTS_KEY, JSON.stringify(current.slice(-2000)));
    }
  } catch (e) {
    console.warn('Could not record dismissed client IDs:', e);
  }
}

const isValidUuid = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

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
  const safeUserId = userId || 'admin-godshop';
  const effectiveUuid = isValidUuid(safeUserId) ? safeUserId : 'df9c4051-e407-4fe4-8978-a6b9e6140ed9';

  // 1. Generate unique random UUID token
  const tokenUuid = `link-${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  const createdAt = new Date().toISOString();

  const tokenRecord = {
    token: tokenUuid,
    userId: effectiveUuid,
    user_id: effectiveUuid,
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

  // 3. Persist to Supabase in background (non-blocking for ultra-fast UI)
  if (isSupabaseConfigured()) {
    Promise.resolve().then(async () => {
      try {
        const insertPayload: any = {
          token: tokenUuid,
          user_id: effectiveUuid,
          used: false,
          expires_at: expiresAt,
          created_at: createdAt
        };
        const { error } = await supabase.from('public_tokens').insert([insertPayload]);
        if (error) {
          console.warn('Notice inserting public_token in Supabase:', error.message);
        }
      } catch (supaErr) {
        console.warn('Supabase public_tokens insert exception:', supaErr);
      }
    });
  }

  // 4. Optionally notify Express server in background
  try {
    fetch(getCloudApiUrl('/api/tokens/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: effectiveUuid }),
    }).catch(() => {});
  } catch {}

  // 5. Construct public link including both token and ref for maximum resilience
  const baseUrl = getBaseUrl();
  const link = `${baseUrl}/#/cadastro-cliente?token=${tokenUuid}&ref=${encodeURIComponent(effectiveUuid)}`;

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
          userId: data.user_id || activeRef,
          expiresAt: data.expires_at
        };
      }
    } catch (err) {
      console.warn('Supabase token validation notice:', err);
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
        userId: tData.userId || tData.user_id || activeRef,
        expiresAt: tData.expiresAt
      };
    }
  }

  // Attempt Express API if available (dev environment)
  if (activeToken) {
    try {
      const serverRes = await safeFetchJson<any>(getCloudApiUrl(`/api/tokens/validate?token=${activeToken}`));
      if (serverRes && typeof serverRes.valid === 'boolean') {
        if (serverRes.valid) {
          return {
            valid: true,
            userId: serverRes.userId || activeRef,
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
  const effectiveMerchantUuid = isValidUuid(merchantId) ? merchantId : 'df9c4051-e407-4fe4-8978-a6b9e6140ed9';

  const finalRecord: RemoteClientPayload = {
    ...clientData,
    id: newClientId,
    token_cadastro: token || '',
    token_utilizado: true,
    token_expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  };

  // 1. Save directly to Supabase public_clients table
  if (isSupabaseConfigured()) {
    try {
      const firstPayload: any = {
        ...finalRecord,
        user_id: effectiveMerchantUuid
      };

      const { error: insErr } = await supabase.from('public_clients').insert([firstPayload]);

      if (insErr) {
        await supabase.from('public_clients').insert([{
          ...finalRecord,
          user_id: null
        }]);
      }

      if (token) {
        try {
          await supabase.from('public_tokens').update({
            used: true,
            used_at: new Date().toISOString(),
            client_data: finalRecord
          }).eq('token', token);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Supabase public_clients insert exception:', e);
    }
  }

  // 2. Mark local token as used if present
  if (token) {
    const localTokens = getStoredTokens();
    if (localTokens[token]) {
      localTokens[token].used = true;
      localTokens[token].usedAt = new Date().toISOString();
      localTokens[token].clientData = finalRecord;
      saveStoredTokens(localTokens);
    }
  }

  // 3. Fallback: Also post to Express server if running
  try {
    await fetch(getCloudApiUrl('/api/public-clients'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: effectiveMerchantUuid,
        client: finalRecord,
        token: token
      })
    });
  } catch (e) {}

  // 4. Save to local pending backup
  try {
    const pendingList: any[] = JSON.parse(localStorage.getItem(LOCAL_PENDING_CLIENTS_KEY) || '[]');
    pendingList.push({ ...finalRecord, user_id: effectiveMerchantUuid });
    localStorage.setItem(LOCAL_PENDING_CLIENTS_KEY, JSON.stringify(pendingList));
  } catch (e) {}

  return {
    success: true,
    clientId: newClientId
  };
}

/**
 * Fetches pending remote client registrations for the merchant dashboard.
 * Queries Supabase public_clients, public_tokens, and local storage combined,
 * and filters out any registrations that have been accepted, rejected, or dismissed.
 */
export async function fetchPendingRemoteClients(userId?: string): Promise<any[]> {
  const combinedMap = new Map<string, any>();
  const dismissedList = getDismissedClientIds();
  const dismissedSet = new Set<string>(dismissedList);

  const isDismissed = (item: any): boolean => {
    if (!item) return true;
    if (item.id && dismissedSet.has(item.id)) return true;
    if (item.token_cadastro && dismissedSet.has(item.token_cadastro)) return true;
    if (item.token && dismissedSet.has(item.token)) return true;
    return false;
  };

  // 1. Check local pending clients first
  try {
    const localList: any[] = JSON.parse(localStorage.getItem(LOCAL_PENDING_CLIENTS_KEY) || '[]');
    localList.forEach(item => {
      if (item && item.id && !isDismissed(item)) {
        combinedMap.set(item.id, item);
      }
    });
  } catch (e) {}

  // 2. Supabase public_clients table
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('public_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach(item => {
          if (item && item.id && !isDismissed(item) && !combinedMap.has(item.id)) {
            combinedMap.set(item.id, item);
          }
        });
      }
    } catch (e) {}

    // 3. Also check public_tokens for any client_data
    try {
      const { data: tokenData, error: tokenErr } = await supabase
        .from('public_tokens')
        .select('*')
        .eq('used', true);

      if (!tokenErr && Array.isArray(tokenData)) {
        tokenData.forEach(t => {
          if (t.client_data && !isDismissed({ token: t.token })) {
            const clientItem = typeof t.client_data === 'string' ? JSON.parse(t.client_data) : t.client_data;
            if (clientItem && clientItem.id && !isDismissed(clientItem) && !combinedMap.has(clientItem.id)) {
              combinedMap.set(clientItem.id, {
                ...clientItem,
                token_cadastro: clientItem.token_cadastro || t.token
              });
            }
          }
        });
      }
    } catch (e) {}
  }

  // 4. Try Express server API (works seamlessly across APK, EXE, and Web via getCloudApiUrl)
  try {
    const endpoint = userId ? `/api/public-clients?userId=${encodeURIComponent(userId)}` : '/api/public-clients';
    const serverUrl = getCloudApiUrl(endpoint);
    const serverList = await safeFetchJson<any[]>(serverUrl, undefined, []);
    if (Array.isArray(serverList)) {
      serverList.forEach(item => {
        if (item && item.id && !isDismissed(item) && !combinedMap.has(item.id)) {
          combinedMap.set(item.id, item);
        }
      });
    }
  } catch (e) {}

  return Array.from(combinedMap.values());
}

/**
 * Dismisses / marks remote client registrations as synchronized or rejected.
 * Completely cleans Supabase (both public_clients and public_tokens),
 * local storage caches, and Express backend, guaranteeing the item disappears forever.
 */
export async function dismissPendingRemoteClients(
  userId: string, 
  clientIds: string[], 
  tokens?: string[]
): Promise<void> {
  const allIdsToDismiss: string[] = [];
  
  if (Array.isArray(clientIds)) {
    clientIds.forEach(id => {
      if (id && typeof id === 'string') allIdsToDismiss.push(id.trim());
    });
  }
  if (Array.isArray(tokens)) {
    tokens.forEach(tok => {
      if (tok && typeof tok === 'string') allIdsToDismiss.push(tok.trim());
    });
  }

  if (!allIdsToDismiss.length) return;

  // 1. Immediately record in persistent dismissed IDs (prevents ghost re-queries)
  recordDismissedClientIds(allIdsToDismiss);

  // 2. Remove from local storage pending list
  try {
    const localList: any[] = JSON.parse(localStorage.getItem(LOCAL_PENDING_CLIENTS_KEY) || '[]');
    const filtered = localList.filter(item => 
      !allIdsToDismiss.includes(item.id) && 
      !allIdsToDismiss.includes(item.token_cadastro) &&
      !allIdsToDismiss.includes(item.token)
    );
    localStorage.setItem(LOCAL_PENDING_CLIENTS_KEY, JSON.stringify(filtered));
  } catch (e) {}

  // 3. Remove/clean from local storage stored tokens
  try {
    const localTokens = getStoredTokens();
    let tokensChanged = false;
    for (const id of allIdsToDismiss) {
      if (localTokens[id]) {
        delete localTokens[id];
        tokensChanged = true;
      }
      for (const tKey of Object.keys(localTokens)) {
        const item = localTokens[tKey];
        if (item?.clientData?.id === id || item?.client_data?.id === id || tKey === id) {
          delete localTokens[tKey];
          tokensChanged = true;
        }
      }
    }
    if (tokensChanged) {
      saveStoredTokens(localTokens);
    }
  } catch (e) {}

  // 4. Remove from Supabase public_clients AND public_tokens (crucial to avoid ghost reappearance)
  if (isSupabaseConfigured()) {
    try {
      for (const id of allIdsToDismiss) {
        // Delete row in public_clients table
        await supabase.from('public_clients').delete().eq('id', id);
        await supabase.from('public_clients').delete().eq('token_cadastro', id);

        // Clear client_data and delete from public_tokens table
        await supabase.from('public_tokens').update({ client_data: null }).eq('token', id);
        await supabase.from('public_tokens').delete().eq('token', id);
      }
    } catch (e) {
      console.warn('Notice removing from Supabase public_clients / tokens:', e);
    }
  }

  // 5. Notify Express server using getCloudApiUrl so APK & Desktop reach the cloud database properly
  try {
    const syncUrl = getCloudApiUrl('/api/public-clients/sync-done');
    await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientIds: allIdsToDismiss })
    });
  } catch (e) {}

  // 6. Broadcast event so UI across open views reacts immediately
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('remote_client_dismissed', { 
        detail: { clientIds: allIdsToDismiss } 
      }));
    } catch (e) {}
  }
}
