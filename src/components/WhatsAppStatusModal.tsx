import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Copy, Check, Sparkles, User, Package, Truck, Heart, Edit3, CreditCard, ShieldCheck, RefreshCw, Shield, CheckCircle2, Gift, ArrowRight, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { 
  WhatsAppStatusType, 
  STATUS_LABELS, 
  getSavedStatusTemplate, 
  formatStatusMessage, 
  openWhatsAppMessage 
} from '../lib/whatsappUtils';

interface WhatsAppStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName?: string;
  clientPhone?: string;
  itemName?: string;
  defaultStatusType?: WhatsAppStatusType;
}

export default function WhatsAppStatusModal({
  isOpen,
  onClose,
  clientName = '',
  clientPhone = '',
  itemName = '',
  defaultStatusType = 'registration'
}: WhatsAppStatusModalProps) {
  const [selectedType, setSelectedType] = useState<WhatsAppStatusType>(defaultStatusType);
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Update selected type when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedType(defaultStatusType);
      setIsEditing(false);
    }
  }, [isOpen, defaultStatusType]);

  // Re-generate formatted text when selectedType, clientName, or itemName changes
  useEffect(() => {
    if (!isOpen) return;
    const rawTemplate = getSavedStatusTemplate(selectedType);
    const formatted = formatStatusMessage(rawTemplate, {
      clientName,
      itemName: itemName || 'produto'
    });
    setMessageText(formatted);
  }, [selectedType, clientName, itemName, isOpen]);

  if (!isOpen) return null;

  const handleResetText = () => {
    const rawTemplate = getSavedStatusTemplate(selectedType);
    const formatted = formatStatusMessage(rawTemplate, {
      clientName,
      itemName: itemName || 'produto'
    });
    setMessageText(formatted);
    toast.info('Texto restaurado para o modelo padrão!');
  };

  const handleSend = () => {
    if (!clientPhone) {
      toast.error('Cliente não possui telefone cadastrado.');
      return;
    }
    const success = openWhatsAppMessage(clientPhone, messageText);
    if (success) {
      toast.success('Conversa no WhatsApp iniciada com sucesso!');
      onClose();
    } else {
      toast.error('Telefone do cliente inválido.');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success('Mensagem copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const statusIcons: Record<WhatsAppStatusType, React.ReactNode> = {
    registration: <Sparkles className="h-5 w-5 text-amber-400" />,
    client_remote_confirmation: <MessageCircle className="h-5 w-5 text-emerald-400" />,
    order_confirmed: <CreditCard className="h-5 w-5 text-cyan-400" />,
    order_preparing: <Package className="h-5 w-5 text-blue-400" />,
    order_ready: <Gift className="h-5 w-5 text-purple-400" />,
    order_on_way: <Truck className="h-5 w-5 text-emerald-400" />,
    order_delivered: <CheckCircle2 className="h-5 w-5 text-teal-400" />,
    guarantee_sent: <Shield className="h-5 w-5 text-indigo-400" />,
    order_thank_you: <Heart className="h-5 w-5 text-rose-400" />,
    order_settled: <FileCheck className="h-5 w-5 text-emerald-400" />
  };

  // Current formatted time for WhatsApp bubble preview
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 pb-20 sm:pb-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl mx-auto my-auto bg-[#0C0D11] border border-emerald-500/30 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] sm:max-h-[85vh] text-foreground">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-amber-950/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/50 shrink-0">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-2 tracking-tight leading-tight">
                Notificação via WhatsApp
                <span className="hidden sm:inline-flex text-[10px] uppercase font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Jornada do Cliente
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400 truncate max-w-[200px] sm:max-w-xs">
                {clientName ? `Destinatário: ${clientName}` : 'Selecione a etapa do envio abaixo'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="Sair / Fechar Notificação"
          >
            <X className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white" />
            <span>Sair</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Recipient Overview Card */}
          <div className="p-3 bg-gradient-to-r from-white/[0.04] to-white/[0.02] border border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block leading-tight">Cliente</span>
                <span className="font-bold text-white text-xs leading-tight">{clientName || 'Cliente não informado'}</span>
              </div>
            </div>

            {clientPhone && (
              <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-emerald-300 font-mono text-[11px] font-semibold">
                <MessageCircle className="h-3 w-3 text-emerald-400" />
                <span>{clientPhone}</span>
              </div>
            )}

            {itemName && (
              <div className="w-full pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-300">
                <span className="text-neutral-400 flex items-center gap-1">
                  <Package className="h-3 w-3 text-amber-400" /> Aparelho / Item:
                </span>
                <span className="font-bold text-amber-300">{itemName}</span>
              </div>
            )}
          </div>

          {/* Section 1: Delivery Lifecycle Pipeline (Scrollable 2-Column Grid) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Etapas do Envio (Selecione uma)
              </label>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                9 Etapas
              </span>
            </div>

            <div className="max-h-[190px] sm:max-h-[220px] overflow-y-auto custom-scrollbar p-1.5 bg-black/40 border border-white/10 rounded-2xl">
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {(Object.keys(STATUS_LABELS) as WhatsAppStatusType[]).map((type) => {
                  const info = STATUS_LABELS[type];
                  const isSelected = selectedType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type);
                        setIsEditing(false);
                      }}
                      className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected 
                          ? 'bg-gradient-to-br from-emerald-500/25 via-emerald-950/50 to-black border-emerald-500 text-white shadow-md shadow-emerald-950/60 ring-1 ring-emerald-500/60 scale-[1.01]' 
                          : 'bg-white/[0.03] border-white/10 text-neutral-300 hover:bg-white/[0.07] hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-sm shrink-0">{info.icon}</span>
                          <span className="text-[11px] font-bold leading-tight text-white truncate">
                            {info.label}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-neutral-400 leading-tight line-clamp-2">
                        {info.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: WhatsApp Message Preview Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] sm:text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                {statusIcons[selectedType]} Prévia no WhatsApp
              </label>

              <div className="flex items-center gap-1.5">
                {isEditing && (
                  <button
                    onClick={handleResetText}
                    className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
                    title="Restaurar Modelo Padrão"
                  >
                    <RefreshCw className="h-3 w-3" /> Restaurar
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold transition-all cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>{isEditing ? 'Ver Prévia' : 'Editar Texto'}</span>
                </button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-1.5">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-black/80 border border-amber-500/40 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed font-sans"
                  placeholder="Escreva a mensagem personalizada..."
                />
                <p className="text-[10px] text-neutral-400 text-right">
                  {messageText.length} caracteres • Pode usar emojis e formatação WhatsApp (*negrito*, _itálico_)
                </p>
              </div>
            ) : (
              /* High-End Realistic WhatsApp Chat Card */
              <div className="rounded-xl border border-[#1f2c34] overflow-hidden bg-[#0b141a] shadow-lg">
                
                {/* Simulated WhatsApp Chat Header */}
                <div className="px-3 py-2 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center font-bold text-[10px] text-white shadow-sm">
                        GS
                      </div>
                      <span className="absolute bottom-0 right-0 h-2 w-2 bg-emerald-500 border-2 border-[#202c33] rounded-full" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white">GODSHOP • Loja Oficial</span>
                        <ShieldCheck className="h-3 w-3 text-emerald-400 fill-emerald-400/20" />
                      </div>
                      <span className="text-[9px] text-emerald-400 block font-medium leading-none">online agora</span>
                    </div>
                  </div>

                  <span className="text-[9px] text-neutral-400 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/5">
                    WhatsApp Web
                  </span>
                </div>

                {/* Simulated WhatsApp Chat Canvas */}
                <div className="p-3 sm:p-4 bg-[#0b141a] bg-[radial-gradient(#111b21_1px,transparent_1px)] [background-size:16px_16px] flex flex-col items-start max-h-[160px] overflow-y-auto custom-scrollbar">
                  
                  {/* Date Pill */}
                  <div className="mx-auto mb-2 px-2.5 py-0.5 rounded bg-[#182229] text-[9px] text-neutral-400 font-medium border border-white/5 shadow-sm">
                    Hoje
                  </div>

                  {/* Message Bubble */}
                  <div className="max-w-[95%] sm:max-w-[90%] bg-[#005c4b] border border-[#007a63]/40 text-emerald-50 rounded-xl rounded-tl-xs p-3 text-xs leading-relaxed whitespace-pre-wrap font-sans shadow-md relative group">
                    <p className="pr-8 text-white font-normal">{messageText}</p>
                    
                    {/* Timestamp & Read Receipts */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-emerald-200/70 font-mono float-right">
                      <span>{currentTime}</span>
                      <span className="text-[#53bdeb] font-bold tracking-tighter">✓✓</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Actions - Fixed at Bottom */}
        <div className="p-3 sm:px-6 border-t border-white/10 bg-[#08090C] shrink-0 flex items-center justify-between gap-2 z-20">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            title="Sair desta janela"
          >
            <X className="h-3.5 w-3.5 text-neutral-400" />
            <span>Sair</span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="px-3 sm:px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
            
            <button
              onClick={handleSend}
              className="px-3.5 sm:px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-lg shadow-emerald-950/80 hover:shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
