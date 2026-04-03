import { supabase } from '../lib/supabase';
import { iPhone, Client, Supplier, Sale, PriceTableItem, Console } from '../types';

const getCurrentUserId = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) throw new Error('Usuário não autenticado');
  return session.user.id;
};

export const db = {
  prices: {
    list: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from('prices').select('*').eq('user_id', userId).order('model', { ascending: true });
      if (error) throw error;
      return data as PriceTableItem[];
    },
    create: async (data: Omit<PriceTableItem, 'id'>) => {
      const userId = await getCurrentUserId();
      const { data: newItem, error } = await supabase.from('prices').insert({ ...data, user_id: userId }).select().single();
      if (error) throw error;
      return newItem as PriceTableItem;
    },
    update: async (id: string, data: Partial<PriceTableItem>) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('prices').update(data).eq('id', id).eq('user_id', userId);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('prices').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    }
  },
  iphones: {
    list: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from('iphones').select('*').eq('user_id', userId).order('buy_date', { ascending: false });
      if (error) throw error;
      return data as iPhone[];
    },
    create: async (data: Omit<iPhone, 'id'>) => {
      const userId = await getCurrentUserId();
      const { data: newItem, error } = await supabase.from('iphones').insert({ ...data, user_id: userId }).select().single();
      if (error) throw error;
      return newItem as iPhone;
    },
    update: async (id: string, data: Partial<iPhone>) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('iphones').update(data).eq('id', id).eq('user_id', userId);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('iphones').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    }
  },
  clients: {
    list: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from('clients').select('*').eq('user_id', userId).order('name', { ascending: true });
      if (error) throw error;
      return data as Client[];
    },
    create: async (data: Omit<Client, 'id'>) => {
      const userId = await getCurrentUserId();
      const { data: newItem, error } = await supabase.from('clients').insert({ ...data, user_id: userId }).select().single();
      if (error) throw error;
      return newItem as Client;
    },
    update: async (id: string, data: Partial<Client>) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('clients').update(data).eq('id', id).eq('user_id', userId);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    }
  },
  suppliers: {
    list: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from('suppliers').select('*').eq('user_id', userId).order('name', { ascending: true });
      if (error) throw error;
      return data as Supplier[];
    },
    create: async (data: Omit<Supplier, 'id'>) => {
      const userId = await getCurrentUserId();
      const { data: newItem, error } = await supabase.from('suppliers').insert({ ...data, user_id: userId }).select().single();
      if (error) throw error;
      return newItem as Supplier;
    },
    update: async (id: string, data: Partial<Supplier>) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('suppliers').update(data).eq('id', id).eq('user_id', userId);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('suppliers').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    }
  },
  consoles: {
    list: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from('consoles').select('*').eq('user_id', userId).order('buy_date', { ascending: false });
      if (error) throw error;
      return data as Console[];
    },
    create: async (data: Omit<Console, 'id'>) => {
      const userId = await getCurrentUserId();
      const { data: newItem, error } = await supabase.from('consoles').insert({ ...data, user_id: userId }).select().single();
      if (error) throw error;
      return newItem as Console;
    },
    update: async (id: string, data: Partial<Console>) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('consoles').update(data).eq('id', id).eq('user_id', userId);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('consoles').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    }
  },
  sales: {
    list: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from('sales').select('*').eq('user_id', userId).order('sale_date', { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
    create: async (data: Omit<Sale, 'id'>) => {
      const userId = await getCurrentUserId();
      // 1. Create the sale
      const { data: newItem, error: saleError } = await supabase.from('sales').insert({ ...data, user_id: userId }).select().single();
      if (saleError) throw saleError;
      
      // 2. Update iPhone status to 'vendido'
      if (data.iphone_id) {
        const { error: iphoneError } = await supabase.from('iphones').update({ status: 'vendido' }).eq('id', data.iphone_id).eq('user_id', userId);
        if (iphoneError) throw iphoneError;
      }
      
      // 3. Update Console status to 'vendido'
      if (data.console_id) {
        const { error: consoleError } = await supabase.from('consoles').update({ status: 'vendido' }).eq('id', data.console_id).eq('user_id', userId);
        if (consoleError) throw consoleError;
      }
      
      return newItem as Sale;
    },
    update: async (id: string, data: Partial<Sale>) => {
      const userId = await getCurrentUserId();
      // Get old sale to check if iphone_id or console_id changed
      const { data: oldSale, error: getError } = await supabase.from('sales').select('iphone_id, console_id').eq('id', id).eq('user_id', userId).single();
      if (getError) throw getError;

      if (data.iphone_id && oldSale.iphone_id !== data.iphone_id) {
        // Revert old iPhone status
        if (oldSale.iphone_id) await supabase.from('iphones').update({ status: 'disponivel' }).eq('id', oldSale.iphone_id).eq('user_id', userId);
        // Update new iPhone status
        await supabase.from('iphones').update({ status: 'vendido' }).eq('id', data.iphone_id).eq('user_id', userId);
      }

      if (data.console_id && oldSale.console_id !== data.console_id) {
        // Revert old Console status
        if (oldSale.console_id) await supabase.from('consoles').update({ status: 'disponivel' }).eq('id', oldSale.console_id).eq('user_id', userId);
        // Update new Console status
        await supabase.from('consoles').update({ status: 'vendido' }).eq('id', data.console_id).eq('user_id', userId);
      }

      const { error } = await supabase.from('sales').update(data).eq('id', id).eq('user_id', userId);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const userId = await getCurrentUserId();
      // Get sale to revert iPhone/Console status
      const { data: sale, error: getError } = await supabase.from('sales').select('iphone_id, console_id').eq('id', id).eq('user_id', userId).single();
      if (getError) throw getError;
      
      if (sale) {
        if (sale.iphone_id) await supabase.from('iphones').update({ status: 'disponivel' }).eq('id', sale.iphone_id).eq('user_id', userId);
        if (sale.console_id) await supabase.from('consoles').update({ status: 'disponivel' }).eq('id', sale.console_id).eq('user_id', userId);
      }
      
      const { error } = await supabase.from('sales').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    }
  },
};

