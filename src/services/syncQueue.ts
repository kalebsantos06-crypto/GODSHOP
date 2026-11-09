import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { broadcastLocalChange } from './realtime';

export interface QueueItem {
  id: string;
  table: string;
  action: 'upsert' | 'update' | 'delete';
  payload: any;
  timestamp: string;
  attempts: number;
  lastAttemptTs?: number;
  error?: string;
}

export interface SyncConflictLog {
  id: string;
  table: string;
  recordId: string;
  timestamp: string;
  type: 'financial_merge' | 'stock_status' | 'timestamp_override';
  description: string;
  details: any;
}

const STORAGE_KEY = 'godshop_offline_sync_queue';
const CONFLICT_KEY = 'godshop_sync_conflicts';
const DB_NAME = 'godshop_offline_db';
const STORE_NAME = 'sync_queue';
const CONFLICT_STORE = 'sync_conflicts';

let isProcessing = false;
let dbInstance: IDBDatabase | null = null;

/**
 * Initializes IndexedDB storage instance
 */
function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CONFLICT_STORE)) {
          db.createObjectStore(CONFLICT_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = (event: any) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };
      request.onerror = () => {
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Reads queue synchronously from localStorage (fallback / cache)
 */
function getLocalStorageQueue(): QueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Saves queue to localStorage (synchronous fallback)
 */
function saveLocalStorageQueue(queue: QueueItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {}
}

/**
 * Persists full queue state to both IndexedDB and LocalStorage
 */
async function persistQueue(queue: QueueItem[]) {
  saveLocalStorageQueue(queue);
  const db = await getIDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await new Promise<void>((res) => {
        const clearReq = store.clear();
        clearReq.onsuccess = () => {
          if (queue.length === 0) {
            res();
            return;
          }
          let completed = 0;
          queue.forEach((item) => {
            const addReq = store.put(item);
            addReq.onsuccess = () => {
              completed++;
              if (completed === queue.length) res();
            };
            addReq.onerror = () => {
              completed++;
              if (completed === queue.length) res();
            };
          });
        };
        clearReq.onerror = () => res();
      });
    } catch (e) {}
  }
}

/**
 * Loads pending queue items (IndexedDB preferred, LocalStorage fallback)
 */
export async function loadPendingQueue(): Promise<QueueItem[]> {
  const db = await getIDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const items = await new Promise<QueueItem[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      if (items && items.length > 0) {
        saveLocalStorageQueue(items);
        return items;
      }
    } catch (e) {}
  }
  return getLocalStorageQueue();
}

/**
 * Logs data conflict for auditability and recovery
 */
