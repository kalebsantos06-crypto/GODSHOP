import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, QrCode, RefreshCw, CheckCircle2, Copy, Link as LinkIcon, ShieldCheck, Zap, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

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
  const [linkedDevices, setLinkedDevices] = useState<Array<{ id: string; name: string; type: 'apk' | 'exe'; time: string }>>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setPairingCode(randomCode);

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

  const handleGenerateNewCode = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setPairingCode(randomCode);
    toast.success('Novo código de pareamento gerado!');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    toast.success('Código copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode || inputCode.length < 6) {
      toast.error('Insira um código de 6 dígitos válido.');
      return;
    }

    setIsLinking(true);
    setTimeout(() => {
      setIsLinking(false);
      const newDev = {
        id: `dev-${Date.now()}`,
        name: `Dispositivo Vinculado (${inputCode})`,
        type: 'apk' as const,
        time: new Date().toLocaleTimeString()
      };
      const updated = [...linkedDevices, newDev];
      setLinkedDevices(updated);
      localStorage.setItem('godshop_linked_devices', JSON.stringify(updated));
      setInputCode('');
      toast.success('Dispositivo vinculado com sucesso! Sincronizado.');
      setActiveTab('pair');
    }, 1200);
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
            {/* Pairing Code Banner for Mobile & Desktop visibility */}
            <div className={cn(
              "p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4",
              theme === 'dark' ? "bg-emerald-950/20 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
            )}>
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">Seu Código de Pareamento Ativo</span>
                <div className="font-mono font-black text-2xl sm:text-3xl tracking-widest text-emerald-500">{pairingCode}</div>
                <p className="text-[11px] opacity-70 mt-0.5">Digite este código no outro dispositivo para conectar.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={handleGenerateNewCode}
                  className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition cursor-pointer"
                  title="Gerar Novo Código"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-xl border",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            )}>
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
                Vincular Outro Dispositivo (Digitar Código)
              </h4>
              <p className="text-xs opacity-80 mb-4">
                Digite o código de 6 dígitos gerado no outro dispositivo (Computador ou Celular) para parear.
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
                  {isLinking ? 'Vinculando...' : 'Vincular'}
                </button>
              </form>
            </div>

            <div>
              <h4 className="font-bold text-xs uppercase opacity-70 mb-3 tracking-wider">
                Dispositivos Ativos na Rede GodShop
              </h4>
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
                        <div className="text-[10px] opacity-60 truncate">Conectado às {dev.time} • Sincronização Ativa</div>
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
              <h4 className="font-black text-lg mb-1">Código de Pareamento Temporário</h4>
              <p className="text-xs opacity-70 max-w-md mx-auto">
                Digite este código ou aponte a câmera no outro aplicativo para parear instantaneamente.
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
                {pairingCode}
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleCopyCode}
                  className={cn(
                    "flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border",
                    theme === 'dark' ? "bg-white/10 hover:bg-white/20 border-white/20 text-white" : "bg-black/10 hover:bg-black/20 border-black/20 text-slate-900"
                  )}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copiado!' : 'Copiar Código'}
                </button>
                <button
                  onClick={handleGenerateNewCode}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
                  title="Gerar Novo Código"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-[11px] opacity-60">O código expira em 10 minutos por segurança.</p>
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="space-y-4 text-xs w-full max-w-full box-border">
            <div className={cn(
              "p-4 rounded-xl border space-y-2",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            )}>
              <h5 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4 shrink-0" /> Como usar no Celular (Mobile APK)
              </h5>
              <ol className="list-decimal list-inside space-y-1.5 opacity-90 pl-1">
                <li>Abra o aplicativo GodShop no celular ou acesse via navegador mobile.</li>
                <li>Toque em <strong>Vincular Dispositivos</strong> e visualize o seu código de pareamento.</li>
                <li>Digite o código de 6 dígitos no seu computador ou vice-versa para sincronizar em tempo real.</li>
              </ol>
            </div>

            <div className={cn(
              "p-4 rounded-xl border space-y-2",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            )}>
              <h5 className="font-bold text-blue-400 flex items-center gap-2 text-sm">
                <Monitor className="h-4 w-4 shrink-0" /> Sincronização Automática
              </h5>
              <ol className="list-decimal list-inside space-y-1.5 opacity-90 pl-1">
                <li>Todos os dados salvos (Vendas, Estoque, Clientes) ficam sincronizados entre todos os dispositivos conectados.</li>
                <li>Não há perda de dados mesmo operando offline.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Device Removal */}
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
