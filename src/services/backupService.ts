import { db, getCurrentUserId } from './db';
import { supabase } from '../lib/supabase';
import { Client, Supplier, iPhone, Console, Sale, PriceTableItem } from '../types';

export interface BackupData {
  version: number;
  timestamp: string;
  data: {
    suppliers?: Supplier[];
    clients?: Client[];
    iphones?: iPhone[];
    consoles?: Console[];
    prices?: PriceTableItem[];
    sales?: Sale[];
    purchases?: any[];
    products?: any[];
    product_units?: any[];
    fiscal_documents?: any[];
    fiscal_configs?: any[];
    gifts?: any[];
    gift_purchases?: any[];
    gift_dispatches?: any[];
    accessory_sales?: any[];
    product_photos?: any[];
    notes?: any[];
    note_checklist_items?: any[];
    note_audio?: any[];
    custom_payments?: Record<string, string>;
    store_settings?: Record<string, string>;
  };
}

const ALL_BACKUP_TABLES = [
  'suppliers', 'clients', 'iphones', 'consoles', 'prices', 'sales',
  'purchases', 'products', 'product_units', 'fiscal_documents', 'fiscal_configs',
  'gifts', 'gift_purchases', 'gift_dispatches', 'accessory_sales', 'product_photos',
  'notes', 'note_checklist_items', 'note_audio'
];

const STORE_SETTINGS_KEYS = [
  'auto_webhook_url',
  'auto_webhook_token',
  'auto_webhook_enabled',
  'auto_full_auto_enabled',
  'auto_template_3_days',
  'auto_template_day_of',
  'auto_template_overdue',
  'auto_template_registration',
  'auto_template_client_remote_confirmation',
  'auto_template_order_confirmed',
  'auto_template_order_preparing',
  'auto_template_order_ready',
  'auto_template_order_on_way',
  'auto_template_order_delivered',
  'auto_template_guarantee_sent',
  'auto_template_order_thank_you',
  'auto_attendant_name',
  'auto_store_phone',
  'auto_pix_info',
  'app_theme',
  'app_logo',
  'app_background'
];

