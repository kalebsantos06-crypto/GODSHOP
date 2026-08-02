import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Copy, Check, Sparkles, User, Package, Truck, Heart, Edit3, CreditCard, ShieldCheck, RefreshCw, Shield, CheckCircle2, Gift, ArrowRight } from 'lucide-react';
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
    order_confirmed: <CreditCard className="h-5 w-5 text-cyan-400" />,
    order_preparing: <Package className="h-5 w-5 text-blue-400" />,
    order_ready: <Gift className="h-5 w-5 text-purple-400" />,
    order_on_way: <Truck className="h-5 w-5 text-emerald-400" />,
    order_delivered: <CheckCircle2 className="h-5 w-5 text-teal-400" />,
    guarantee_sent: <Shield className="h-5 w-5 text-indigo-400" />,
    order_thank_you: <Heart className="h-5 w-5 text-rose-400" />
  };

  // Current formatted time for WhatsApp bubble preview
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl mx-auto my-auto bg-[#0C0D11] border border-emerald-500/30 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[88vh] text-foreground">
        
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2 tracking-tight">
                Notificação via WhatsApp
                <span className="hidden sm:inline-flex text-[10px] uppercase font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Jornada do Cliente
                </span>
              </h3>
              <p className="text-xs text-neutral-400 truncate max-w-[220px] sm:max-w-xs">
                {clientName ? `Destinatário: ${clientName}` : 'Selecione a etapa do envio abaixo'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Sair / Fechar Notificação"
          >
            <X className="h-4 w-4 text-neutral-400 group-hover:text-white" />
            <span>Sair</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Recipient Overview Card */}
          <div className="p-3.5 bg-gradient-to-r from-white/[0.04] to-white/[0.02] border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                <User className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Cliente</span>
                <span className="font-bold text-white text-xs sm:text-sm">{clientName || 'Cliente não informado'}</span>
              </div>
            </div>

            {clientPhone && (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-emerald-300 font-mono text-xs font-semibold">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>{clientPhone}</span>
              </div>
            )}

            {itemName && (
              <div className="w-full pt-2 border-t border-white/5 flex items-center justify-between text-xs text-neutral-300">
                <span className="text-neutral-400 flex items-center gap-1">
                  <Package className="h-3.5 w-3.5 text-amber-400" /> Aparelho / Item:
                </span>
                <span className="font-bold text-amber-300">{itemName}</span>
              </div>
            )}
          </div>

          {/* Section 1: Delivery Lifecycle Pipeline (8 Steps with Next Step indicator) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Etapas do Pedido & Envio (Selecione uma Opção)
              </label>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                8 Etapas Sequenciais
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    className={`relative p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected 
                        ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-950/40 to-black border-emerald-500/60 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50 scale-[1.01]' 
                        : 'bg-white/[0.03] border-white/10 text-neutral-300 hover:bg-white/[0.07] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.icon}</span>
                        <span className="text-xs font-bold leading-tight text-white">
                          {info.label}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${info.badgeColor}`}>
                        Etapa {info.step}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-400 leading-tight">
                      {info.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: WhatsApp Message Preview Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                {statusIcons[selectedType]} Prévia da Mensagem no WhatsApp
              </label>

              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    onClick={handleResetText}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
                    title="Restaurar Modelo Padrão"
                  >
                    <RefreshCw className="h-3 w-3" /> Restaurar
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-[11px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>{isEditing ? 'Ver Prévia Visual' : 'Editar Texto'}</span>
                </button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  className="w-full p-3.5 bg-black/80 border border-amber-500/40 rounded-2xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed font-sans"
                  placeholder="Escreva a mensagem personalizada..."
                />
                <p className="text-[10px] text-neutral-400 text-right">
                  {messageText.length} caracteres • Pode usar emojis e formatação WhatsApp (*negrito*, _itálico_)
                </p>
              </div>
            ) : (
              /* High-End Realistic WhatsApp Chat Card */
              <div className="rounded-2xl border border-[#1f2c34] overflow-hidden bg-[#0b141a] shadow-xl">
                
                {/* Simulated WhatsApp Chat Header */}
                <div className="px-3.5 py-2.5 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center font-bold text-xs text-white shadow-sm">
                        GS
                      </div>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 border-2 border-[#202c33] rounded-full" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white">GODSHOP • Loja Oficial</span>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/20" />
                      </div>
                      <span className="text-[10px] text-emerald-400 block font-medium">online agora</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-neutral-400 font-mono bg-black/30 px-2 py-0.5 rounded-md border border-white/5">
                    WhatsApp Web
                  </span>
                </div>

                {/* Simulated WhatsApp Chat Canvas */}
                <div className="p-4 sm:p-5 bg-[#0b141a] bg-[radial-gradient(#111b21_1px,transparent_1px)] [background-size:16px_16px] flex flex-col items-start">
                  
                  {/* Date Pill */}
                  <div className="mx-auto mb-3 px-3 py-0.5 rounded-md bg-[#182229] text-[10px] text-neutral-400 font-medium border border-white/5 shadow-sm">
                    Hoje
                  </div>

                  {/* Message Bubble */}
                  <div className="max-w-[95%] sm:max-w-[90%] bg-[#005c4b] border border-[#007a63]/40 text-emerald-50 rounded-2xl rounded-tl-xs p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans shadow-lg relative group">
                    <p className="pr-10 text-white font-normal">{messageText}</p>
                    
                    {/* Timestamp & Read Receipts */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-emerald-200/70 font-mono float-right">
                      <span>{currentTime}</span>
                      <span className="text-[#53bdeb] font-bold tracking-tighter">✓✓</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-white/10 bg-[#08090C] flex items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Sair desta janela"
          >
            <X className="h-4 w-4 text-neutral-400" />
            <span>Sair</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 sm:px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
            
            <button
              onClick={handleSend}
              className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-950/80 hover:shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Send className="h-4 w-4" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
