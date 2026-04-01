import { supabase } from '../lib/supabase';
import { iPhone, Client, Supplier, Sale, PriceTableItem } from '../types';

export const db = {
  prices: {
    list: async () => {
      const { data, error } = await supabase.from('prices').select('*').order('model', { ascending: true });
      if (error) throw error;
      return data as PriceTableItem[];
    },
    create: async (data: Omit<PriceTableItem, 'id'>) => {
      const { data: newItem, error } = await supabase.from('prices').insert(data).select().single();
      if (error) throw error;
      return newItem as PriceTableItem;
    },
    update: async (id: string, data: Partial<PriceTableItem>) => {
      const { error } = await supabase.from('prices').update(data).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('prices').delete().eq('id', id);
      if (error) throw error;
    }
  },
  iphones: {
    list: async () => {
      const { data, error } = await supabase.from('iphones').select('*').order('buy_date', { ascending: false });
      if (error) throw error;
      return data as iPhone[];
    },
    create: async (data: Omit<iPhone, 'id'>) => {
      const { data: newItem, error } = await supabase.from('iphones').insert(data).select().single();
      if (error) throw error;
      return newItem as iPhone;
    },
    update: async (id: string, data: Partial<iPhone>) => {
      const { error } = await supabase.from('iphones').update(data).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('iphones').delete().eq('id', id);
      if (error) throw error;
    }
  },
  clients: {
    list: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data as Client[];
    },
    create: async (data: Omit<Client, 'id'>) => {
      const { data: newItem, error } = await supabase.from('clients').insert(data).select().single();
      if (error) throw error;
      return newItem as Client;
    },
    update: async (id: string, data: Partial<Client>) => {
      const { error } = await supabase.from('clients').update(data).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    }
  },
  suppliers: {
    list: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data as Supplier[];
    },
    create: async (data: Omit<Supplier, 'id'>) => {
      const { data: newItem, error } = await supabase.from('suppliers').insert(data).select().single();
      if (error) throw error;
      return newItem as Supplier;
    },
    update: async (id: string, data: Partial<Supplier>) => {
      const { error } = await supabase.from('suppliers').update(data).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    }
  },
  sales: {
    list: async () => {
      const { data, error } = await supabase.from('sales').select('*').order('sale_date', { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
    create: async (data: Omit<Sale, 'id'>) => {
      // 1. Create the sale
      const { data: newItem, error: saleError } = await supabase.from('sales').insert(data).select().single();
      if (saleError) throw saleError;
      
      // 2. Update iPhone status to 'vendido'
      const { error: iphoneError } = await supabase.from('iphones').update({ status: 'vendido' }).eq('id', data.iphone_id);
      if (iphoneError) throw iphoneError;
      
      return newItem as Sale;
    },
    update: async (id: string, data: Partial<Sale>) => {
      // Get old sale to check if iphone_id changed
      const { data: oldSale, error: getError } = await supabase.from('sales').select('iphone_id').eq('id', id).single();
      if (getError) throw getError;

      if (data.iphone_id && oldSale.iphone_id !== data.iphone_id) {
        // Revert old iPhone status
        await supabase.from('iphones').update({ status: 'disponivel' }).eq('id', oldSale.iphone_id);
        // Update new iPhone status
        await supabase.from('iphones').update({ status: 'vendido' }).eq('id', data.iphone_id);
      }

      const { error } = await supabase.from('sales').update(data).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      // Get sale to revert iPhone status
      const { data: sale, error: getError } = await supabase.from('sales').select('iphone_id').eq('id', id).single();
      if (getError) throw getError;
      
      if (sale) {
        await supabase.from('iphones').update({ status: 'disponivel' }).eq('id', sale.iphone_id);
      }
      
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
    }
  }
};

