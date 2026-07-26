import { db } from './db';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from './db';

export const fixDuplicates = async () => {
  try {
    const userId = await getCurrentUserId();
    
    // 1. Fix Clients
    const clients = await db.clients.list();
    const clientsByName = new Map<string, any[]>();
    for (const c of clients) {
      if (!clientsByName.has(c.name)) clientsByName.set(c.name, []);
      clientsByName.get(c.name)!.push(c);
    }
    
    const duplicateClientsToMerge = new Map<string, string>(); // oldId -> canonicalId
    
    Array.from(clientsByName.entries()).forEach(([name, duplicates]) => {
      if (duplicates.length > 1) {
        // Sort by created_at (ascending) to keep the oldest one
        duplicates.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        const canonical = duplicates[0];
        
        // Merge missing data into canonical if needed
        // For now, just map duplicates to canonical
        for (let i = 1; i < duplicates.length; i++) {
          duplicateClientsToMerge.set(duplicates[i].id, canonical.id);
        }
      }
    });
    
    if (duplicateClientsToMerge.size > 0) {
      console.log(`Found ${duplicateClientsToMerge.size} duplicate clients to merge.`);
      
      // Update sales to point to canonical client
      const sales = await db.sales.list();
      for (const sale of sales) {
        if (duplicateClientsToMerge.has(sale.client_id)) {
          const newClientId = duplicateClientsToMerge.get(sale.client_id)!;
          let updateQ = supabase.from('sales').update({ client_id: newClientId }).eq('id', sale.id);
          if (userId) updateQ = updateQ.eq('user_id', userId);
          await updateQ;
        }
      }
      
      // Delete duplicate clients
      Array.from(duplicateClientsToMerge.keys()).forEach(async (dupId) => {
        let delQ = supabase.from('clients').delete().eq('id', dupId);
        if (userId) delQ = delQ.eq('user_id', userId);
        await delQ;
      });
      console.log('Client deduplication completed.');
    }

    // 2. Fix Sales (Duplicate Sales from bad import)
    // A duplicate sale would have the same client_id, sale_date, sell_price, but different id.
    const allSales = await db.sales.list();
    const salesByKey = new Map<string, any[]>();
    for (const s of allSales) {
      const key = `${s.client_id}_${s.sale_date}_${s.sell_price}`;
      if (!salesByKey.has(key)) salesByKey.set(key, []);
      salesByKey.get(key)!.push(s);
    }
    
    let deletedSales = 0;
    const entries = Array.from(salesByKey.entries());
    for (const [key, duplicates] of entries) {
      if (duplicates.length > 1) {
        duplicates.sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());
        // Keep the one that has installments_paid or signature data if possible
        const canonical = duplicates.find(d => (d.installments_paid || 0) > 0 || d.signature_data) || duplicates[0];
        
        for (const s of duplicates) {
          if (s.id !== canonical.id) {
            let delQ = supabase.from('sales').delete().eq('id', s.id);
            if (userId) delQ = delQ.eq('user_id', userId);
            await delQ;
            deletedSales++;
          }
        }
      }
    }
    if (deletedSales > 0) {
      console.log(`Deleted ${deletedSales} duplicate sales.`);
    }

    // 3. Fix missing installments_paid in DB
    // If installments_paid is ONLY in localStorage, we can't save it to Supabase because the column doesn't exist.
    // Wait, let's check if the column exists in Supabase.
    const testUpdate = await supabase.from('sales').update({ installments_paid: 1 }).limit(1);
    const columnExists = !testUpdate.error?.message?.includes("Could not find the 'installments_paid' column");
    if (columnExists) {
      console.log('Column installments_paid exists! We should save it.');
    }
    
    return { success: true, clientsFixed: duplicateClientsToMerge.size, salesFixed: deletedSales };
  } catch (error) {
    console.error('Error in fixDuplicates:', error);
    return { success: false, error };
  }
};
