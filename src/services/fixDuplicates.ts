import { db } from './db';

export const fixDuplicates = async () => {
  try {
    const result = await db.deduplicateDatabase();
    return {
      success: result.success,
      clientsFixed: result.stats?.clients || 0,
      salesFixed: result.stats?.sales || 0,
      iphonesFixed: result.stats?.iphones || 0,
      consolesFixed: result.stats?.consoles || 0,
      suppliersFixed: result.stats?.suppliers || 0,
      pricesFixed: result.stats?.prices || 0,
      message: result.message
    };
  } catch (error: any) {
    console.error('Error in fixDuplicates:', error);
    return { success: false, error: error.message || error, clientsFixed: 0, salesFixed: 0 };
  }
};
