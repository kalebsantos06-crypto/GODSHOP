import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, QrCode, RefreshCw, CheckCircle2, Copy, Link as LinkIcon, ShieldCheck, Zap, X, AlertTriangle, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { db, getCloudApiUrl } from '../services/db';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DeviceLinkSectionProps {
  theme?: 'dark' | 'light';
}

export default function DeviceLinkSection({ theme = 'dark' }: DeviceLinkSectionProps) {
  const [activeTab, setActiveTab] = useState<'pair' | 'code' | 'instructions'>('pair');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkedDevices, setLinkedDevices] = useState<Array<{ id: string; name: string; type: 'apk' | 'exe'; time: string }>>([]);
  const [copied, setCopied] = useState(false);

  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const handleClearAllPairings = async () => {
    try {
      // 1. Clear locally
      localStorage.removeItem('godshop_linked_devices');
      setLinkedDevices([]);
      
      // 2. Clear server-side
      const url = getCloudApiUrl('/api/pair/clear');
      console.log('[Pairing] Unpairing all, target URL:', url);
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao desvincular no servidor.');
      }
      
      toast.success('Todos os dispositivos foram desvinculados.');
      setShowClearAllConfirm(false);
    } catch (e: any) {
      console.error('[Pairing] Clear all error:', e);
      toast.error('Erro ao desvincular: ' + (e.message || 'Falha desconhecida'));
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('godshop_linked_devices');
      if (stored) {
        setLinkedDevices(JSON.parse(stored));
      } else {
        const initial = [
          { id: 'dev-1', name: 'Computador Principal (EXE Server)', type: 'exe' as const, time: new Date().toLocaleTimeString() }
        ];
        setLinkedDevices(initial);
        localStorage.setItem('godshop_linked_devices', JSON.stringify(initial));
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const handleGenerateNewCode = async () => {
    setIsGenerating(true);
    try {
      const supaUrl = localStorage.getItem('custom_supabase_url') || import.meta.env.VITE_SUPABASE_URL || 'https://wkkjaakydjnfzayyedxy.supabase.co';
      const supaKey = localStorage.getItem('custom_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indra2phYWt5ZGpuZnpheXllZHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDUwMTQsImV4cCI6MjA5ODIyMTAxNH0.DcTQJaLlJnejtXCHOwc_Maod9ytCGtcLri6kGnXV_mM';
      
      const serverUrl = typeof window !== 'undefined' && window.location.origin.startsWith('http') && !window.location.origin.includes('localhost')
        ? window.location.origin
        : (localStorage.getItem('custom_cloud_server_url') || 'https://ais-dev-vaaqegsewou44zzapwefq3-387330212853.us-west2.run.app');

      let code = Math.floor(100000 + Math.random() * 900000).toString();

      const pairingPayload = {
        code,
        supabaseUrl: supaUrl,
        supabaseKey: supaKey,
        serverUrl: serverUrl,
        deviceName: navigator.userAgent.includes('Android') ? 'Celular APK' : 'Computador EXE',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };

      // 1. Save to local storage for local fallback
      try {
        localStorage.setItem(`godshop_pairing_${code}`, JSON.stringify(pairingPayload));
      } catch (e) {}

      // 2. Try local Express API if available
      try {
        const res = await fetch(getCloudApiUrl('/api/pair/generate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supabaseUrl: supaUrl,
            supabaseKey: supaKey,
            serverUrl: serverUrl,
            deviceName: pairingPayload.deviceName
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.code) {
            code = data.code;
            pairingPayload.code = code;
          }
        }
      } catch (err) {
        console.warn('Server pair/generate warning:', err);
      }

      // 3. Register in Supabase public_tokens table
      try {
        await supabase.from('public_tokens').upsert({
          token: `pair_${code}`,
          user_id: 'df9c4051-e407-4fe4-8978-a6b9e6140ed9',
          used: false,
          client_data: pairingPayload,
          expires_at: pairingPayload.expiresAt
        });
      } catch (supaTokenErr) {
        console.warn('Supabase public_tokens pair warning:', supaTokenErr);
      }

      setPairingCode(code);
      toast.success('Novo código de pareamento ativo na nuvem!');
      setActiveTab('code');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao gerar código.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    toast.success('Código copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode || inputCode.length < 6) {
      toast.error('Insira um código de 6 dígitos válido.');
      return;
    }

    setIsLinking(true);
    try {
      let data: any = null;

      // 1. Try server endpoint first
      try {
        const res = await fetch(getCloudApiUrl(`/api/pair/consume?code=${inputCode}`));
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn('Server consume fetch warning:', err);
      }

      // 2. Try Supabase public_tokens table
      if (!data || !data.supabaseUrl) {
        try {
          const { data: tokenRow, error: tokenErr } = await supabase
            .from('public_tokens')
            .select('*')
            .eq('token', `pair_${inputCode}`)
            .maybeSingle();

          if (!tokenErr && tokenRow && tokenRow.client_data) {
            const payload = typeof tokenRow.client_data === 'string' ? JSON.parse(tokenRow.client_data) : tokenRow.client_data;
            if (payload && new Date(payload.expiresAt) > new Date()) {
              data = payload;
            } else if (payload) {
              throw new Error('Este código expirou. Gere um novo no computador.');
            }
          }
        } catch (tokErr: any) {
          if (tokErr?.message?.includes('expirou')) throw tokErr;
          console.warn('Supabase public_tokens consume warning:', tokErr);
        }
      }

      // 4. Try localStorage fallback
      if (!data || !data.supabaseUrl) {
        try {
          const storedLocal = localStorage.getItem(`godshop_pairing_${inputCode}`);
          if (storedLocal) {
            const payload = JSON.parse(storedLocal);
            if (payload && new Date(payload.expiresAt) > new Date()) {
              data = payload;
            } else {
              throw new Error('Este código expirou. Gere um novo no computador.');
            }
          }
        } catch (localErr: any) {
          if (localErr?.message?.includes('expirou')) throw localErr;
        }
      }

      if (!data || !data.supabaseUrl) {
        throw new Error('Código de pareamento inválido ou expirado. Verifique os números digitados.');
      }
      
      // APPLY CREDENTIALS & SERVER URL CONFIGURATIONS
      localStorage.setItem('custom_supabase_url', data.supabaseUrl);
      localStorage.setItem('custom_supabase_key', data.supabaseKey);
      if (data.serverUrl) {
        localStorage.setItem('custom_cloud_server_url', data.serverUrl);
        localStorage.setItem('custom_app_domain', data.serverUrl);
      }
      
      const newDev = {
        id: `dev-${Date.now()}`,
        name: data.deviceName || `Dispositivo Vinculado`,
        type: (navigator.userAgent.includes('Android') ? 'apk' : 'exe') as 'apk' | 'exe',
        time: new Date().toLocaleTimeString()
      };
      
      const updated = [...linkedDevices.filter(d => d.id !== newDev.id), newDev];
      setLinkedDevices(updated);
      localStorage.setItem('godshop_linked_devices', JSON.stringify(updated));
      
      toast.loading('Vinculado! Puxando banco de dados do computador principal...', { id: 'link_sync' });

      // Pull latest database from cloud immediately so this device gets everything right now!
      try {
        await db.pullFromCloud();
      } catch (pullErr) {
        console.warn('Pre-reload pull warning:', pullErr);
      }

      toast.success('Dispositivos sincronizados com sucesso! Reiniciando...', { id: 'link_sync' });
      
      // Trigger reload to apply new Supabase credentials and start sync
      setTimeout(() => {
        window.location.reload();
      }, 1200);

    } catch (err: any) {
      toast.error(err.message || 'Erro ao vincular dispositivo.');
    } finally {
      setIsLinking(false);
    }
  };

  const [deviceToRemove, setDeviceToRemove] = useState<{ id: string; name: string } | null>(null);

  const handleRemoveDevice = (id: string) => {
    const dev = linkedDevices.find(d => d.id === id);
    if (dev) {
      setDeviceToRemove({ id: dev.id, name: dev.name });
    }
  };

  const confirmRemoveDevice = () => {
    if (!deviceToRemove) return;
    const updated = linkedDevices.filter(d => d.id !== deviceToRemove.id);
    setLinkedDevices(updated);
    localStorage.setItem('godshop_linked_devices', JSON.stringify(updated));
    toast.success('Dispositivo desvinculado com sucesso.');
    setDeviceToRemove(null);
  };

  return (
    <div className={cn(
      "rounded-2xl border shadow-lg overflow-hidden flex flex-col w-full max-w-full box-border",
      theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-black/10 text-slate-900"
    )}>
      {/* Tabs */}
      <div className={cn(
        "flex flex-wrap border-b px-3 sm:px-6 gap-1 sm:gap-2 pt-2 overflow-x-auto",
        theme === 'dark' ? "border-white/10 bg-slate-900/50" : "border-black/10 bg-slate-50/50"
      )}>
        <button
          onClick={() => setActiveTab('pair')}
          className={cn(
            "px-3 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
            activeTab === 'pair'
              ? "border-emerald-500 text-emerald-500"
              : "border-transparent opacity-70 hover:opacity-100"
          )}
        >
          <LinkIcon className="h-4 w-4 shrink-0" />
          Dispositivos ({linkedDevices.length})
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={cn(
            "px-3 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
            activeTab === 'code'
              ? "border-emerald-500 text-emerald-500"
              : "border-transparent opacity-70 hover:opacity-100"
          )}
        >
          <QrCode className="h-4 w-4 shrink-0" />
          Gerar / Ver Código
        </button>
        <button
          onClick={() => setActiveTab('instructions')}
          className={cn(
            "px-3 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
            activeTab === 'instructions'
              ? "border-emerald-500 text-emerald-500"
              : "border-transparent opacity-70 hover:opacity-100"
          )}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Instruções
        </button>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full box-border">
        {activeTab === 'pair' && (
          <div className="space-y-6 w-full max-w-full box-border">
            
            <div className={cn(
              "p-4 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-start gap-3",
              theme === 'light' && "bg-amber-50 border-amber-200"
            )}>
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-600 uppercase">Atenção Sincronização</p>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Para que o APK e o EXE compartilhem os mesmos dados, eles <strong>devem estar pareados</strong>. 
                  Ao parear, o celular passará a usar o mesmo banco de dados do computador automaticamente.
                </p>
              </div>
            </div>

            {pairingCode && (
              <div className={cn(
                "p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4",
                theme === 'dark' ? "bg-emerald-950/20 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
              )}>
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">Seu Código de Pareamento Ativo</span>
                  <div className="font-mono font-black text-2xl sm:text-3xl tracking-widest text-emerald-500">{pairingCode}</div>
                  <p className="text-[11px] opacity-70 mt-0.5">Válido por 15 minutos.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <div className={cn(
              "p-4 rounded-xl border",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            )}>
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
                Vincular Dispositivo (Digitar Código)
              </h4>
              <p className="text-xs opacity-80 mb-4">
                Digite o código gerado no <strong>Dispositivo Principal</strong> (geralmente o Computador) para sincronizar.
              </p>
              <form onSubmit={handleLinkDevice} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Ex: 849201"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                  className={cn(
                    "w-full sm:flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500",
                    theme === 'dark' ? "bg-slate-800 border-white/10 text-white" : "bg-white border-black/20 text-slate-900"
                  )}
                />
                <button
                  type="submit"
                  disabled={isLinking || inputCode.length < 6}
                  className={cn(
                    "w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg",
                    inputCode.length === 6 && !isLinking
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-emerald-600/50 text-white/50 cursor-not-allowed"
                  )}
                >
                  {isLinking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isLinking ? 'Sincronizando...' : 'Vincular Agora'}
                </button>
              </form>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-xs uppercase opacity-70 tracking-wider">
                  Dispositivos Ativos
                </h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowClearAllConfirm(true)}
                    className="text-[10px] font-bold text-red-500 hover:underline uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" /> Desvincular Todos
                  </button>
                  <button 
                    onClick={handleGenerateNewCode}
                    disabled={isGenerating}
                    className="text-[10px] font-bold text-emerald-500 hover:underline uppercase flex items-center gap-1"
                  >
                    {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Novo Código
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {linkedDevices.map((dev) => (
                  <div 
                    key={dev.id}
                    className={cn(
                      "p-3.5 rounded-xl border flex items-center justify-between gap-3",
                      theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        dev.type === 'exe' ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                      )}>
                        {dev.type === 'exe' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{dev.name}</div>
                        <div className="text-[10px] opacity-60 truncate">Sincronizado às {dev.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                        Online
                      </span>
                      {linkedDevices.length > 1 && (
                        <button
                          onClick={() => handleRemoveDevice(dev.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                          title="Desvincular"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="text-center space-y-6 py-4 w-full max-w-full box-border">
            <div>
              <h4 className="font-black text-lg mb-1">Código de Pareamento</h4>
              <p className="text-xs opacity-70 max-w-md mx-auto">
                No outro dispositivo, acesse Configurações {'>'} Pareamento e digite este código.
              </p>
            </div>

            <div className={cn(
              "p-6 sm:p-8 rounded-2xl border max-w-xs mx-auto flex flex-col items-center justify-center gap-4 shadow-xl",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            )}>
              <div className="p-4 bg-white rounded-xl text-slate-900 shadow">
                <QrCode className="h-28 w-28 text-slate-900" />
              </div>
              <div className="font-mono font-black text-3xl tracking-widest text-emerald-500">
                {pairingCode || '------'}
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleCopyCode}
                  disabled={!pairingCode}
                  className={cn(
                    "flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border",
                    theme === 'dark' ? "bg-white/10 hover:bg-white/20 border-white/20 text-white" : "bg-black/10 hover:bg-black/20 border-black/20 text-slate-900",
                    !pairingCode && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copiado!' : 'Copiar Código'}
                </button>
                <button
                  onClick={handleGenerateNewCode}
                  disabled={isGenerating}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
                  title="Gerar Novo Código"
                >
                  {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] opacity-60">O código expira em 15 minutos.</p>
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="space-y-4 text-xs w-full max-w-full box-border">
            <div className={cn(
              "p-4 rounded-xl border space-y-2",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            )}>
              <h5 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 shrink-0" /> Sincronização Garantida
              </h5>
              <p className="opacity-90 leading-relaxed">
                Ao utilizar o código de pareamento, o segundo dispositivo recebe as mesmas chaves de acesso ao Supabase do dispositivo principal. 
                Isso garante que <strong>ambos salvem e leiam do mesmo lugar</strong>.
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-xl border space-y-2",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            )}>
              <h5 className="font-bold text-blue-400 flex items-center gap-2 text-sm">
                <Monitor className="h-4 w-4 shrink-0" /> Passo a Passo
              </h5>
              <ol className="list-decimal list-inside space-y-1.5 opacity-90 pl-1">
                <li>No computador (EXE), clique em <strong>Gerar Código</strong>.</li>
                <li>No celular (APK), vá em Configurações e digite esse código em <strong>Vincular Dispositivo</strong>.</li>
                <li>O celular irá reiniciar e passar a usar o mesmo estoque e vendas do computador.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for All Devices Removal */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className={cn(
            "w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4",
            theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-black/10 text-slate-900"
          )}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-base">Desvincular TODOS</h3>
                <p className="text-xs opacity-70">Tem certeza? Isso removerá a conexão de todos os dispositivos simultaneamente.</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(false)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-bold text-xs transition border cursor-pointer",
                  theme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-black/5 hover:bg-black/10 border-black/10 text-slate-900"
                )}
              >
                Manter Conexões
              </button>
              <button
                type="button"
                onClick={handleClearAllPairings}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white transition shadow-lg cursor-pointer"
              >
                Sim, Desvincular Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single Device Removal */}
      {deviceToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={cn(
            "w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4",
            theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-black/10 text-slate-900"
          )}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                <X className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-base">Desvincular Dispositivo</h3>
                <p className="text-xs opacity-70">Esta ação encerrará a sincronização com este dispositivo.</p>
              </div>
            </div>

            <div className={cn(
              "p-3 rounded-xl border text-xs font-medium",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            )}>
              Dispositivo: <span className="font-bold">{deviceToRemove.name}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeviceToRemove(null)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-bold text-xs transition border cursor-pointer",
                  theme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-black/5 hover:bg-black/10 border-black/10 text-slate-900"
                )}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRemoveDevice}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white transition shadow-lg cursor-pointer"
              >
                Sim, Desvincular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
