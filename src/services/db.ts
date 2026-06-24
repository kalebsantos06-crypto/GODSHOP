import { supabase } from '../lib/supabase';
import { iPhone, Client, Supplier, Sale, PriceTableItem, Console } from '../types';

let cachedRealUserId: string | null = null;

const getCurrentUserId = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error && session?.user) {
      cachedRealUserId = session.user.id;
      return session.user.id;
    }
  } catch (e) {
    console.error('Error getting session:', e);
  }
  return cachedRealUserId;
};

const tryCacheUserIdFromRows = (rows: any[]) => {
  if (rows && rows.length > 0) {
    for (const row of rows) {
      if (row && row.user_id && row.user_id !== 'dev-user-id') {
        cachedRealUserId = row.user_id;
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
        setLocalData('iphones', data || []);
        return data as iPhone[];
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
        const { data: newItem, error } = await supabase.from('iphones').insert(insertData).select().single();
        if (error) throw error;

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
        setLocalData('clients', data || []);
        return data as Client[];
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
        const { data: newItem, error } = await supabase.from('clients').insert(insertData).select().single();
        if (error) throw error;

        const local = getLocalData('clients');
        setLocalData('clients', [...local, newItem]);
        return newItem as Client;
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const newItem = { ...data, id } as Client;
          const local = getLocalData('clients');
          setLocalData('clients', [...local, newItem]);
          return newItem;
        }
        throw err;
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
        setLocalData('suppliers', data || []);
        return data as Supplier[];
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
            setLocalData('suppliers', data || []);
            return data as Supplier[];
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
        const { data: newItem, error } = await supabase.from('suppliers').insert(insertData).select().single();
        if (error) throw error;

        const local = getLocalData('suppliers');
        setLocalData('suppliers', [...local, newItem]);
        return newItem as Supplier;
      } catch (err: any) {
        if (isConnectionError(err)) {
          notifyOffline(err);
          const newItem = { ...data, id } as Supplier;
          const local = getLocalData('suppliers');
          setLocalData('suppliers', [...local, newItem]);
          return newItem;
        }
        const isColumnError = err?.code === '42703' || err?.message?.includes('user_id') || err?.message?.includes('coluna');
        if (isColumnError) {
          const { user_id, ...cleanData } = insertData;
          try {
            const { data: newItem, error } = await supabase.from('suppliers').insert(cleanData).select().single();
            if (error) {
              if (error.code === 'PGRST116') {
                const newItemBackup = { ...cleanData, id } as Supplier;
                const local = getLocalData('suppliers');
                setLocalData('suppliers', [...local, newItemBackup]);
                return newItemBackup;
              }
              throw error;
            }
            const local = getLocalData('suppliers');
            setLocalData('suppliers', [...local, newItem]);
            return newItem as Supplier;
          } catch (innerErr: any) {
            if (isConnectionError(innerErr)) {
              notifyOffline(innerErr);
              const newItem = { ...cleanData, id } as Supplier;
              const local = getLocalData('suppliers');
              setLocalData('suppliers', [...local, newItem]);
              return newItem;
            }
            if (innerErr?.code === 'PGRST116') {
              const newItemBackup = { ...cleanData, id } as Supplier;
              const local = getLocalData('suppliers');
              setLocalData('suppliers', [...local, newItemBackup]);
              return newItemBackup;
            }
            throw innerErr;
          }
        }
        if (err?.code === 'PGRST116') {
          const local = getLocalData('suppliers');
          setLocalData('suppliers', [...local, insertData]);
          return insertData as Supplier;
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
        setLocalData('consoles', data || []);
        return data as Console[];
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
        const { data: newItem, error } = await supabase.from('consoles').insert(insertData).select().single();
        if (error) throw error;

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
        
        // Merge Supabase rows with local fallback cache to preserve fields not supported by schema
        const localData = getLocalData('sales');
        const mergedData = (data || []).map(row => {
          const localItem = localData.find(item => item.id === row.id);
          return {
            ...localItem,
            ...row,
            first_installment_date: row.first_installment_date || localItem?.first_installment_date
          };
        });

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
      const insertData = { ...data, id } as any;
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          insertData.user_id = userId;
        }
        // 1. Create the sale (handling case where first_installment_date column might not exist in database)
        let newItem;
        try {
          const { data: resData, error: saleError } = await supabase.from('sales').insert(insertData).select().single();
          if (saleError) throw saleError;
          newItem = resData;
        } catch (dbErr: any) {
          const isColumnError = dbErr?.message?.toLowerCase().includes('column') || dbErr?.code === '42703';
          if (isColumnError) {
            const { first_installment_date, ...cleanInsertData } = insertData;
            const { data: resData, error: retryError } = await supabase.from('sales').insert(cleanInsertData).select().single();
            if (retryError) throw retryError;
            newItem = { ...resData, first_installment_date };
          } else {
            throw dbErr;
          }
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
        setLocalData('sales', [...localSales, newItem]);

        if (data.iphone_id) {
          const localIphones = getLocalData('iphones');
          setLocalData('iphones', localIphones.map(i => i.id === data.iphone_id ? { ...i, status: 'vendido' } : i));
        }
        if (data.console_id) {
          const localConsoles = getLocalData('consoles');
          setLocalData('consoles', localConsoles.map(c => c.id === data.console_id ? { ...c, status: 'vendido' } : c));
        }
        
        return newItem as Sale;
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

        try {
          let salesUpdateQuery = supabase.from('sales').update(data).eq('id', id);
          if (userId) salesUpdateQuery = salesUpdateQuery.eq('user_id', userId);
          const { error } = await salesUpdateQuery;
          if (error) {
            const isColumnError = error?.message?.toLowerCase().includes('column') || error?.code === '42703';
            if (isColumnError) {
              const { first_installment_date, ...cleanData } = data;
              let retryQuery = supabase.from('sales').update(cleanData).eq('id', id);
              if (userId) retryQuery = retryQuery.eq('user_id', userId);
              const { error: retryError } = await retryQuery;
              if (retryError) throw retryError;
            } else {
              throw error;
            }
          }
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
};
