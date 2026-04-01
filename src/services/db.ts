import { v4 as uuidv4 } from 'uuid';
import { iPhone, Client, Supplier, Sale, PriceTableItem } from '../types';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get/set local storage
const getStorage = <T>(key: string): T[] => JSON.parse(localStorage.getItem(key) || '[]');
const setStorage = <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));

// Initialize mock data if empty
const initDB = () => {
  if (!localStorage.getItem('iphones')) {
    const sId = uuidv4();
    const cId = uuidv4();
    const iId = uuidv4();
    
    setStorage('suppliers', [{ id: sId, name: 'Fornecedor A', contact: '11999999999' }]);
    setStorage('clients', [{ id: cId, name: 'Cliente Teste', phone: '11888888888' }]);
    setStorage('iphones', [
      { id: iId, model: 'iPhone 13', storage: '128GB', color: 'Midnight', buy_price: 3000, supplier_id: sId, buy_date: new Date().toISOString(), status: 'vendido' },
      { id: uuidv4(), model: 'iPhone 14 Pro', storage: '256GB', color: 'Deep Purple', buy_price: 4500, supplier_id: sId, buy_date: new Date().toISOString(), status: 'disponivel' }
    ]);
    setStorage('sales', [
      { id: uuidv4(), iphone_id: iId, client_id: cId, sell_price: 3800, payment_method: 'PIX', sale_date: new Date().toISOString() }
    ]);
    setStorage('prices', [
      { id: uuidv4(), model: 'iPhone 13', storage: '128GB', price: 3800 },
      { id: uuidv4(), model: 'iPhone 14 Pro', storage: '256GB', price: 5500 }
    ]);
  }
};

initDB();

// Simulated Supabase Client
export const db = {
  prices: {
    list: async () => { await delay(300); return getStorage<PriceTableItem>('prices'); },
    create: async (data: Omit<PriceTableItem, 'id'>) => {
      await delay(300);
      const newItem = { ...data, id: uuidv4() };
      const items = getStorage<PriceTableItem>('prices');
      setStorage('prices', [...items, newItem]);
      return newItem;
    },
    update: async (id: string, data: Partial<PriceTableItem>) => {
      await delay(300);
      const items = getStorage<PriceTableItem>('prices');
      const updated = items.map(i => i.id === id ? { ...i, ...data } : i);
      setStorage('prices', updated);
    },
    delete: async (id: string) => {
      await delay(300);
      setStorage('prices', getStorage<PriceTableItem>('prices').filter(i => i.id !== id));
    }
  },
  iphones: {
    list: async () => { await delay(300); return getStorage<iPhone>('iphones'); },
    create: async (data: Omit<iPhone, 'id'>) => {
      await delay(300);
      const newItem = { ...data, id: uuidv4() };
      const items = getStorage<iPhone>('iphones');
      setStorage('iphones', [...items, newItem]);
      return newItem;
    },
    update: async (id: string, data: Partial<iPhone>) => {
      await delay(300);
      const items = getStorage<iPhone>('iphones');
      const updated = items.map(i => i.id === id ? { ...i, ...data } : i);
      setStorage('iphones', updated);
    },
    delete: async (id: string) => {
      await delay(300);
      setStorage('iphones', getStorage<iPhone>('iphones').filter(i => i.id !== id));
    }
  },
  clients: {
    list: async () => { await delay(300); return getStorage<Client>('clients'); },
    create: async (data: Omit<Client, 'id'>) => {
      await delay(300);
      const newItem = { ...data, id: uuidv4() };
      const items = getStorage<Client>('clients');
      setStorage('clients', [...items, newItem]);
      return newItem;
    },
    update: async (id: string, data: Partial<Client>) => {
      await delay(300);
      const items = getStorage<Client>('clients');
      const updated = items.map(i => i.id === id ? { ...i, ...data } : i);
      setStorage('clients', updated);
    },
    delete: async (id: string) => {
      await delay(300);
      setStorage('clients', getStorage<Client>('clients').filter(i => i.id !== id));
    }
  },
  suppliers: {
    list: async () => { await delay(300); return getStorage<Supplier>('suppliers'); },
    create: async (data: Omit<Supplier, 'id'>) => {
      await delay(300);
      const newItem = { ...data, id: uuidv4() };
      const items = getStorage<Supplier>('suppliers');
      setStorage('suppliers', [...items, newItem]);
      return newItem;
    },
    update: async (id: string, data: Partial<Supplier>) => {
      await delay(300);
      const items = getStorage<Supplier>('suppliers');
      const updated = items.map(i => i.id === id ? { ...i, ...data } : i);
      setStorage('suppliers', updated);
    },
    delete: async (id: string) => {
      await delay(300);
      setStorage('suppliers', getStorage<Supplier>('suppliers').filter(i => i.id !== id));
    }
  },
  sales: {
    list: async () => { await delay(300); return getStorage<Sale>('sales'); },
    create: async (data: Omit<Sale, 'id'>) => {
      await delay(300);
      const newItem = { ...data, id: uuidv4() };
      const items = getStorage<Sale>('sales');
      setStorage('sales', [...items, newItem]);
      
      // Update iPhone status
      const iphones = getStorage<iPhone>('iphones');
      setStorage('iphones', iphones.map(i => i.id === data.iphone_id ? { ...i, status: 'vendido' } : i));
      
      return newItem;
    },
    update: async (id: string, data: Partial<Sale>) => {
      await delay(300);
      const items = getStorage<Sale>('sales');
      const oldSale = items.find(i => i.id === id);
      
      if (oldSale && data.iphone_id && oldSale.iphone_id !== data.iphone_id) {
        // iPhone changed, update statuses
        const iphones = getStorage<iPhone>('iphones');
        const updatedIphones = iphones.map(i => {
          if (i.id === oldSale.iphone_id) return { ...i, status: 'disponivel' as const };
          if (i.id === data.iphone_id) return { ...i, status: 'vendido' as const };
          return i;
        });
        setStorage('iphones', updatedIphones);
      }

      const updated = items.map(i => i.id === id ? { ...i, ...data } : i);
      setStorage('sales', updated);
    },
    delete: async (id: string) => {
      await delay(300);
      const items = getStorage<Sale>('sales');
      const sale = items.find(i => i.id === id);
      
      if (sale) {
        // Revert iPhone status
        const iphones = getStorage<iPhone>('iphones');
        setStorage('iphones', iphones.map(i => i.id === sale.iphone_id ? { ...i, status: 'disponivel' } : i));
      }
      
      setStorage('sales', items.filter(i => i.id !== id));
    }
  }
};
