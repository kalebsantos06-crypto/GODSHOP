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
    custom_payments?: Record<string, string>;
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

    const custom_payments: Record<string, string> = {};
    for (const sale of sales) {
      let stored = localStorage.getItem(`inst_payments_${sale.id}`);
      if (!stored && sale.custom_payments) {
        stored = typeof sale.custom_payments === 'string' ? sale.custom_payments : JSON.stringify(sale.custom_payments);
      }
      if (stored) {
        custom_payments[sale.id] = stored;
      }
    }

    return {
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        suppliers,
        clients,
        iphones,
        consoles,
        prices,
        sales,
        custom_payments
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
      
      const existingSuppliers = await db.suppliers.list().catch(() => []);
      const existingClients = await db.clients.list().catch(() => []);
      const existingIphones = await db.iphones.list().catch(() => []);
      const existingConsoles = await db.consoles.list().catch(() => []);
      const existingSales = await db.sales.list().catch(() => []);
      
      // ID Maps to preserve relationships
      const supplierIdMap: Record<string, string> = {};
      const clientIdMap: Record<string, string> = {};
      const iphoneIdMap: Record<string, string> = {};
      const consoleIdMap: Record<string, string> = {};

      // 1. Import Suppliers
      let supplierCount = 0;
      if (Array.isArray(data.suppliers)) {
        for (const s of data.suppliers) {
          try {
            const existing = existingSuppliers.find(ex => ex.name.toLowerCase() === s.name.toLowerCase());
            if (existing) {
              supplierIdMap[s.id] = existing.id;
            } else {
              const created = await db.suppliers.create({
                name: s.name,
                contact: s.contact || ''
              });
              supplierIdMap[s.id] = created.id;
              existingSuppliers.push(created);
              supplierCount++;
            }
          } catch (e: any) {
            console.error('Error importing supplier:', s, e);
          }
        }
        if (supplierCount > 0) details.push(`✓ ${supplierCount} fornecedores importados.`);
      }

      // 2. Import Clients
      let clientCount = 0;
      if (Array.isArray(data.clients)) {
        for (const c of data.clients) {
          try {
            const cleanCpf = c.cpf ? c.cpf.replace(/\D/g, '') : '';
            const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
            
            const existing = existingClients.find(ex => {
              if (cleanCpf && ex.cpf && ex.cpf.replace(/\D/g, '') === cleanCpf) return true;
              if (cleanPhone && ex.phone && ex.phone.replace(/\D/g, '') === cleanPhone) return true;
              if (ex.name.toLowerCase() === c.name.toLowerCase()) return true;
              return false;
            });

            if (existing) {
              clientIdMap[c.id] = existing.id;
            } else {
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
              existingClients.push(created);
              clientCount++;
            }
          } catch (e: any) {
            console.error('Error importing client:', c, e);
          }
        }
        if (clientCount > 0) details.push(`✓ ${clientCount} clientes importados.`);
      }

      // 3. Import iPhones (Products)
      let iphoneCount = 0;
      if (Array.isArray(data.iphones)) {
        for (const phone of data.iphones) {
          try {
            const mappedSupplierId = phone.supplier_id && supplierIdMap[phone.supplier_id]
              ? supplierIdMap[phone.supplier_id]
              : ''; 
              
            const existing = existingIphones.find(ex => 
              (phone.imei && ex.imei === phone.imei) || 
              (ex.model === phone.model && ex.storage === phone.storage && ex.color === phone.color && ex.buy_price === Number(phone.buy_price) && new Date(ex.buy_date).getTime() === new Date(phone.buy_date).getTime())
            );

            if (existing) {
              iphoneIdMap[phone.id] = existing.id;
            } else {
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
              existingIphones.push(created);
              iphoneCount++;
            }
          } catch (e: any) {
            console.error('Error importing iPhone:', phone, e);
          }
        }
        if (iphoneCount > 0) details.push(`✓ ${iphoneCount} aparelhos de iPhone importados.`);
      }

      // 4. Import Consoles (Products)
      let consoleCount = 0;
      if (Array.isArray(data.consoles)) {
        for (const consoleItem of data.consoles) {
          try {
            const existing = existingConsoles.find(ex => 
              ex.model === consoleItem.model && ex.version === consoleItem.version && ex.buy_price === Number(consoleItem.buy_price) && new Date(ex.buy_date).getTime() === new Date(consoleItem.buy_date).getTime()
            );
            
            if (existing) {
              consoleIdMap[consoleItem.id] = existing.id;
            } else {
              const created = await db.consoles.create({
                model: consoleItem.model,
                version: consoleItem.version,
                buy_price: Number(consoleItem.buy_price) || 0,
                buy_date: consoleItem.buy_date || new Date().toISOString(),
                status: consoleItem.status || 'disponivel',
                condition: consoleItem.condition || 'seminovo'
              });
              consoleIdMap[consoleItem.id] = created.id;
              existingConsoles.push(created);
              consoleCount++;
            }
          } catch (e: any) {
            console.error('Error importing Console:', consoleItem, e);
          }
        }
        if (consoleCount > 0) details.push(`✓ ${consoleCount} consoles importados.`);
      }
      // 5. Import Price Table Items
      let priceCount = 0;
      const existingPrices = await db.prices.list().catch(() => []);
      if (Array.isArray(data.prices)) {
        for (const p of data.prices) {
          try {
            const existing = existingPrices.find(ex => ex.model === p.model && ex.version === p.version && ex.storage === p.storage && ex.color === p.color && ex.condition === p.condition);
            if (!existing) {
              const created = await db.prices.create({
                category: p.category,
                model: p.model,
                version: p.version,
                storage: p.storage,
                color: p.color,
                condition: p.condition,
                price: Number(p.price) || 0,
                price_usd: p.price_usd ? Number(p.price_usd) : undefined
              });
              existingPrices.push(created);
              priceCount++;
            }
          } catch (e: any) {
            console.error('Error importing price table item:', p, e);
          }
        }
        if (priceCount > 0) details.push(`✓ ${priceCount} itens da tabela de preços importados.`);
      }

      // 6. Import Sales
      let salesCount = 0;
      if (Array.isArray(data.sales)) {
        for (const s of data.sales) {
          try {
            let mappedClientId = s.client_id ? clientIdMap[s.client_id] : null;
            
            // If client wasn't mapped by ID map, try finding client by name or create fallback
            if (!mappedClientId && s.client_id) {
              const matchedFromBackup = Array.isArray(data.clients) ? data.clients.find(c => c.id === s.client_id) : null;
              if (matchedFromBackup) {
                const foundClient = existingClients.find(ex => ex.name.toLowerCase() === matchedFromBackup.name.toLowerCase());
                if (foundClient) {
                  mappedClientId = foundClient.id;
                  clientIdMap[s.client_id] = foundClient.id;
                } else {
                  const created = await db.clients.create({
                    name: matchedFromBackup.name,
                    phone: matchedFromBackup.phone || '',
                    cpf: matchedFromBackup.cpf,
                    email: matchedFromBackup.email,
                    address: matchedFromBackup.address,
                    street: matchedFromBackup.street,
                    number: matchedFromBackup.number,
                    neighborhood: matchedFromBackup.neighborhood,
                    complement: matchedFromBackup.complement,
                    city: matchedFromBackup.city,
                    state: matchedFromBackup.state
                  });
                  mappedClientId = created.id;
                  clientIdMap[s.client_id] = created.id;
                  existingClients.push(created);
                }
              }
            }

            // If still no client found, fallback to the first existing client or create a generic one
            if (!mappedClientId) {
              if (existingClients.length > 0) {
                mappedClientId = existingClients[0].id;
              } else {
                const created = await db.clients.create({
                  name: 'Cliente Importado',
                  phone: ''
                });
                mappedClientId = created.id;
                existingClients.push(created);
              }
            }

            const mappedIphoneId = s.iphone_id ? iphoneIdMap[s.iphone_id] : undefined;
            const mappedConsoleId = s.console_id ? consoleIdMap[s.console_id] : undefined;
            
            // Flexible matching to see if sale is already in DB
            const sSaleDate = s.sale_date ? new Date(s.sale_date).getTime() : 0;
            const existing = existingSales.find(ex => {
              if (ex.id === s.id) return true;
              const exSaleDate = ex.sale_date ? new Date(ex.sale_date).getTime() : 0;
              const sameClient = ex.client_id === mappedClientId;
              const samePrice = Math.abs(Number(ex.sell_price) - Number(s.sell_price)) < 0.01;
              const sameDate = Math.abs(exSaleDate - sSaleDate) < 60000; // within 1 minute
              return sameClient && samePrice && (sameDate || ex.sale_date === s.sale_date);
            });

            if (!existing) {
              const createdSale = await db.sales.create({
                client_id: mappedClientId,
                iphone_id: mappedIphoneId,
                console_id: mappedConsoleId,
                sell_price: Number(s.sell_price) || 0,
                payment_method: s.payment_method || 'Pix',
                sale_date: s.sale_date || new Date().toISOString(),
                installments: s.installments,
                installment_frequency: s.installment_frequency,
                down_payment: s.down_payment,
                first_installment_date: s.first_installment_date,
                installments_paid: s.installments_paid,
                custom_payments: s.custom_payments || (data.custom_payments && data.custom_payments[s.id]),
                signature_data: s.signature_data,
                signed_at: s.signed_at,
                signed_ip: s.signed_ip
              });
              
              // Restore custom payments mapping to the new sale ID
              const paymentsToStore = (data.custom_payments && data.custom_payments[s.id]) || (s.custom_payments ? (typeof s.custom_payments === 'string' ? s.custom_payments : JSON.stringify(s.custom_payments)) : null);
              if (paymentsToStore) {
                localStorage.setItem(`inst_payments_${createdSale.id}`, paymentsToStore);
              }
              
              existingSales.push(createdSale);
              salesCount++;
            } else {
              // Existing sale: update payments and signatures if backup has richer data
              let needsUpdate = false;
              const updatePayload: any = {};
              if (s.installments_paid !== undefined && (s.installments_paid > (existing.installments_paid || 0))) {
                updatePayload.installments_paid = s.installments_paid;
                needsUpdate = true;
              }
              if (s.signature_data && !existing.signature_data) {
                updatePayload.signature_data = s.signature_data;
                updatePayload.signed_at = s.signed_at;
                updatePayload.signed_ip = s.signed_ip;
                needsUpdate = true;
              }
              const paymentsToStore = (data.custom_payments && data.custom_payments[s.id]) || (s.custom_payments ? (typeof s.custom_payments === 'string' ? s.custom_payments : JSON.stringify(s.custom_payments)) : null);
              if (paymentsToStore) {
                localStorage.setItem(`inst_payments_${existing.id}`, paymentsToStore);
                updatePayload.custom_payments = paymentsToStore;
                needsUpdate = true;
              }
              if (needsUpdate) {
                await db.sales.update(existing.id, updatePayload).catch(e => console.warn('Update sale warning:', e));
              }
            }
          } catch (e: any) {
            console.error('Error importing sale:', s, e);
          }
        }
        if (salesCount > 0) details.push(`✓ ${salesCount} notas fiscais / vendas importadas.`);
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