export const backupService = {
  // Export all database tables into a single JSON object
  exportData: async (): Promise<BackupData> => {
    // Make sure we have latest in-memory and local data
    const [suppliers, clients, iphones, consoles, prices, sales] = await Promise.all([
      db.suppliers.list().catch(() => []),
      db.clients.list().catch(() => []),
      db.iphones.list().catch(() => []),
      db.consoles.list().catch(() => []),
      db.prices.list().catch(() => []),
      db.sales.list().catch(() => [])
    ]);

    const data: any = {
      suppliers,
      clients,
      iphones,
      consoles,
      prices,
      sales
    };

    // Grab remaining tables from storage
    for (const table of ALL_BACKUP_TABLES) {
      if (!data[table]) {
        try {
          const raw = localStorage.getItem(`db_fallback_${table}`);
          data[table] = raw ? JSON.parse(raw) : [];
        } catch (e) {
          data[table] = [];
        }
      }
    }

    // Export custom payments
    const custom_payments: Record<string, string> = {};
    for (const sale of sales) {
      if (sale && sale.id) {
        let stored = localStorage.getItem(`inst_payments_${sale.id}`);
        if (!stored && sale.custom_payments) {
          stored = typeof sale.custom_payments === 'string' ? sale.custom_payments : JSON.stringify(sale.custom_payments);
        }
        if (stored) {
          custom_payments[sale.id] = stored;
        }
      }
    }
    data.custom_payments = custom_payments;

    // Export store settings
    const store_settings: Record<string, string> = {};
    for (const key of STORE_SETTINGS_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null && val !== undefined) {
        store_settings[key] = val;
      }
    }
    data.store_settings = store_settings;

    return {
      version: 2,
      timestamp: new Date().toISOString(),
      data
    };
  },

  // Import JSON backup data and reconstruct all entities and relations WITHOUT DUPLICATING
  importData: async (backup: any): Promise<{ success: boolean; message: string; details: string[] }> => {
    const details: string[] = [];
    if (!backup || !backup.data) {
      return {
        success: false,
        message: 'Formato de arquivo inválido. O arquivo de backup deve conter um objeto "data".',
        details
      };
    }

    try {
      const data = backup.data;
      const userId = await getCurrentUserId().catch(() => null);

      // 1. Process and restore custom payments dictionary
      if (data.custom_payments && typeof data.custom_payments === 'object') {
        for (const [saleId, paymentsJson] of Object.entries(data.custom_payments)) {
          if (typeof paymentsJson === 'string' && paymentsJson.trim()) {
            localStorage.setItem(`inst_payments_${saleId}`, paymentsJson);
          } else if (typeof paymentsJson === 'object' && paymentsJson !== null) {
            localStorage.setItem(`inst_payments_${saleId}`, JSON.stringify(paymentsJson));
          }
        }
      }

      // 2. Process and restore store settings
      if (data.store_settings && typeof data.store_settings === 'object') {
        for (const [key, val] of Object.entries(data.store_settings)) {
          if (STORE_SETTINGS_KEYS.includes(key) && val !== undefined && val !== null) {
            localStorage.setItem(key, String(val));
          }
        }
      }

      // 3. Restore all tables deterministically preserving CANONICAL IDs
      for (const table of ALL_BACKUP_TABLES) {
        const incoming = Array.isArray(data[table]) ? data[table] : [];
        if (incoming.length === 0) continue;

        // Clean and prepare incoming items
        const preparedItems: any[] = [];
        const seenIds = new Set<string>();

        for (const rawItem of incoming) {
          if (!rawItem || typeof rawItem !== 'object') continue;
          
          const item = { ...rawItem };
          if (!item.id) {
            item.id = 'imported_' + Math.random().toString(36).substring(2, 11);
          }

          if (seenIds.has(item.id)) continue;
          seenIds.add(item.id);

          if (userId && !item.user_id) {
            item.user_id = userId;
          }

          // Format check for sales
          if (table === 'sales') {
            if (item.custom_payments && typeof item.custom_payments === 'object') {
              item.custom_payments = JSON.stringify(item.custom_payments);
            }
            if (data.custom_payments && data.custom_payments[item.id] && !item.custom_payments) {
              item.custom_payments = typeof data.custom_payments[item.id] === 'string' 
                ? data.custom_payments[item.id] 
                : JSON.stringify(data.custom_payments[item.id]);
            }
            if (item.custom_payments && typeof item.custom_payments === 'string') {
              localStorage.setItem(`inst_payments_${item.id}`, item.custom_payments);
            }
          }

          preparedItems.push(item);
        }

        // Save directly to local storage replacing or updating canonical entries
        localStorage.setItem(`db_fallback_${table}`, JSON.stringify(preparedItems));

        // If Supabase is connected and authenticated, sync these items to Supabase
        if (userId) {
          try {
            for (const item of preparedItems) {
              const cleanItem = { ...item, user_id: userId };
              // Delete relations/virtual columns
              delete cleanItem.iphone;
              delete cleanItem.console;
              delete cleanItem.client;
              delete cleanItem.supplier;
              delete cleanItem.installments_list;
              delete cleanItem.first_installment_date_formatted;
              delete cleanItem.client_name;
              delete cleanItem.item_name;

              try {
                await supabase.from(table).upsert(cleanItem);
              } catch (e) {}
            }
          } catch (cloudErr) {
            console.warn(`[Backup Cloud Sync] Warn for table ${table}:`, cloudErr);
          }
        }

        details.push(`✓ ${preparedItems.length} registros restaurados para ${table}.`);
      }

      // 4. Run automatic global deduplication and unification to guarantee zero duplicate records
      const dedupResult = await db.deduplicateDatabase();
      if (dedupResult.success && dedupResult.stats) {
        const totalCleaned = Object.values(dedupResult.stats).reduce((a, b) => a + b, 0);
        if (totalCleaned > 0) {
          details.push(`✓ ${totalCleaned} registros duplicados foram unificados automaticamente.`);
        }
      }

      // Invalidate and notify
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_cloud_sync_ts', String(Date.now()));
        window.dispatchEvent(new CustomEvent('cloud_sync_completed', { 
          detail: { timestamp: Date.now(), fromBackup: true } 
        }));
      }

      return {
        success: true,
        message: 'Backup restaurado com sucesso! Seus dados foram preservados e duplicatas foram unificadas.',
        details
      };
    } catch (error: any) {
      console.error('Fatal error during backup import:', error);
      return {
        success: false,
        message: 'Erro fatal ao importar backup: ' + (error.message || 'Falha desconhecida'),
        details
      };
    }
  }
};
