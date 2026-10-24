import { db, getCurrentUserId } from './db';
import { supabase } from '../lib/supabase';
import { Client, Supplier, iPhone, Console, Sale, PriceTableItem } from '../types';
import { validateAndParseBackup, BackupValidationResult } from './backupValidator';
import { compressBase64Image, safeSaveStoreSetting, safeSetLocalStorage } from '../utils/imageStorageUtils';

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

    // Export store settings (auto-optimizing large images)
    const store_settings: Record<string, string> = {};
    for (const key of STORE_SETTINGS_KEYS) {
      let val = localStorage.getItem(key);
      if (val !== null && val !== undefined) {
        if ((key === 'app_logo' || key === 'app_background') && val.startsWith('data:image/') && val.length > 40000) {
          try {
            val = await compressBase64Image(val, key === 'app_logo' ? 300 : 800, 0.72);
          } catch {
            // Keep original if compression fails
          }
        }
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

  // Validate backup data and return diagnosis
  validateBackup: (input: string | object): BackupValidationResult => {
    return validateAndParseBackup(input);
  },

  // Import JSON backup data and reconstruct all entities and relations WITHOUT DUPLICATING
  importData: async (backup: any): Promise<{ success: boolean; message: string; details: string[]; summary?: any }> => {
    const details: string[] = [];

    // 1. Run deep validation and normalization on incoming backup
    const validation = validateAndParseBackup(backup);
    if (!validation.isValid || !validation.normalizedData) {
      return {
        success: false,
        message: validation.error || 'Código ou arquivo de backup inválido.',
        details: [
          ...(validation.errorDetails ? [validation.errorDetails] : []),
          ...validation.warnings
        ]
      };
    }

    if (validation.warnings.length > 0) {
      details.push(...validation.warnings.map(w => `⚠️ ${w}`));
    }

    try {
      const data = validation.normalizedData.data;
      const userId = await getCurrentUserId().catch(() => null);

      // 1. Process and restore custom payments dictionary safely
      if (data.custom_payments && typeof data.custom_payments === 'object') {
        for (const [saleId, paymentsJson] of Object.entries(data.custom_payments)) {
          try {
            if (typeof paymentsJson === 'string' && paymentsJson.trim()) {
              safeSetLocalStorage(`inst_payments_${saleId}`, paymentsJson);
            } else if (typeof paymentsJson === 'object' && paymentsJson !== null) {
              safeSetLocalStorage(`inst_payments_${saleId}`, JSON.stringify(paymentsJson));
            }
          } catch (paymentErr) {
            console.warn(`[Backup Import] Skipped custom payment for ${saleId}:`, paymentErr);
          }
        }
      }

      // 2. Process and restore store settings with automatic image compression and quota protection
      if (data.store_settings && typeof data.store_settings === 'object') {
        for (const [key, val] of Object.entries(data.store_settings)) {
          if (STORE_SETTINGS_KEYS.includes(key) && val !== undefined && val !== null) {
            try {
              const saved = await safeSaveStoreSetting(key, val);
              if (!saved && (key === 'app_logo' || key === 'app_background')) {
                details.push(`⚠️ A imagem de '${key}' excedeu a cota de armazenamento local e foi ignorada para não bloquear a restauração.`);
              }
            } catch (settingErr) {
              console.warn(`[Backup Import] Non-fatal error saving setting ${key}:`, settingErr);
            }
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
              safeSetLocalStorage(`inst_payments_${item.id}`, item.custom_payments);
            }
          }

          preparedItems.push(item);
        }

        // Save directly to local storage replacing or updating canonical entries with quota fallback
        const savedLocally = safeSetLocalStorage(`db_fallback_${table}`, JSON.stringify(preparedItems));
        if (!savedLocally) {
          console.warn(`[Backup Import] Table ${table} exceeded local storage quota.`);
          details.push(`⚠️ Tabela '${table}' (${preparedItems.length} itens) excedeu a cota do localStorage do navegador, mas os dados foram processados.`);
        }

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
      try {
        const dedupResult = await db.deduplicateDatabase();
        if (dedupResult.success && dedupResult.stats) {
          const totalCleaned = Object.values(dedupResult.stats).reduce((a, b) => a + b, 0);
          if (totalCleaned > 0) {
            details.push(`✓ ${totalCleaned} registros duplicados foram unificados automaticamente.`);
          }
        }
      } catch (dedupErr) {
        console.warn('[Backup Import] Deduplication warn:', dedupErr);
      }

      // Invalidate and notify safely
      if (typeof window !== 'undefined') {
        try {
          safeSetLocalStorage('last_cloud_sync_ts', String(Date.now()));
        } catch {}
        window.dispatchEvent(new CustomEvent('cloud_sync_completed', { 
          detail: { timestamp: Date.now(), fromBackup: true } 
        }));
      }

      const summary = validation.summary;
      const countMsg = summary
        ? `${summary.totalRecords} registros recuperados (${summary.clients} clientes, ${summary.sales} vendas, ${summary.iphones + summary.consoles} aparelhos).`
        : 'Seus dados foram preservados e duplicatas foram unificadas.';

      return {
        success: true,
        message: `Backup restaurado com sucesso! ${countMsg}`,
        details,
        summary
      };
    } catch (error: any) {
      console.error('Fatal error during backup import:', error);
      return {
        success: false,
        message: 'Erro ao importar backup: ' + (error.message || 'Falha desconhecida'),
        details
      };
    }
  }
};

