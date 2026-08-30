import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { QueryClient } from '@tanstack/react-query';

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isConnected = false;
let reconnectTimeout: any = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 3000;

// BroadcastChannel for instant local cross-tab sync
const BC_NAME = 'godshop_realtime_broadcast';
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel(BC_NAME);
  } catch (e) {
    // BroadcastChannel not supported or blocked by sandboxing
  }
}

/**
 * Triggers a local broadcast event across all open tabs in the browser.
 */
export function broadcastLocalChange(table?: string) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'LOCAL_DATA_CHANGED',
        table,
        timestamp: Date.now()
      });
    } catch (e) {
      // Ignored
    }
  }
}

/**
 * Update local storage cache from incoming Supabase real-time record
 */
function updateLocalFallbackCache(table: string, eventType: string, newRecord: any, oldRecord: any) {
  try {
    const key = `db_fallback_${table}`;
    const raw = localStorage.getItem(key);
    let items: any[] = raw ? JSON.parse(raw) : [];

    if (eventType === 'INSERT') {
      if (newRecord && newRecord.id) {
        const index = items.findIndex((i: any) => i.id === newRecord.id);
        if (index >= 0) {
          items[index] = { ...items[index], ...newRecord };
        } else {
          items.unshift(newRecord);
        }
      }
    } else if (eventType === 'UPDATE') {
      if (newRecord && newRecord.id) {
        const index = items.findIndex((i: any) => i.id === newRecord.id);
        if (index >= 0) {
          items[index] = { ...items[index], ...newRecord };
        } else {
          items.unshift(newRecord);
        }
      }
    } else if (eventType === 'DELETE') {
      const targetId = oldRecord?.id || newRecord?.id;
      if (targetId) {
        items = items.filter((i: any) => i.id !== targetId);
      }
    }

    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.warn(`[Realtime Cache] Table ${table}:`, err);
  }
}

/**
 * Initializes Supabase Real-time postgres_changes subscription with automatic resilient reconnection.
 */
export function initRealtimeSync(queryClient: QueryClient) {
  if (typeof window === 'undefined') return () => {};

  // Listen to BroadcastChannel for multi-tab sync
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'LOCAL_DATA_CHANGED') {
        if (event.data.table) {
          queryClient.invalidateQueries({ queryKey: [event.data.table] });
        }
        queryClient.invalidateQueries();
      }
    };
  }

  // If Supabase is not configured, multi-tab sync via BroadcastChannel is active
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const connectChannel = () => {
    if (!isSupabaseConfigured()) return;

    if (realtimeChannel) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch (e) {}
      realtimeChannel = null;
    }

    realtimeChannel = supabase
      .channel('godshop_realtime_sync_all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const table = payload.table;
          const eventType = payload.eventType;
          const newRecord = payload.new;
          const oldRecord = payload.old;

          // Update local fallback cache immediately
          updateLocalFallbackCache(table, eventType, newRecord, oldRecord);

          // Targeted cache invalidation based on table
          switch (table) {
            case 'sales':
            case 'public_sales':
              queryClient.invalidateQueries({ queryKey: ['sales'] });
              queryClient.invalidateQueries({ queryKey: ['public_sales'] });
              break;

            case 'clients':
            case 'public_clients':
              queryClient.invalidateQueries({ queryKey: ['clients'] });
              queryClient.invalidateQueries({ queryKey: ['pendingRemote'] });
              break;

            case 'iphones':
              queryClient.invalidateQueries({ queryKey: ['iphones'] });
              break;

            case 'consoles':
              queryClient.invalidateQueries({ queryKey: ['consoles'] });
              break;

            case 'suppliers':
              queryClient.invalidateQueries({ queryKey: ['suppliers'] });
              break;

            case 'prices':
              queryClient.invalidateQueries({ queryKey: ['prices'] });
              break;

            case 'users':
            case 'public_users':
              queryClient.invalidateQueries({ queryKey: ['systemUsers'] });
              break;

            default:
              queryClient.invalidateQueries();
              break;
          }

          // Invalidate all queries to ensure full UI consistency
          queryClient.invalidateQueries();

          // Broadcast to other local browser tabs
          broadcastLocalChange(table);

          // Notify app components
          window.dispatchEvent(
            new CustomEvent('supabase_realtime_change', {
              detail: { table, eventType, newRecord, oldRecord }
            })
          );
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          isConnected = true;
          reconnectAttempts = 0;
          window.dispatchEvent(
            new CustomEvent('supabase_realtime_status', { detail: { connected: true } })
          );
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isConnected = false;
          window.dispatchEvent(
            new CustomEvent('supabase_realtime_status', { detail: { connected: false, error: err } })
          );

          // Automatic resilient reconnect with backoff
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && isSupabaseConfigured() && navigator.onLine) {
            const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts), 30000);
            reconnectAttempts++;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
              connectChannel();
            }, delay);
          }
        }
      });
  };

  connectChannel();

  // Handle reconnect when browser comes back online or regains focus
  const handleReconnect = () => {
    queryClient.invalidateQueries();
    
    if (!isConnected && isSupabaseConfigured()) {
      reconnectAttempts = 0;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      connectChannel();
    }
  };

  window.addEventListener('online', handleReconnect);
  window.addEventListener('focus', handleReconnect);

  return () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (realtimeChannel) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch (e) {}
      realtimeChannel = null;
    }
    window.removeEventListener('online', handleReconnect);
    window.removeEventListener('focus', handleReconnect);
  };
}

/**
 * Get current real-time connection status
 */
export function getRealtimeStatus(): boolean {
  return isConnected;
}

