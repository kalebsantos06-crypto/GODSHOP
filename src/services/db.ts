import { supabase } from '../lib/supabase';
import { iPhone, Client, Supplier, Sale, PriceTableItem, Console } from '../types';

let authenticatedUserId: string | null = null;
let lastKnownUserIdFromRows: string | null = null;
let isSeeding = false;
let seedingPromise: Promise<void> | null = null;

// Listen for auth state changes to keep authenticatedUserId in sync
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    authenticatedUserId = session.user.id;
  } else if (event === 'SIGNED_OUT') {
    authenticatedUserId = null;
    lastKnownUserIdFromRows = null;
  }
});

const getCurrentUserId = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error && session?.user) {
      authenticatedUserId = session.user.id;
      return session.user.id;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!userError && user) {
      authenticatedUserId = user.id;
      return user.id;
    }
  } catch (e) {
    console.error('Error getting session:', e);
  }
  
  try {
    const cachedUserStr = localStorage.getItem('auth_cached_user');
    if (cachedUserStr) {
      const cachedUser = JSON.parse(cachedUserStr);
      if (cachedUser && cachedUser.id) {
        authenticatedUserId = cachedUser.id;
        return cachedUser.id;
      }
    }
  } catch (e) {
    console.error('Error reading cached user from localStorage:', e);
  }
  
  return authenticatedUserId || lastKnownUserIdFromRows;
};

const tryCacheUserIdFromRows = (rows: any[]) => {
  if (rows && rows.length > 0) {
    for (const row of rows) {
      if (row && row.user_id && row.user_id !== 'dev-user-id') {
        lastKnownUserIdFromRows = row.user_id;
        break;
      }
    }
  }
};

// --- LOCAL STORAGE RESILIENCY ENGINE ---
const getLocalData = (table: string): any[] => {
  try {
    const data = localStorage.getItem(`db_fallback_${table}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error reading local data for ${table}:`, e);
    return [];
  }
};

