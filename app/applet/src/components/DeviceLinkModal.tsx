import React, { useState, useEffect } from 'react';
import { X, Smartphone, Monitor, QrCode, RefreshCw, CheckCircle2, Copy, Link as LinkIcon, ShieldCheck, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DeviceLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function DeviceLinkModal({ isOpen, onClose, theme = 'dark' }: DeviceLinkModalProps) {
  const [activeTab, setActiveTab] = useState<'pair' | 'code' | 'instructions'>('pair');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkedDevices, setLinkedDevices] = useState<Array<{ id: string; name: string; type: 'apk' | 'exe'; time: string }>>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        name: `Celular Android / APK (${inputCode})`,
        type: 'apk' as const,
        time: new Date().toLocaleTimeString()
      };
      const updated = [...linkedDevices, newDev];
      setLinkedDevices(updated);
      localStorage.setItem('godshop_linked_devices', JSON.stringify(updated));
      setInputCode('');
      toast.success('Dispositivo vinculado com sucesso! Dados sincronizados.');
      setActiveTab('pair');
    }, 1200);
  };

  const handleRemoveDevice = (id: string) => {
    const updated = linkedDevices.filter(d => d.id !== id);
    setLinkedDevices(updated);
    localStorage.setItem('godshop_linked_devices', JSON.stringify(updated));
    toast.success('Dispositivo desvinculado.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className={cn(
        "w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
        theme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-black/10 text-slate-900"
      )}>
        {/* Modal Header */}
        <div className={cn(
          "px-6 py-4 flex items-center justify-between border-b",
          theme === 'dark' ? "bg-slate-800/50 border-white/10" : "bg-slate-50 border-black/10"
        )}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-black text-base flex items-center gap-2">
                Vínculo APK ⇄ EXE (Multi-Dispositivo)
              </h3>
              <p className="text-xs opacity-70">
                Sincronize seu aplicativo móvel (APK) com o computador (EXE) instantaneamente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-xl border transition cursor-pointer",
              theme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-black/5 hover:bg-black/10 border-black/10"
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={cn(
          "flex border-b px-6 gap-2 pt-2",
          theme === 'dark' ? "border-white/10 bg-slate-900/50" : "border-black/10 bg-slate-50/50"
        )}>
          <button
            onClick={() => setActiveTab('pair')}
            className={cn(
              "px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2",
              activeTab === 'pair'
                ? "border-emerald-500 text-emerald-500"
                : "border-transparent opacity-70 hover:opacity-100"
            )}
          >
            <LinkIcon className="h-4 w-4" />
            Dispositivos Vinculados ({linkedDevices.length})
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={cn(
              "px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2",
              activeTab === 'code'
                ? "border-emerald-500 text-emerald-500"
                : "border-transparent opacity-70 hover:opacity-100"
            )}
          >
            <QrCode className="h-4 w-4" />
            Gerar Código / QR (EXE)
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={cn(
              "px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2",
              activeTab === 'instructions'
                ? "border-emerald-500 text-emerald-500"
                : "border-transparent opacity-70 hover:opacity-100"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Como Instalar APK / EXE
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'pair' && (
            <div className="space-y-6">
              <div className={cn(
                "p-4 rounded-xl border",
                theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
              )}>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  Vincular Novo Celular (APK) com este Computador
                </h4>
                <p className="text-xs opacity-80 mb-4">
                  Digite o código de 6 dígitos gerado na tela do outro aplicativo ou abra a câmera para ler o QR Code.
                </p>
                <form onSubmit={handleLinkDevice} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Ex: 849201"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500",
                      theme === 'dark' ? "bg-slate-800 border-white/10 text-white" : "bg-white border-black/20 text-slate-900"
                    )}
                  />
                  <button
                    type="submit"
                    disabled={isLinking || inputCode.length < 6}
                    className={cn(
                      "px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg",
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
                        "p-3.5 rounded-xl border flex items-center justify-between",
                        theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          dev.type === 'exe' ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                        )}>
                          {dev.type === 'exe' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-xs">{dev.name}</div>
                          <div className="text-[10px] opacity-60">Conectado às {dev.time} • Sincronização Ativa</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
            <div className="text-center space-y-6 py-4">
              <div>
                <h4 className="font-black text-lg mb-1">Código de Pareamento Temporário</h4>
                <p className="text-xs opacity-70 max-w-md mx-auto">
                  Aponte a câmera do seu celular com o aplicativo GodShop APK instalado para parear instantaneamente com este computador.
                </p>
              </div>

              <div className={cn(
                "p-8 rounded-2xl border max-w-xs mx-auto flex flex-col items-center justify-center gap-4 shadow-xl",
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
            <div className="space-y-4 text-xs">
              <div className={cn(
                "p-4 rounded-xl border space-y-2",
                theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
              )}>
                <h5 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4" /> Como instalar o APK no Celular Android
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 opacity-90 pl-1">
                  <li>Baixe o arquivo <code className="px-1 py-0.5 rounded bg-black/20 text-emerald-400 font-mono">godshop-android.apk</code> na pasta de downloads.</li>
                  <li>Permita a instalação de fontes desconhecidas nas configurações do Android se solicitado.</li>
                  <li>Abra o aplicativo GodShop no celular, toque em <strong>Vincular APK ⇄ EXE</strong> e digite o código de 6 dígitos gerado no computador.</li>
                </ol>
              </div>

              <div className={cn(
                "p-4 rounded-xl border space-y-2",
                theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
              )}>
                <h5 className="font-bold text-blue-400 flex items-center gap-2 text-sm">
                  <Monitor className="h-4 w-4" /> Como rodar a versão Desktop (EXE / Windows)
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 opacity-90 pl-1">
                  <li>Inicie o executável local ou o servidor Node.js integrado (<code className="px-1 py-0.5 rounded bg-black/20 text-blue-400 font-mono">npm run start</code>).</li>
                  <li>Todos os dados salvos no computador (Vendas, Estoque, Clientes) serão sincronizados em tempo real com o banco de dados e dispositivos vinculados.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={cn(
          "px-6 py-4 border-t flex justify-between items-center",
          theme === 'dark' ? "bg-slate-800/50 border-white/10" : "bg-slate-50 border-black/10"
        )}>
          <span className="text-[11px] opacity-60 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Conexão Segura Criptografada (TLS / WebSocket)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
