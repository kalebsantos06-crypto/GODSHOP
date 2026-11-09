import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Cloud, CloudOff, Database, ShieldCheck, Activity, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getPendingQueueLength, replaySyncQueue } from '../services/syncQueue';
import { getRealtimeStatus } from '../services/realtime';
import { db } from '../services/db';

interface SyncDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncDiagnosticModal: React.FC<SyncDiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSupaReachable, setIsSupaReachable] = useState<boolean | null>(null);
  const [realtimeActive, setRealtimeActive] = useState<boolean>(getRealtimeStatus());
  const [pendingCount, setPendingCount] = useState<number>(getPendingQueueLength());
  const [lastSyncTs, setLastSyncTs] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const refreshMetrics = async () => {
    setIsOnline(navigator.onLine);
    setRealtimeActive(getRealtimeStatus());
    setPendingCount(getPendingQueueLength());

    const ts = localStorage.getItem('last_cloud_sync_ts');
    setLastSyncTs(ts ? new Date(Number(ts)).toLocaleString('pt-BR') : 'Nenhuma recente');

    try {
      const rawConflicts = localStorage.getItem('godshop_sync_conflicts');
      setConflicts(rawConflicts ? JSON.parse(rawConflicts) : []);
    } catch (e) {
      setConflicts([]);
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('sales').select('id').limit(1);
        setIsSupaReachable(!error);
      } catch (e) {
        setIsSupaReachable(false);
      }
    } else {
      setIsSupaReachable(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    refreshMetrics();
    const interval = setInterval(refreshMetrics, 3000);

    const handleOnline = () => refreshMetrics();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);
    window.addEventListener('godshop_sync_queue_updated', handleOnline);
    window.addEventListener('supabase_realtime_status', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOnline);
      window.removeEventListener('godshop_sync_queue_updated', handleOnline);
      window.removeEventListener('supabase_realtime_status', handleOnline);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSyncNow = async () => {
    setIsTesting(true);
    try {
      await replaySyncQueue();
      await db.pullFromCloud();
      await db.pushToCloud();
      await refreshMetrics();
    } catch (e) {
      console.warn('[Diagnostic] Sync error:', e);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Diagnóstico de Sincronização Universal</h3>
              <p className="text-xs text-slate-400">Status em tempo real da conexão entre Web, APK Android e EXE Windows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Metrics */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-3">

            {/* Internet Status */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Rede / Internet</span>
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-emerald-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-rose-400" />
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="font-bold text-sm">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>

            {/* Supabase API Status */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Banco Supabase Central</span>
                {isSupaReachable ? (
                  <Cloud className="h-4 w-4 text-emerald-400" />
                ) : (
                  <CloudOff className="h-4 w-4 text-amber-400" />
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${isSupaReachable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-bold text-sm">
                  {isSupaReachable === null ? 'Verificando...' : isSupaReachable ? 'Conectado' : 'Indisponível / Mod local'}
                </span>
              </div>
            </div>

            {/* Realtime WebSocket */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Realtime WebSocket</span>
                <Database className="h-4 w-4 text-blue-400" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${realtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="font-bold text-sm">{realtimeActive ? 'Inscrito (Ativo)' : 'Reconectando...'}</span>
              </div>
            </div>

            {/* Fila Offline Pending */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Fila Offline Pendente</span>
                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`font-bold text-lg ${pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {pendingCount} {pendingCount === 1 ? 'operação' : 'operações'}
                </span>
              </div>
            </div>

          </div>

          {/* Sync Timestamp & Security */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Última Sincronização Confirmada:</span>
              <span className="font-mono text-slate-200 font-semibold">{lastSyncTs || 'Nunca'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Armazenamento Local Primário:</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> IndexedDB + LocalStorage (Dual)
              </span>
            </div>
          </div>

          {/* Recent Conflict Logs */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Conflitos e Fusões Recentes Resolvidas</h4>
            {conflicts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                Nenhum conflito ou divergência detectada. Mutações sincronizadas atomicamente.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {conflicts.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs">
                    <div className="flex items-center justify-between text-amber-400 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> {log.type} ({log.table})
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                    </div>
                    <p className="mt-1 text-slate-300">{log.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-6 py-4">
          <button
            onClick={handleManualSyncNow}
            disabled={isTesting}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Sincronizando...' : 'Testar Conexão e Sincronizar Agora'}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 text-xs font-semibold transition-all"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