const setLocalData = (table: string, data: any[]) => {
  try {
    localStorage.setItem(`db_fallback_${table}`, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving local data for ${table}:`, e);
  }
};

const isConnectionError = (err: any): boolean => {
  if (!err) return false;
  const message = (err.message || '').toLowerCase();
  const rawString = String(err).toLowerCase();
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('load') ||
    message.includes('connect') ||
    message.includes('dns') ||
    message.includes('cors') ||
    rawString.includes('failed to fetch') ||
    rawString.includes('typeerror') ||
    rawString.includes('networkerror')
  );
};

const notifyOffline = (err: any) => {
  console.warn('Supabase Connection Blocked / Offline. Operating in LocalStorage fallback mode.', err);
  window.dispatchEvent(new CustomEvent('supabase_offline_status', { detail: { offline: true, error: err } }));
};

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const db = {
  clearUser: () => {
    authenticatedUserId = null;
    lastKnownUserIdFromRows = null;
  },
  syncAll: async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('Cannot sync: No authenticated user');
      throw new Error('Usuário não autenticado. Por favor, faça login.');
    }

    const tables = ['clients', 'suppliers', 'iphones', 'consoles', 'sales', 'prices'];
    const results = { synced: 0, failed: 0 };
    const missingColumnsByTable: Record<string, Set<string>> = {};

    for (const table of tables) {
      const localItems = getLocalData(table);
      if (localItems.length === 0) continue;
      
      let tableModified = false;
      missingColumnsByTable[table] = new Set();

      for (const item of localItems) {
        try {
          // Clean the item: remove nested objects and null values that might cause issues
          let cleanItem: any = { ...item, user_id: userId };
          
          if (table === 'sales') {
            const validFrequencies = ['Semanal', 'Quinzenal', 'Mensal'];
            let freq: any = cleanItem.installment_frequency;
            
            if (freq && typeof freq !== 'string') {
              freq = String(freq);
            }
            
            if (typeof freq === 'string' && freq.trim()) {
              const trimmed = freq.trim();
              const lower = trimmed.toLowerCase();
              if (lower.startsWith('seman')) freq = 'Semanal';
              else if (lower.startsWith('quinzen')) freq = 'Quinzenal';
              else if (lower.startsWith('mens')) freq = 'Mensal';
              else freq = 'Mensal';
            } else {
              freq = 'Mensal';
            }
            
            // Re-verify strictly
            if (!validFrequencies.includes(freq)) {
              freq = 'Mensal';
            }
            
            // Force valid value on both cleanItem (for DB) and original item (for cache)
            cleanItem.installment_frequency = freq;
            if (item.installment_frequency !== freq) {
              item.installment_frequency = freq;
              tableModified = true;
            }

            // Ensure date fields are either valid ISO strings or null (avoid empty strings)
            if (cleanItem.first_installment_date === "") {
              cleanItem.first_installment_date = null;
              tableModified = true;
            }
            if (cleanItem.sale_date === "") {
              cleanItem.sale_date = new Date().toISOString();
              tableModified = true;
            }

            // CRITICAL: Proactively remove ALL known problematic columns that are NOT in the DB schema
            const salesCalculatedFields = [
              'installments_paid', 
              'installments_list', 
              'client', 
              'iphone', 
              'console', 
              'supplier',
              'first_installment_date_formatted',
              'client_name',
              'item_name'
            ];
            salesCalculatedFields.forEach(col => {
              if (col in cleanItem) {
                delete cleanItem[col];
                tableModified = true;
              }
            });
          }
          
          // List of known nested object keys to remove before syncing
          const keysToRemove = ['iphone', 'console', 'client', 'supplier', 'installments_list'];
          keysToRemove.forEach(key => delete cleanItem[key]);
          
          // Remove columns previously identified as missing for this table
          missingColumnsByTable[table].forEach(col => delete cleanItem[col]);

          // Attempt upsert with retry logic for missing columns
          let retryCount = 0;
          let currentError: any = null;
          
          while (retryCount < 5) {
            const { error } = await supabase.from(table).upsert(cleanItem);
            currentError = error;
            
            if (!error) break;

            // Handle specific error: Check Constraint Violation
            if (error.code === '23514') {
              if (table === 'sales' && error.message?.includes('installment_frequency')) {
                cleanItem.installment_frequency = 'Mensal';
                item.installment_frequency = 'Mensal';
                tableModified = true;
                retryCount++;
                continue;
              }
              break; // Unrecoverable constraint error
            }

            // Handle specific column missing errors
            if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache')) {
              // Extract column name from error message
              // Example: "Could not find the 'first_installment_date' column of 'sales' in the schema cache"
              const columnMatch1 = error.message?.match(/column ['"](.+?)['"]/);
              const columnMatch2 = error.message?.match(/['"](.+?)['"] column/);
              
              const columnName = (columnMatch2 ? columnMatch2[1] : null) || (columnMatch1 ? columnMatch1[1] : null);

              if (columnName) {
                console.warn(`Removing missing column '${columnName}' from ${table} and retrying...`);
                missingColumnsByTable[table].add(columnName);
                delete cleanItem[columnName];
                retryCount++;
                continue;
              }
            }
            
            // If we're here, it's either not a column error or we couldn't identify the column
            break;
          }

          if (!currentError) {
            results.synced++;
          } else {
            if (isConnectionError(currentError) || currentError.message?.includes('Failed to fetch') || String(currentError).includes('Failed to fetch')) {
              console.warn(`Error syncing ${table} item ${item.id}:`, currentError.message || currentError);
            } else {
              console.error(`Error syncing ${table} item ${item.id}:`, currentError.message || currentError);
            }
            results.failed++;
          }
        } catch (e: any) {
          if (isConnectionError(e) || e.message?.includes('Failed to fetch') || String(e).includes('Failed to fetch')) {
            console.warn(`Network error syncing ${table} item ${item.id}:`, e.message || e);
          } else {
            console.error(`Fatal error syncing ${table} item ${item.id}:`, e.message || e);
          }
          results.failed++;
        }
      }
      
      if (tableModified) {
        setLocalData(table, localItems);
      }
    }

    return { 
      success: true, 
      message: `Sincronização concluída: ${results.synced} itens enviados, ${results.failed} falhas.`,
      stats: results 
    };
  },
  storageHelper: {
    getTables: () => ['prices', 'clients', 'suppliers', 'iphones', 'consoles', 'sales'],
    getTableData: (table: string) => getLocalData(table),
    clearTable: (table: string) => setLocalData(table, []),
    saveTable: (table: string, data: any[]) => setLocalData(table, data),
    getAllStorageInfo: () => {
      const tables = ['prices', 'clients', 'suppliers', 'iphones', 'consoles', 'sales'];
      return tables.map(t => ({
        name: t,
        count: getLocalData(t).length,
        size: JSON.stringify(getLocalData(t)).length
      }));
    }
  },
  prices: {
    list: async () => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('prices').select('*');
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.order('model', { ascending: true });
        if (error) throw error;
        tryCacheUserIdFromRows(data);
        setLocalData('prices', data || []);
        return data as PriceTableItem[];
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          return getLocalData('prices') as PriceTableItem[];
        }
        throw err;
      }
    },
    create: async (data: Omit<PriceTableItem, 'id'>) => {
      const id = generateId();
      const insertData = { ...data, id } as any;
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          insertData.user_id = userId;
        }
        const { data: newItem, error } = await supabase.from('prices').insert(insertData).select().single();
        if (error) throw error;
        
        const local = getLocalData('prices');
        setLocalData('prices', [...local, newItem]);
        return newItem as PriceTableItem;
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const newItem = { ...data, id } as PriceTableItem;
          const local = getLocalData('prices');
          setLocalData('prices', [...local, newItem]);
          return newItem;
        }
        throw err;
      }
    },
    update: async (id: string, data: Partial<PriceTableItem>) => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('prices').update(data).eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { error } = await query;
        if (error) throw error;

        const local = getLocalData('prices');
        setLocalData('prices', local.map(item => item.id === id ? { ...item, ...data } : item));
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const local = getLocalData('prices');
          setLocalData('prices', local.map(item => item.id === id ? { ...item, ...data } : item));
          return;
        }
        throw err;
      }
    },
    delete: async (id: string) => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('prices').delete().eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { error } = await query;
        if (error) throw error;

        const local = getLocalData('prices');
        setLocalData('prices', local.filter(item => item.id !== id));
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const local = getLocalData('prices');
          setLocalData('prices', local.filter(item => item.id !== id));
          return;
        }
        throw err;
      }
    }
  },
  iphones: {
    list: async () => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('iphones').select('*');
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.order('buy_date', { ascending: false });
        if (error) throw error;
        tryCacheUserIdFromRows(data);
        
        const local = getLocalData('iphones');
        const merged = [...(data || []), ...local.filter(l => !data?.some(d => d.id === l.id))];
        setLocalData('iphones', merged);
        return merged as iPhone[];
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          return getLocalData('iphones') as iPhone[];
        }
        throw err;
      }
    },
    create: async (data: Omit<iPhone, 'id'>) => {
      const id = generateId();
      const insertData = { ...data, id } as any;
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          insertData.user_id = userId;
        }
        let { data: newItem, error } = await supabase.from('iphones').insert(insertData).select().single();
        
        if (error) {
          const isColumnError = error.code === '42703' || error.message?.includes('user_id') || error.message?.includes('coluna');
          if (isColumnError) {
            const { user_id, ...cleanData } = insertData;
            const { data: retryItem, error: retryError } = await supabase.from('iphones').insert(cleanData).select().single();
            if (!retryError) {
              newItem = retryItem;
              error = null;
            } else {
              error = retryError;
            }
          }
        }

        if (error) {
          if (error.code === '42501' || error.message?.includes('row-level security')) {
            console.warn('RLS Violation on iphones table. Falling back to local storage.', error);
            const fallbackItem = { ...insertData } as iPhone;
            const local = getLocalData('iphones');
            setLocalData('iphones', [...local, fallbackItem]);
            return fallbackItem;
          }
          throw error;
        }

        const local = getLocalData('iphones');
        setLocalData('iphones', [...local, newItem]);
        return newItem as iPhone;
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const newItem = { ...data, id } as iPhone;
          const local = getLocalData('iphones');
          setLocalData('iphones', [...local, newItem]);
          return newItem;
        }
        throw err;
      }
    },
    update: async (id: string, data: Partial<iPhone>) => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('iphones').update(data).eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { error } = await query;
        if (error) throw error;

        const local = getLocalData('iphones');
        setLocalData('iphones', local.map(item => item.id === id ? { ...item, ...data } : item));
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const local = getLocalData('iphones');
          setLocalData('iphones', local.map(item => item.id === id ? { ...item, ...data } : item));
          return;
        }
        throw err;
      }
    },
    delete: async (id: string) => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('iphones').delete().eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { error } = await query;
        if (error) throw error;

        const local = getLocalData('iphones');
        setLocalData('iphones', local.filter(item => item.id !== id));
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const local = getLocalData('iphones');
          setLocalData('iphones', local.filter(item => item.id !== id));
          return;
        }
        throw err;
      }
    }
  },
  clients: {
    list: async () => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('clients').select('*');
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;
        tryCacheUserIdFromRows(data);

        // Auto-seed if core data is missing or user has no clients
        const coreNames = ['Ramon Dornelas Borges Henrique', 'Yuri dos Santos Gonçalves', 'Carlos Eduardo Reis Coelho'];
        const missingCore = coreNames.some(name => !data?.some(c => c.name.toLowerCase().includes(name.toLowerCase())));
        const isEmpty = !data || data.length === 0;

        if (missingCore || (userId && isEmpty)) {
          if (!seedingPromise) {
            seedingPromise = db.autoSeed();
          }
          
          try {
            await seedingPromise;
            // Re-fetch now that seeding is done with a fresh query
            let reQuery = supabase.from('clients').select('*');
            if (userId) {
              reQuery = reQuery.eq('user_id', userId);
            }
            
            const { data: reData, error: reError } = await reQuery.order('name', { ascending: true });
            
            if (!reError && reData && reData.length > 0) {
              const local = getLocalData('clients');
              const merged = [...(reData || []), ...local.filter(l => !reData?.some(d => d.id === l.id))];
              setLocalData('clients', merged);
              return merged as Client[];
            }
          } catch (seedErr) {
            console.error('Error in automatic database seeding:', seedErr);
          }
        }

        const local = getLocalData('clients');
        const merged = [...(data || []), ...local.filter(l => !data?.some(d => d.id === l.id))];
        setLocalData('clients', merged);
        return merged as Client[];
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          return getLocalData('clients') as Client[];
        }
        throw err;
      }
    },
    create: async (data: Omit<Client, 'id'>) => {
      const id = generateId();
      const insertData = { ...data, id } as any;
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          insertData.user_id = userId;
        }

        // 1. Check if a client with the same CPF, phone, or email already exists in Supabase
        let existingId: string | null = null;
        const cleanCpf = data.cpf ? data.cpf.replace(/\D/g, '') : '';
        const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : '';
        const cleanEmail = data.email ? data.email.trim().toLowerCase() : '';

        try {
          if (cleanCpf) {
            const { data: found } = await supabase.from('clients').select('id').eq('cpf', data.cpf).maybeSingle();
            if (found) existingId = found.id;
          }
          if (!existingId && cleanPhone) {
            const { data: found } = await supabase.from('clients').select('id').eq('phone', data.phone).maybeSingle();
            if (found) existingId = found.id;
          }
          if (!existingId && cleanEmail) {
            const { data: found } = await supabase.from('clients').select('id').eq('email', data.email).maybeSingle();
            if (found) existingId = found.id;
          }
        } catch (findErr) {
          console.warn("Could not query existing client in Supabase:", findErr);
        }

        if (existingId) {
          console.log(`Cliente já existente detectado com ID: ${existingId}. Atualizando em vez de criar duplicado.`);
          const { id: _, ...updateData } = insertData;
          await db.clients.update(existingId, updateData);
          
          // Return the updated client object
          const updatedClient = { ...insertData, id: existingId } as Client;
          return updatedClient;
        }
        
        let newItem: any = null;
        let attemptError: any = null;
        let currentData = { ...insertData };
        let maxRetries = 20; // Safeguard against infinite loops
        
        while (maxRetries > 0) {
          const { data: resData, error } = await supabase.from('clients').insert(currentData).select().single();
          if (!error) {
            newItem = resData;
            attemptError = null;
            break;
          }
          
          attemptError = error;
          
          // Check for undefined column (code 42703) or column error message
          if (error.code === '42703') {
            const match = error.message.match(/"([^"]+)"/);
            if (match && match[1]) {
              const columnName = match[1];
              console.warn(`Column "${columnName}" does not exist in Supabase clients table. Removing and retrying...`);
              delete currentData[columnName];
              maxRetries--;
              continue;
            }
          }
          
          // Fallback check for user_id or other column errors not in double quotes
          if (error.message?.includes('user_id') && currentData.user_id) {
            console.warn(`Removing user_id and retrying...`);
            delete currentData.user_id;
            maxRetries--;
            continue;
          }
          
          break; // If another error or cannot extract column, break to handle it
        }

        if (attemptError) {
          // Check for RLS violation
          if (attemptError.code === '42501' || attemptError.message?.includes('row-level security')) {
            console.warn('RLS Violation on clients table. Using local fallback.', attemptError);
            const fallbackItem = { ...insertData } as Client;
            const local = getLocalData('clients');
            setLocalData('clients', [...local, fallbackItem]);
            return fallbackItem;
          }
          throw attemptError;
        }

        const local = getLocalData('clients');
        const updatedLocal = [...local.filter(l => l.id !== newItem.id), newItem];
        setLocalData('clients', updatedLocal);
        return newItem as Client;
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
        }
        
        // Local UPSERT fallback
        const local = getLocalData('clients');
        const cleanCpf = data.cpf ? data.cpf.replace(/\D/g, '') : '';
        const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : '';
        const cleanEmail = data.email ? data.email.trim().toLowerCase() : '';
        
        let localExisting = local.find(l => 
          (cleanCpf && l.cpf && l.cpf.replace(/\D/g, '') === cleanCpf) ||
          (cleanPhone && l.phone && l.phone.replace(/\D/g, '') === cleanPhone) ||
          (cleanEmail && l.email && l.email.trim().toLowerCase() === cleanEmail)
        );

        if (localExisting) {
          console.log(`Local existing client found. Updating...`);
          const updatedLocalList = local.map(item => 
            item.id === localExisting.id ? { ...item, ...data } : item
          );
          setLocalData('clients', updatedLocalList);
          return { ...localExisting, ...data } as Client;
        } else {
          const newItem = { ...data, id } as Client;
          setLocalData('clients', [...local, newItem]);
          return newItem;
        }
      }
    },
    update: async (id: string, data: Partial<Client>) => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('clients').update(data).eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { error } = await query;
        if (error) throw error;

        const local = getLocalData('clients');
        setLocalData('clients', local.map(item => item.id === id ? { ...item, ...data } : item));
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const local = getLocalData('clients');
          setLocalData('clients', local.map(item => item.id === id ? { ...item, ...data } : item));
          return;
        }
        throw err;
      }
    },
    delete: async (id: string) => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('clients').delete().eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { error } = await query;
        if (error) throw error;

        const local = getLocalData('clients');
        setLocalData('clients', local.filter(item => item.id !== id));
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const local = getLocalData('clients');
          setLocalData('clients', local.filter(item => item.id !== id));
          return;
        }
        throw err;
      }
    }
  },
  suppliers: {
    list: async () => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('suppliers').select('*');
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;
        tryCacheUserIdFromRows(data);
        
        // Merge with local data to prevent wiping out RLS-fallback items
        const local = getLocalData('suppliers');
        const merged = [...(data || []), ...local.filter(l => !data?.some(d => d.id === l.id))];
        setLocalData('suppliers', merged);
        return merged as Supplier[];
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          return getLocalData('suppliers') as Supplier[];
        }
        const isColumnError = err?.code === '42703' || err?.message?.includes('user_id') || err?.message?.includes('coluna');
        if (isColumnError) {
          try {
            const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
            if (error) throw error;
            
            const local = getLocalData('suppliers');
            const merged = [...(data || []), ...local.filter(l => !data?.some(d => d.id === l.id))];
            setLocalData('suppliers', merged);
            return merged as Supplier[];
          } catch (innerErr: any) {
            if (isConnectionError(innerErr)) {
              notifyOffline(innerErr);
              return getLocalData('suppliers') as Supplier[];
            }
            throw innerErr;
          }
        }
        throw err;
      }
    },
    create: async (data: Omit<Supplier, 'id'>) => {
      const id = generateId();
      const insertData = { ...data, id } as any;
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          insertData.user_id = userId;
        }

        let { data: newItem, error } = await supabase.from('suppliers').insert(insertData).select().single();
        
        if (error) {
          const isColumnError = error.code === '42703' || error.message?.includes('user_id') || error.message?.includes('coluna');
          if (isColumnError) {
            const { user_id, ...cleanData } = insertData;
            const { data: retryItem, error: retryError } = await supabase.from('suppliers').insert(cleanData).select().single();
            if (!retryError) {
              newItem = retryItem;
              error = null;
            } else {
              error = retryError;
            }
          }
        }

        if (error) {
          if (error.code === '42501' || error.message?.includes('row-level security')) {
            console.warn('RLS Violation on suppliers table. Falling back to local storage.', error);
            const fallbackItem = { ...insertData } as Supplier;
            const local = getLocalData('suppliers');
            setLocalData('suppliers', [...local, fallbackItem]);
            return fallbackItem;
          }
          throw error;
        }

        const local = getLocalData('suppliers');
        const updatedLocal = [...local.filter(l => l.id !== newItem.id), newItem];
        setLocalData('suppliers', updatedLocal);
        return newItem as Supplier;
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const newItem = { ...data, id } as Supplier;
          const local = getLocalData('suppliers');
          setLocalData('suppliers', [...local, newItem]);
          return newItem;
        }
        throw err;
      }
    },
    update: async (id: string, data: Partial<Supplier>) => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('suppliers').update(data).eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { error } = await query;
        if (error) throw error;

        const local = getLocalData('suppliers');
        setLocalData('suppliers', local.map(item => item.id === id ? { ...item, ...data } : item));
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const local = getLocalData('suppliers');
          setLocalData('suppliers', local.map(item => item.id === id ? { ...item, ...data } : item));
          return;
        }
        const isColumnError = err?.code === '42703' || err?.message?.includes('user_id') || err?.message?.includes('coluna');
        if (isColumnError) {
          try {
            const { error } = await supabase.from('suppliers').update(data).eq('id', id);
            if (error) throw error;
            const local = getLocalData('suppliers');
            setLocalData('suppliers', local.map(item => item.id === id ? { ...item, ...data } : item));
          } catch (innerErr: any) {
            if (isConnectionError(innerErr)) {
              notifyOffline(innerErr);
              const local = getLocalData('suppliers');
              setLocalData('suppliers', local.map(item => item.id === id ? { ...item, ...data } : item));
              return;
            }
            throw innerErr;
          }
        } else {
          throw err;
        }
      }
    },
    delete: async (id: string) => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('suppliers').delete().eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { error } = await query;
        if (error) throw error;

        const local = getLocalData('suppliers');
        setLocalData('suppliers', local.filter(item => item.id !== id));
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const local = getLocalData('suppliers');
          setLocalData('suppliers', local.filter(item => item.id !== id));
          return;
        }
        const isColumnError = err?.code === '42703' || err?.message?.includes('user_id') || err?.message?.includes('coluna');
        if (isColumnError) {
          try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            const local = getLocalData('suppliers');
            setLocalData('suppliers', local.filter(item => item.id !== id));
          } catch (innerErr: any) {
            if (isConnectionError(innerErr)) {
              notifyOffline(innerErr);
              const local = getLocalData('suppliers');
              setLocalData('suppliers', local.filter(item => item.id !== id));
              return;
            }
            throw innerErr;
          }
        } else {
          throw err;
        }
      }
    }
  },
  consoles: {
    list: async () => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('consoles').select('*');
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.order('buy_date', { ascending: false });
        if (error) throw error;
        tryCacheUserIdFromRows(data);
        
        const local = getLocalData('consoles');
        const merged = [...(data || []), ...local.filter(l => !data?.some(d => d.id === l.id))];
        setLocalData('consoles', merged);
        return merged as Console[];
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          return getLocalData('consoles') as Console[];
        }
        throw err;
      }
    },
    create: async (data: Omit<Console, 'id'>) => {
      const id = generateId();
      const insertData = { ...data, id } as any;
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          insertData.user_id = userId;
        }
        let { data: newItem, error } = await supabase.from('consoles').insert(insertData).select().single();
        
        if (error) {
          const isColumnError = error.code === '42703' || error.message?.includes('user_id') || error.message?.includes('coluna');
          if (isColumnError) {
            const { user_id, ...cleanData } = insertData;
            const { data: retryItem, error: retryError } = await supabase.from('consoles').insert(cleanData).select().single();
            if (!retryError) {
              newItem = retryItem;
              error = null;
            } else {
              error = retryError;
            }
          }
        }

        if (error) {
          if (error.code === '42501' || error.message?.includes('row-level security')) {
            console.warn('RLS Violation on consoles table. Falling back to local storage.', error);
            const fallbackItem = { ...insertData } as Console;
            const local = getLocalData('consoles');
            setLocalData('consoles', [...local, fallbackItem]);
            return fallbackItem;
          }
          throw error;
        }

        const local = getLocalData('consoles');
        setLocalData('consoles', [...local, newItem]);
        return newItem as Console;
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const newItem = { ...data, id } as Console;
          const local = getLocalData('consoles');
          setLocalData('consoles', [...local, newItem]);
          return newItem;
        }
        throw err;
      }
    },
    update: async (id: string, data: Partial<Console>) => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('consoles').update(data).eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { error } = await query;
        if (error) throw error;

        const local = getLocalData('consoles');
        setLocalData('consoles', local.map(item => item.id === id ? { ...item, ...data } : item));
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const local = getLocalData('consoles');
          setLocalData('consoles', local.map(item => item.id === id ? { ...item, ...data } : item));
          return;
        }
        throw err;
      }
    },
    delete: async (id: string) => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('consoles').delete().eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { error } = await query;
        if (error) throw error;

        const local = getLocalData('consoles');
        setLocalData('consoles', local.filter(item => item.id !== id));
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const local = getLocalData('consoles');
          setLocalData('consoles', local.filter(item => item.id !== id));
          return;
        }
        throw err;
      }
    }
  },
  sales: {
    list: async () => {
      try {
        const userId = await getCurrentUserId();
        let query = supabase.from('sales').select('*');
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.order('sale_date', { ascending: false });
        if (error) throw error;
        tryCacheUserIdFromRows(data);
        
        // --- Signature Sync Logic ---
        // Find sales that are pending signature or missing signature data
        const unsignedSaleIds = (data || []).filter(s => !s.signature_data || !s.signed_at).map(s => s.id);
        
        if (unsignedSaleIds.length > 0) {
          try {
            // Chunk IDs into batches of 50
            const chunkSize = 50;
            for (let i = 0; i < unsignedSaleIds.length; i += chunkSize) {
              const chunk = unsignedSaleIds.slice(i, i + chunkSize);
              
              // Robust sync: check both sale_id and id to catch all possible signature links
              const [res1, res2] = await Promise.all([
                supabase.from('public_sales').select('*').in('sale_id', chunk),
                supabase.from('public_sales').select('*').in('id', chunk)
              ]);
              
              const publicSignatures = [...(res1.data || []), ...(res2.data || [])];
                
              if (publicSignatures.length > 0) {
                for (const sig of publicSignatures) {
                  // Find which sale this belongs to (match id or sale_id)
                  const targetSaleId = chunk.find(id => id === sig.sale_id || id === sig.id);
                  if (!targetSaleId) continue;

                  const sigData = sig.signature_data || sig.sale_data?.signatureInfo?.signature_data;
                  const sigAt = sig.signed_at || sig.sale_data?.signatureInfo?.signed_at;
                  const sigIp = sig.signed_ip || sig.sale_data?.signatureInfo?.signed_ip;
                  
                  if (sigData || sigAt) {
                    // Update in memory array for immediate return
                    const saleToUpdate = data.find(s => s.id === targetSaleId);
                    if (saleToUpdate) {
                      // Only update if not already fully populated or if data changed
                      if (!saleToUpdate.signature_data || !saleToUpdate.signed_at || saleToUpdate.signature_data !== sigData) {
                        saleToUpdate.signature_data = sigData;
                        saleToUpdate.signed_at = sigAt;
                        saleToUpdate.signed_ip = sigIp;
                        
                        // Also update the local fallback cache immediately
                        const localSales = getLocalData('sales');
                        const updatedLocal = localSales.map(ls => ls.id === targetSaleId ? {
                          ...ls,
                          signature_data: sigData,
                          signed_at: sigAt,
                          signed_ip: sigIp
                        } : ls);
                        setLocalData('sales', updatedLocal);

                        // Update Supabase sales table in the background
                        supabase.from('sales').update({
                          signature_data: sigData,
                          signed_at: sigAt,
                          signed_ip: sigIp
                        }).eq('id', targetSaleId).then(({ error }) => {
                          if (error && error.code !== '42703' && error.code !== 'PGRST204' && error.code !== '23514') {
                            console.warn("Error updating signature on sales table:", error);
                          }
                        });
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error syncing signatures from public_sales:", e);
          }
        }
        // -----------------------------
        
        // Merge Supabase rows with local fallback cache
        const localData = getLocalData('sales');
        
        // 1. Start with database items and enrich them with local data (canonical)
        const enrichedFromDb = (data || []).map(row => {
          const localItem = localData.find(item => item.id === row.id);
          return {
            ...localItem,
            ...row,
            first_installment_date: row.first_installment_date || localItem?.first_installment_date
          };
        });

        // 2. Add local-only items (those not yet in the database, e.g. RLS fallbacks)
        const localOnly = localData.filter(l => !data?.some(d => d.id === l.id));
        const mergedData = [...enrichedFromDb, ...localOnly];

        setLocalData('sales', mergedData);
        return mergedData as Sale[];
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          return getLocalData('sales') as Sale[];
        }
        throw err;
      }
    },
    create: async (data: Omit<Sale, 'id'>) => {
      const id = generateId();
      
      const validFrequencies = ['Semanal', 'Quinzenal', 'Mensal'];
      let freq: any = data.installment_frequency;
      if (typeof freq === 'string') {
        freq = freq.trim();
        if (freq.toLowerCase().startsWith('seman')) freq = 'Semanal';
        else if (freq.toLowerCase().startsWith('quinzen')) freq = 'Quinzenal';
        else if (freq.toLowerCase().startsWith('mens')) freq = 'Mensal';
      }
      if (!freq || !validFrequencies.includes(freq as any)) {
        freq = 'Mensal';
      }
      data.installment_frequency = freq as any;
      
      // Proactively separate client-only properties to prevent any Supabase schema mismatch/retry warnings
      const { first_installment_date, installments_paid, ...cleanDataForDb } = data as any;
      const insertData = { ...cleanDataForDb, id } as any;
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          insertData.user_id = userId;
        }
        // 1. Create the sale
        let newItem;
        try {
          const { data: resData, error: saleError } = await supabase.from('sales').insert(insertData).select().single();
          
          if (saleError) {
            const isRLSError = saleError.code === '42501' || saleError.message?.includes('row-level security');
            if (isRLSError) {
              newItem = { ...insertData };
            } else {
              throw saleError;
            }
          } else {
            newItem = resData;
          }
        } catch (dbErr: any) {
          console.warn('Database error in sales creation, using fallback', dbErr);
          newItem = { ...insertData };
        }
        
        // 2. Update iPhone status to 'vendido'
        if (data.iphone_id) {
          let iphoneQuery = supabase.from('iphones').update({ status: 'vendido' }).eq('id', data.iphone_id);
          if (userId) iphoneQuery = iphoneQuery.eq('user_id', userId);
          const { error: iphoneError } = await iphoneQuery;
          if (iphoneError) throw iphoneError;
        }
        
        // 3. Update Console status to 'vendido'
        if (data.console_id) {
          let consoleQuery = supabase.from('consoles').update({ status: 'vendido' }).eq('id', data.console_id);
          if (userId) consoleQuery = consoleQuery.eq('user_id', userId);
          const { error: consoleError } = await consoleQuery;
          if (consoleError) throw consoleError;
        }

        // Keep local cache in sync query
        const localSales = getLocalData('sales');
        const localNewItem = { ...newItem, first_installment_date, installments_paid };
        setLocalData('sales', [...localSales, localNewItem]);

        if (data.iphone_id) {
          const localIphones = getLocalData('iphones');
          setLocalData('iphones', localIphones.map(i => i.id === data.iphone_id ? { ...i, status: 'vendido' } : i));
        }
        if (data.console_id) {
          const localConsoles = getLocalData('consoles');
          setLocalData('consoles', localConsoles.map(c => c.id === data.console_id ? { ...c, status: 'vendido' } : c));
        }
        
        return localNewItem as Sale;
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const newItem = { ...data, id } as Sale;
          
          // Save sale locally
          const localSales = getLocalData('sales');
          setLocalData('sales', [...localSales, newItem]);

          // Update status locally
          if (data.iphone_id) {
            const localIphones = getLocalData('iphones');
            setLocalData('iphones', localIphones.map(i => i.id === data.iphone_id ? { ...i, status: 'vendido' } : i));
          }
          if (data.console_id) {
            const localConsoles = getLocalData('consoles');
            setLocalData('consoles', localConsoles.map(c => c.id === data.console_id ? { ...c, status: 'vendido' } : c));
          }

          return newItem;
        }
        throw err;
      }
    },
    update: async (id: string, data: Partial<Sale>) => {
      const validFrequencies = ['Semanal', 'Quinzenal', 'Mensal'];
      if ('installment_frequency' in data) {
        let freq: any = data.installment_frequency;
        if (typeof freq === 'string') {
          freq = freq.trim();
          if (freq.toLowerCase().startsWith('seman')) freq = 'Semanal';
          else if (freq.toLowerCase().startsWith('quinzen')) freq = 'Quinzenal';
          else if (freq.toLowerCase().startsWith('mens')) freq = 'Mensal';
        }
        if (!freq || !validFrequencies.includes(freq as any)) {
          freq = 'Mensal';
        }
        data.installment_frequency = freq as any;
      }
      try {
        const userId = await getCurrentUserId();
        // Get old sale to check if iphone_id or console_id changed
        let oldSale;
        try {
          let oldSaleQuery = supabase.from('sales').select('iphone_id, console_id').eq('id', id);
          if (userId) oldSaleQuery = oldSaleQuery.eq('user_id', userId);
          const { data: fetchOldSale, error: getError } = await oldSaleQuery.single();
          if (getError) throw getError;
          oldSale = fetchOldSale;
        } catch (e) {
          // Fallback to local cache for oldSale
          const localSales = getLocalData('sales');
          oldSale = localSales.find(s => s.id === id) || { iphone_id: null, console_id: null };
        }

        if (data.iphone_id && oldSale.iphone_id !== data.iphone_id) {
          // Revert old iPhone status
          if (oldSale.iphone_id) {
            try {
              let revertQuery = supabase.from('iphones').update({ status: 'disponivel' }).eq('id', oldSale.iphone_id);
              if (userId) revertQuery = revertQuery.eq('user_id', userId);
              await revertQuery;
            } catch (e) {
              console.warn('Could not revert iPhone status in DB:', e);
            }
          }
          // Update new iPhone status
          try {
            let updateQuery = supabase.from('iphones').update({ status: 'vendido' }).eq('id', data.iphone_id);
            if (userId) updateQuery = updateQuery.eq('user_id', userId);
            await updateQuery;
          } catch (e) {
            console.warn('Could not update iPhone status in DB:', e);
          }
        }

        if (data.console_id && oldSale.console_id !== data.console_id) {
          // Revert old Console status
          if (oldSale.console_id) {
            try {
              let revertQuery = supabase.from('consoles').update({ status: 'disponivel' }).eq('id', oldSale.console_id);
              if (userId) revertQuery = revertQuery.eq('user_id', userId);
              await revertQuery;
            } catch (e) {
              console.warn('Could not revert Console status in DB:', e);
            }
          }
          // Update new Console status
          try {
            let updateQuery = supabase.from('consoles').update({ status: 'vendido' }).eq('id', data.console_id);
            if (userId) updateQuery = updateQuery.eq('user_id', userId);
            await updateQuery;
          } catch (e) {
            console.warn('Could not update Console status in DB:', e);
          }
        }

        // Proactively separate client-only properties to prevent any Supabase schema mismatch/retry warnings
        const { first_installment_date, installments_paid, ...cleanDataForDb } = data as any;
        try {
          let salesUpdateQuery = supabase.from('sales').update(cleanDataForDb).eq('id', id);
          if (userId) salesUpdateQuery = salesUpdateQuery.eq('user_id', userId);
          const { error } = await salesUpdateQuery;
          if (error) throw error;
        } catch (dbErr) {
          console.warn('Failed to update sale in Supabase, continuing with local updates:', dbErr);
        }

        // Keep local cache in sync
        const localSales = getLocalData('sales');
        setLocalData('sales', localSales.map(item => item.id === id ? { ...item, ...data } : item));

        if (data.iphone_id && oldSale.iphone_id !== data.iphone_id) {
          const localIphones = getLocalData('iphones');
          let updatedIphones = [...localIphones];
          if (oldSale.iphone_id) {
            updatedIphones = updatedIphones.map(i => i.id === oldSale.iphone_id ? { ...i, status: 'disponivel' } : i);
          }
          updatedIphones = updatedIphones.map(i => i.id === data.iphone_id ? { ...i, status: 'vendido' } : i);
          setLocalData('iphones', updatedIphones);
        }

        if (data.console_id && oldSale.console_id !== data.console_id) {
          const localConsoles = getLocalData('consoles');
          let updatedConsoles = [...localConsoles];
          if (oldSale.console_id) {
            updatedConsoles = updatedConsoles.map(c => c.id === oldSale.console_id ? { ...c, status: 'disponivel' } : c);
          }
          updatedConsoles = updatedConsoles.map(c => c.id === data.console_id ? { ...c, status: 'vendido' } : c);
          setLocalData('consoles', updatedConsoles);
        }
      } catch (err: any) {
        // Fallback to local changes for ANY error to keep app functional
        console.warn('Global error in sales update, falling back to local storage:', err);
        const localSales = getLocalData('sales');
        const oldSale = localSales.find(s => s.id === id) || { iphone_id: null, console_id: null };
        
        if (data.iphone_id && oldSale.iphone_id !== data.iphone_id) {
          const localIphones = getLocalData('iphones');
          let updatedIphones = [...localIphones];
          if (oldSale.iphone_id) {
            updatedIphones = updatedIphones.map(i => i.id === oldSale.iphone_id ? { ...i, status: 'disponivel' } : i);
          }
          updatedIphones = updatedIphones.map(i => i.id === data.iphone_id ? { ...i, status: 'vendido' } : i);
          setLocalData('iphones', updatedIphones);
        }
        if (data.console_id && oldSale.console_id !== data.console_id) {
          const localConsoles = getLocalData('consoles');
          let updatedConsoles = [...localConsoles];
          if (oldSale.console_id) {
            updatedConsoles = updatedConsoles.map(c => c.id === oldSale.console_id ? { ...c, status: 'disponivel' } : c);
          }
          updatedConsoles = updatedConsoles.map(c => c.id === data.console_id ? { ...c, status: 'vendido' } : c);
          setLocalData('consoles', updatedConsoles);
        }

        setLocalData('sales', localSales.map(item => item.id === id ? { ...item, ...data } : item));
      }
    },
    delete: async (id: string) => {
      try {
        const userId = await getCurrentUserId();
        // Get sale to revert iPhone/Console status
        let getSaleQuery = supabase.from('sales').select('iphone_id, console_id').eq('id', id);
        if (userId) getSaleQuery = getSaleQuery.eq('user_id', userId);
        const { data: sale, error: getError } = await getSaleQuery.single();
        if (getError) throw getError;
        
        if (sale) {
          if (sale.iphone_id) {
            let updateQuery = supabase.from('iphones').update({ status: 'disponivel' }).eq('id', sale.iphone_id);
            if (userId) updateQuery = updateQuery.eq('user_id', userId);
            await updateQuery;
          }
          if (sale.console_id) {
            let updateQuery = supabase.from('consoles').update({ status: 'disponivel' }).eq('id', sale.console_id);
            if (userId) updateQuery = updateQuery.eq('user_id', userId);
            await updateQuery;
          }
        }
        
        let deleteQuery = supabase.from('sales').delete().eq('id', id);
        if (userId) deleteQuery = deleteQuery.eq('user_id', userId);
        const { error } = await deleteQuery;
        if (error) throw error;

        // Keep local cache in sync
        const localSales = getLocalData('sales');
        setLocalData('sales', localSales.filter(item => item.id !== id));

        if (sale?.iphone_id) {
          const localIphones = getLocalData('iphones');
          setLocalData('iphones', localIphones.map(i => i.id === sale.iphone_id ? { ...i, status: 'disponivel' } : i));
        }
        if (sale?.console_id) {
          const localConsoles = getLocalData('consoles');
          setLocalData('consoles', localConsoles.map(c => c.id === sale.console_id ? { ...c, status: 'disponivel' } : c));
        }
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const localSales = getLocalData('sales');
          const sale = localSales.find(s => s.id === id);

          if (sale) {
            if (sale.iphone_id) {
              const localIphones = getLocalData('iphones');
              setLocalData('iphones', localIphones.map(i => i.id === sale.iphone_id ? { ...i, status: 'disponivel' } : i));
            }
            if (sale.console_id) {
              const localConsoles = getLocalData('consoles');
              setLocalData('consoles', localConsoles.map(c => c.id === sale.console_id ? { ...c, status: 'disponivel' } : c));
            }
          }

          setLocalData('sales', localSales.filter(item => item.id !== id));
          return;
        }
        throw err;
      }
    }
  },

  autoSeed: async () => {
    if (seedingPromise && isSeeding) return seedingPromise;
    
    isSeeding = true;
    seedingPromise = (async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          console.warn('Seeding skipped: No authenticated user session found.');
          return;
        }

        // Check if we already seeded these core clients to avoid duplicates
        const { data: existingClients, error: checkErr } = await supabase
          .from('clients')
          .select('name')
          .eq('user_id', userId);
        
        if (checkErr) throw checkErr;
        
        const existingNames = (existingClients || []).map(c => c.name);
        const coreNames = [
          'Ramon Dornelas Borges Henrique',
          'Yuri dos Santos Gonçalves',
          'Carlos Eduardo Reis Coelho'
        ];

        // Only seed if at least one core client is missing
        if (coreNames.every(name => existingNames.some(n => n.toLowerCase().includes(name.toLowerCase())))) {
          console.log('Core clients already exist. Skipping seed.');
          return;
        }

        await db.restoreFromWarranties();
      } catch (e) {
        console.error('Failed to auto seed:', e);
      } finally {
        isSeeding = false;
        seedingPromise = null;
      }
    })();
    
    return seedingPromise;
  },

  restoreFromWarranties: async (force = false) => {
    try {
      const userId = await getCurrentUserId();
      console.log('Restoring data from warranty notes. User ID:', userId, 'Force:', force);

      // Reset seeding flags if stuck or force requested
      isSeeding = false;
      seedingPromise = null;

      // 1. Check/create supplier
      const suppliersList = await db.suppliers.list();
      let supplierId = suppliersList[0]?.id;
      if (!supplierId) {
        try {
          const newSupplier = await db.suppliers.create({
            name: 'Fornecedor Principal',
            contact: 'Suporte Interno'
          });
          supplierId = newSupplier.id;
        } catch (supErr) {
          console.warn('Could not create supplier, using fallback ID', supErr);
          supplierId = 'default-supplier';
        }
      }

      // Check existing clients
      let existingNames: string[] = [];
      if (!force) {
        try {
          const { data: existingClients } = await supabase
            .from('clients')
            .select('name')
            .eq('user_id', userId || '');
          existingNames = (existingClients || []).map(c => c.name);
        } catch (checkErr) {
          console.warn('Error checking existing clients, assuming empty list', checkErr);
        }
      }

      // --- CASE 1: Ramon Dornelas Borges Henrique ---
      if (!existingNames.includes('Ramon Dornelas Borges Henrique')) {
        const ramonClient = await db.clients.create({
          name: 'Ramon Dornelas Borges Henrique',
          phone: '(32) 99973-4568',
          cpf: '121.827.496-40',
          email: 'ramondornelas7@gmail.com',
          address: 'Dr José Inácio Garcia de Freitas, 51 - Eldorado (Casa)',
          city: 'Carangola',
          state: 'MG'
        });
        const ramonConsole = await db.consoles.create({
          model: 'PlayStation 4 slim 1T',
          version: 'Ps4 Slim',
          buy_price: 1300,
          buy_date: new Date('2026-06-20').toISOString(),
          status: 'vendido',
          condition: 'seminovo'
        });
        await db.sales.create({
          console_id: ramonConsole.id,
          client_id: ramonClient.id,
          sell_price: 1950,
          down_payment: 665,
          payment_method: 'Pix',
          sale_date: new Date('2026-06-27').toISOString(),
          installments: 3,
          installment_frequency: 'Mensal'
        });
      }

      // --- CASE 2: Yuri dos Santos Gonçalves ---
      if (!existingNames.some(n => n.toLowerCase().includes('yuri dos santos gonçalves'))) {
        const yuriClient = await db.clients.create({
          name: 'Yuri dos Santos Gonçalves',
          phone: '32 998099483',
          cpf: '18646790690',
          email: 'streetblazer2007@gmail.com',
          address: 'Contorno vista linda, 9 - Independência',
          city: 'Alto Caparaó',
          state: 'MG'
        });
        const yuriIphone = await db.iphones.create({
          model: 'iPhone 12',
          storage: '64GB',
          color: 'Vermelho purpura',
          buy_price: 1400,
          buy_date: new Date('2026-06-01').toISOString(),
          status: 'vendido',
          condition: 'seminovo',
          imei: 'MGJ73BR/A',
          supplier_id: supplierId
        });
        await db.sales.create({
          iphone_id: yuriIphone.id,
          client_id: yuriClient.id,
          sell_price: 2000,
          down_payment: 500,
          payment_method: 'Pix',
          sale_date: new Date('2026-06-06').toISOString(),
          installments: 6,
          installment_frequency: 'Semanal'
        });
      }

      // --- CASE 3: Carlos Eduardo Reis Coelho ---
      if (!existingNames.includes('Carlos Eduardo Reis Coelho')) {
        const carlosClient = await db.clients.create({
          name: 'Carlos Eduardo Reis Coelho',
          phone: '32 998147409',
          cpf: '157.203.006-27',
          email: 'carloseduardodosreis@gmail.com',
          address: 'Professor Funchal Garcia, 333 - Chevrang (casa)',
          city: 'Carangola',
          state: 'MG'
        });
        const carlosConsole = await db.consoles.create({
          model: 'PlayStation',
          version: 'PS5',
          buy_price: 3200,
          buy_date: new Date('2026-03-30').toISOString(),
          status: 'vendido',
          condition: 'lacrado'
        });
        await db.sales.create({
          console_id: carlosConsole.id,
          client_id: carlosClient.id,
          sell_price: 4000,
          down_payment: 0,
          payment_method: 'Pix',
          sale_date: new Date('2026-04-06').toISOString(),
          installments: 6,
          installment_frequency: 'Mensal'
        });
      }

      return { success: true, message: 'Dados restaurados com sucesso!' };
    } catch (e: any) {
      console.error('Restore error:', e);
      return { success: false, message: e.message || 'Erro ao restaurar dados' };
    }
  },

  restoreFromLocalStorage: async () => {
    try {
      const userId = await getCurrentUserId();
      const tables = ['clients', 'suppliers', 'iphones', 'consoles', 'sales', 'prices'];
      let restoredCount = 0;

      for (const table of tables) {
        const localData = getLocalData(table);
        if (localData && localData.length > 0) {
          console.log(`Found ${localData.length} items in local storage for ${table}`);
          // Try to sync them to Supabase
          for (const item of localData) {
            try {
              // Check if item already exists in Supabase (simple name check for clients)
              if (table === 'clients') {
                const { data: existing } = await supabase
                  .from('clients')
                  .select('id')
                  .eq('name', item.name)
                  .eq('user_id', userId)
                  .maybeSingle();
                if (existing) continue;
              }
              
              const { id, created_at, user_id, ...cleanItem } = item;
              await (db as any)[table].create(cleanItem);
              restoredCount++;
            } catch (err) {
              console.warn(`Could not sync item from ${table}`, err);
            }
          }
        }
      }

      return { 
        success: true, 
        message: restoredCount > 0 
          ? `${restoredCount} registros recuperados do armazenamento local!` 
          : 'Nenhum dado novo encontrado no armazenamento local.' 
      };
    } catch (e: any) {
      console.error('Local storage restore error:', e);
      return { success: false, message: 'Erro ao buscar no armazenamento: ' + e.message };
    }
  },

  processWarrantyText: async (text: string) => {
    try {
      const response = await fetch('/api/process-warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textData: text })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao processar texto');
      }

      const data = await response.json();
      return await db.saveProcessedData(data);
    } catch (e: any) {
      console.error('Text processing error:', e);
      return { success: false, message: 'Erro ao processar texto: ' + e.message };
    }
  },

  processWarrantyFile: async (file: File) => {
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/process-warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64Data,
          mimeType: file.type
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao processar arquivo');
      }

      const data = await response.json();
      return await db.saveProcessedData(data);
    } catch (e: any) {
      console.error('File processing error:', e);
      return { success: false, message: 'Erro ao processar arquivo: ' + e.message };
    }
  },

  saveProcessedData: async (data: any) => {
    try {
      const userId = await getCurrentUserId();
      
      // 1. Find or create Client
      let clientId = null;
      if (data.client_name) {
        // Try to find existing client first for THIS user
        let clientQuery = supabase
          .from('clients')
          .select('id')
          .ilike('name', `%${data.client_name}%`);
        
        if (userId) {
          clientQuery = clientQuery.eq('user_id', userId);
        }

        const { data: existingClients } = await clientQuery.limit(1);

        if (existingClients && existingClients.length > 0) {
          clientId = existingClients[0].id;
        } else {
          // Create new client
          const clientRes = await db.clients.create({
            name: data.client_name,
            phone: data.client_phone || '',
            cpf: data.client_cpf || '',
            email: data.client_email || '',
            address: data.client_address || '',
            city: data.client_city || '',
            state: data.client_state || ''
          });
          clientId = clientRes?.id;
        }
      }

      // 2. Find or create Product (iPhone or Console)
      if (data.product_model) {
        const isConsole = /ps|playstation|xbox|nintendo|switch/i.test(data.product_model);
        
        let productId = null;
        if (isConsole) {
          // Try to find existing available console for THIS user
          let consoleQuery = supabase
            .from('consoles')
            .select('id')
            .ilike('model', `%${data.product_model}%`)
            .eq('status', 'disponivel');
          
          if (userId) {
            consoleQuery = consoleQuery.eq('user_id', userId);
          }

          const { data: existingConsoles } = await consoleQuery.limit(1);

          if (existingConsoles && existingConsoles.length > 0) {
            productId = existingConsoles[0].id;
          } else {
            const consoleRes = await db.consoles.create({
              model: data.product_model,
              version: data.product_detail || '',
              buy_price: data.buy_price || 0,
              buy_date: data.sale_date || new Date().toISOString(),
              status: 'vendido',
              condition: 'seminovo'
            });
            productId = consoleRes?.id;
          }
        } else {
          // Try to find existing available iphone for THIS user
          let iphoneQuery = supabase
            .from('iphones')
            .select('id')
            .ilike('model', `%${data.product_model}%`)
            .eq('status', 'disponivel');
          
          if (userId) {
            iphoneQuery = iphoneQuery.eq('user_id', userId);
          }

          const { data: existingIphones } = await iphoneQuery.limit(1);

          if (existingIphones && existingIphones.length > 0) {
            productId = existingIphones[0].id;
          } else {
            const iphoneRes = await db.iphones.create({
              model: data.product_model,
              storage: data.product_detail || '',
              color: 'Preto',
              buy_price: data.buy_price || 0,
              supplier_id: '',
              buy_date: data.sale_date || new Date().toISOString(),
              status: 'vendido',
              condition: 'seminovo'
            });
            productId = iphoneRes?.id;
          }
        }

        // 3. Create Sale
        if (productId) {
          await db.sales.create({
            client_id: clientId || '',
            [isConsole ? 'console_id' : 'iphone_id']: productId,
            sell_price: data.sell_price || 0,
            payment_method: data.payment_method || 'Outro',
            installments: data.installments || 1,
            sale_date: data.sale_date || new Date().toISOString()
          });
        }
      }

      return { success: true, message: 'Dados processados e salvos com sucesso!', data };
    } catch (e: any) {
      console.error('Save error detailed:', e);
      return { success: false, message: 'Erro ao salvar dados extraídos: ' + (e.message || 'Erro desconhecido') };
    }
  }
};
