import { db } from './db';
import { Client, Supplier, iPhone, Console, Sale, PriceTableItem } from '../types';

export interface BackupData {
  version: number;
  timestamp: string;
  data: {
    suppliers: Supplier[];
    clients: Client[];
    iphones: iPhone[];
    consoles: Console[];
    prices: PriceTableItem[];
    sales: Sale[];
  };
}

export const backupService = {
  // Export all database tables into a single JSON object
  exportData: async (): Promise<BackupData> => {
    const [suppliers, clients, iphones, consoles, prices, sales] = await Promise.all([
      db.suppliers.list().catch(() => []),
      db.clients.list().catch(() => []),
      db.iphones.list().catch(() => []),
      db.consoles.list().catch(() => []),
      db.prices.list().catch(() => []),
      db.sales.list().catch(() => [])
    ]);

    return {
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        suppliers,
        clients,
        iphones,
        consoles,
        prices,
        sales
      }
    };
  },

  // Import JSON backup data and reconstruct all entities and relations
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
      
      // ID Maps to preserve relationships
      const supplierIdMap: Record<string, string> = {};
      const clientIdMap: Record<string, string> = {};
      const iphoneIdMap: Record<string, string> = {};
      const consoleIdMap: Record<string, string> = {};

      // 1. Import Suppliers
      if (Array.isArray(data.suppliers)) {
        for (const s of data.suppliers) {
          try {
            const created = await db.suppliers.create({
              name: s.name,
              contact: s.contact || ''
            });
            supplierIdMap[s.id] = created.id;
          } catch (e: any) {
            console.error('Error importing supplier:', s, e);
          }
        }
        details.push(`✓ ${Object.keys(supplierIdMap).length} fornecedores importados.`);
      }

      // 2. Import Clients
      if (Array.isArray(data.clients)) {
        for (const c of data.clients) {
          try {
            const created = await db.clients.create({
              name: c.name,
              phone: c.phone || '',
              cpf: c.cpf,
              email: c.email,
              address: c.address,
              street: c.street,
              number: c.number,
              neighborhood: c.neighborhood,
              complement: c.complement,
              city: c.city,
              state: c.state
            });
            clientIdMap[c.id] = created.id;
          } catch (e: any) {
            console.error('Error importing client:', c, e);
          }
        }
        details.push(`✓ ${Object.keys(clientIdMap).length} clientes importados.`);
      }

      // 3. Import iPhones (Products)
      if (Array.isArray(data.iphones)) {
        for (const phone of data.iphones) {
          try {
            // Map old supplier ID to new supplier ID if available
            const mappedSupplierId = phone.supplier_id && supplierIdMap[phone.supplier_id]
              ? supplierIdMap[phone.supplier_id]
              : ''; // Leave empty or handle fallback in db if required

            const created = await db.iphones.create({
              model: phone.model,
              storage: phone.storage,
              color: phone.color,
              buy_price: Number(phone.buy_price) || 0,
              buy_date: phone.buy_date || new Date().toISOString(),
              status: phone.status || 'disponivel',
              condition: phone.condition || 'seminovo',
              imei: phone.imei,
              supplier_id: mappedSupplierId
            });
            iphoneIdMap[phone.id] = created.id;
          } catch (e: any) {
            console.error('Error importing iPhone:', phone, e);
          }
        }
        details.push(`✓ ${Object.keys(iphoneIdMap).length} aparelhos de iPhone importados.`);
      }

      // 4. Import Consoles (Products)
      if (Array.isArray(data.consoles)) {
        for (const consoleItem of data.consoles) {
          try {
            const created = await db.consoles.create({
              model: consoleItem.model,
              version: consoleItem.version,
              buy_price: Number(consoleItem.buy_price) || 0,
              buy_date: consoleItem.buy_date || new Date().toISOString(),
              status: consoleItem.status || 'disponivel',
              condition: consoleItem.condition || 'seminovo'
            });
            consoleIdMap[consoleItem.id] = created.id;
          } catch (e: any) {
            console.error('Error importing Console:', consoleItem, e);
          }
        }
        details.push(`✓ ${Object.keys(consoleIdMap).length} consoles importados.`);
      }

      // 5. Import Price Table Items
      let priceCount = 0;
      if (Array.isArray(data.prices)) {
        for (const p of data.prices) {
          try {
            await db.prices.create({
              category: p.category,
              model: p.model,
              version: p.version,
              storage: p.storage,
              color: p.color,
              condition: p.condition,
              price: Number(p.price) || 0,
              price_usd: p.price_usd ? Number(p.price_usd) : undefined
            });
            priceCount++;
          } catch (e: any) {
            console.error('Error importing price table item:', p, e);
          }
        }
        details.push(`✓ ${priceCount} itens da tabela de preços importados.`);
      }

      // 6. Import Sales
      let salesCount = 0;
      if (Array.isArray(data.sales)) {
        for (const s of data.sales) {
          try {
            const mappedClientId = s.client_id ? clientIdMap[s.client_id] : null;
            if (!mappedClientId) continue; // Cannot create sale without client

            const mappedIphoneId = s.iphone_id ? iphoneIdMap[s.iphone_id] : undefined;
            const mappedConsoleId = s.console_id ? consoleIdMap[s.console_id] : undefined;

            await db.sales.create({
              client_id: mappedClientId,
              iphone_id: mappedIphoneId,
              console_id: mappedConsoleId,
              sell_price: Number(s.sell_price) || 0,
              payment_method: s.payment_method || 'Pix',
              sale_date: s.sale_date || new Date().toISOString(),
              installments: s.installments,
              installment_frequency: s.installment_frequency,
              down_payment: s.down_payment,
              first_installment_date: s.first_installment_date
            });
            salesCount++;
          } catch (e: any) {
            console.error('Error importing sale:', s, e);
          }
        }
        details.push(`✓ ${salesCount} notas fiscais / vendas importadas.`);
      }

      return {
        success: true,
        message: 'Importação realizada com sucesso! Seus dados originais foram reconstruídos.',
        details
      };
    } catch (error: any) {
      console.error('Fatal error during backup import:', error);
      return {
        success: false,
        message: 'Erro fatal ao importar backup: ' + error.message,
        details
      };
    }
  }
};