export async function logSyncConflict(
  table: string,
  recordId: string,
  type: 'financial_merge' | 'stock_status' | 'timestamp_override',
  description: string,
  details: any
) {
  const conflictLog: SyncConflictLog = {
    id: `cnf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    table,
    recordId,
    timestamp: new Date().toISOString(),
    type,
    description,
    details,
  };

  try {
    if (typeof window !== 'undefined') {
      const existing: SyncConflictLog[] = JSON.parse(localStorage.getItem(CONFLICT_KEY) || '[]');
      existing.unshift(conflictLog);
      localStorage.setItem(CONFLICT_KEY, JSON.stringify(existing.slice(0, 100)));
    }
  } catch (e) {}

  const db = await getIDB();
  if (db) {
    try {
      const tx = db.transaction(CONFLICT_STORE, 'readwrite');
      tx.objectStore(CONFLICT_STORE).put(conflictLog);
    } catch (e) {}
  }
}

/**
 * Intelligently merges financial sale data to prevent overwriting paid installments or custom payments
 */
export function mergeFinancialSaleData(existing: any, incoming: any): any {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const merged = { ...existing, ...incoming };

  try {
    // 1. Merge custom_payments dictionary (installment_number -> payment_data/amount)
    const exCust = typeof existing.custom_payments === 'string'
      ? JSON.parse(existing.custom_payments || '{}')
      : (existing.custom_payments || {});

    const incCust = typeof incoming.custom_payments === 'string'
      ? JSON.parse(incoming.custom_payments || '{}')
      : (incoming.custom_payments || {});

    const mergedCust = { ...exCust, ...incCust };

    // Combine paid installment markers from both local and remote
    const allKeys = Array.from(new Set([...Object.keys(exCust), ...Object.keys(incCust)]));
    let paidCount = 0;

    for (const key of allKeys) {
      const exVal = exCust[key];
      const incVal = incCust[key];
      if (exVal || incVal) {
        mergedCust[key] = incVal || exVal;
        paidCount++;
      }
    }

    if (Object.keys(mergedCust).length > 0) {
      merged.custom_payments = JSON.stringify(mergedCust);
    }

    // 2. Ensure installments_paid is never decremented unless explicitly reset
    const exPaid = Number(existing.installments_paid) || 0;
    const incPaid = Number(incoming.installments_paid) || 0;
    const maxPaid = Math.max(exPaid, incPaid, paidCount);
    merged.installments_paid = maxPaid;

    // 3. Preserve client signature and signed metadata
    const exSig = existing.signature_data;
    const incSig = incoming.signature_data;
    if (exSig && !incSig) {
      merged.signature_data = exSig;
      merged.signed_at = existing.signed_at;
      merged.signed_ip = existing.signed_ip;
    } else if (incSig && !exSig) {
      merged.signature_data = incSig;
      merged.signed_at = incoming.signed_at;
      merged.signed_ip = incoming.signed_ip;
    }

    if (exPaid > 0 || incPaid > 0 || paidCount > 0) {
      logSyncConflict('sales', merged.id || incoming.id, 'financial_merge', 'Financial sale payments combined atomically', {
        exPaid,
        incPaid,
        maxPaid,
        paidCount,
      });
    }
  } catch (e) {
    console.warn('[SyncQueue] Financial sale merge warning:', e);
  }

  return merged;
}

/**
 * Enqueues an offline mutation operation with deduplication and idempotency
 */
export function enqueueOfflineOperation(
  table: string,
  action: 'upsert' | 'update' | 'delete',
  payload: any
): QueueItem {
  const currentQueue = getLocalStorageQueue();
  const id = payload?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `queue_${Date.now()}_${Math.random()}`);
  
  const nowIso = new Date().toISOString();
  const itemPayload = {
    ...payload,
    id,
    updated_at: payload?.updated_at || nowIso,
  };

  // Deduplication: remove previous pending item for same table and record ID
  const filtered = currentQueue.filter(q => !(q.table === table && q.payload?.id === id));
  
  const newItem: QueueItem = {
    id: `opt_${id}`,
    table,
    action,
    payload: itemPayload,
    timestamp: nowIso,
    attempts: 0,
  };

  filtered.push(newItem);
  persistQueue(filtered).catch(() => {});

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('godshop_sync_queue_updated', { detail: { queueLength: filtered.length } }));
  }

  return newItem;
}

/**
 * Returns current pending queue length
 */
export function getPendingQueueLength(): number {
  return getLocalStorageQueue().length;
}

/**
 * Replays queued offline operations against Supabase with idempotency and retry backoff
 */
export async function replaySyncQueue(): Promise<{ processed: number; remaining: number }> {
  if (isProcessing) return { processed: 0, remaining: getLocalStorageQueue().length };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { processed: 0, remaining: getLocalStorageQueue().length };
  if (!isSupabaseConfigured()) return { processed: 0, remaining: 0 };

  const queue = await loadPendingQueue();
  if (queue.length === 0) return { processed: 0, remaining: 0 };

  isProcessing = true;
  let processedCount = 0;
  const remainingQueue: QueueItem[] = [];
  const nowTs = Date.now();

  for (const item of queue) {
    // Backoff check: skip items that failed recently (less than 3s * attempts ago)
    if (item.attempts > 0 && item.lastAttemptTs) {
      const waitTime = Math.min(3000 * Math.pow(1.5, item.attempts), 60000);
      if (nowTs - item.lastAttemptTs < waitTime) {
        remainingQueue.push(item);
        continue;
      }
    }

    try {
      item.lastAttemptTs = nowTs;

      if (item.action === 'upsert' || item.action === 'update') {
        let payloadToSync = item.payload;

        const { error } = item.table === 'sales' ? await supabase.rpc('rpc_merge_sale_payments', {
          p_sale_id: payloadToSync.id,
          p_new_payments: JSON.parse(typeof payloadToSync.custom_payments === 'string' ? payloadToSync.custom_payments : JSON.stringify(payloadToSync.custom_payments || {})),
          p_signature_data: payloadToSync.signature_data,
          p_signed_at: payloadToSync.signed_at,
          p_signed_ip: payloadToSync.signed_ip
        }) : await supabase.from(item.table).upsert(payloadToSync, { onConflict: 'id' });

        if (error) {
          console.warn(`[SyncQueue] Replay error for ${item.table} (${item.payload.id}):`, error);
          item.attempts += 1;
          item.error = error.message;
          // Retain item for up to 25 retry attempts
          if (item.attempts < 25) {
            remainingQueue.push(item);
          } else {
            await logSyncConflict(item.table, item.payload.id, 'timestamp_override', 'Max retries reached', { error: error.message, item });
          }
        } else {
          processedCount++;
          broadcastLocalChange(item.table);
        }
      } else if (item.action === 'delete') {
        const { error } = await supabase.from(item.table).delete().eq('id', item.payload.id);
        if (error) {
          console.warn(`[SyncQueue] Delete error for ${item.table}:`, error);
          item.attempts += 1;
          item.error = error.message;
          if (item.attempts < 25) {
            remainingQueue.push(item);
          }
        } else {
          processedCount++;
          broadcastLocalChange(item.table);
        }
      }
    } catch (err: any) {
      console.warn(`[SyncQueue] Exception replaying item:`, err);
      item.attempts += 1;
      item.error = err?.message || 'Unknown error';
      if (item.attempts < 25) {
        remainingQueue.push(item);
      }
    }
  }

  await persistQueue(remainingQueue);
  isProcessing = false;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('godshop_sync_queue_updated', { detail: { queueLength: remainingQueue.length } }));
  }

  return { processed: processedCount, remaining: remainingQueue.length };
}

/**
 * Initializes auto-replay listeners when device comes online or regains focus
 */
export function initSyncQueueAutoReplay() {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    replaySyncQueue().catch(err => console.warn('[SyncQueue] Auto replay warn:', err));
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('focus', handleOnline);
  
  // Initial load and replay
  loadPendingQueue().then((q) => {
    if (navigator.onLine && q.length > 0) {
      replaySyncQueue().catch(() => {});
    }
  });

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('focus', handleOnline);
  };
}
