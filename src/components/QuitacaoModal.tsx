import React, { useRef } from 'react';
import { FileCheck, X, Printer, Send, Copy, CheckCircle2, ShieldCheck, Download, Calendar, CreditCard, User, Smartphone, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatBRL } from '../lib/formatCurrency';
import { parseLocalDate } from '../lib/dateUtils';
import { format } from 'date-fns';
import { openWhatsAppMessage } from '../lib/whatsappUtils';
import { captureElementToCanvas } from '../lib/html2canvasUtils';
import jsPDF from 'jspdf';

interface QuitacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  client: any;
  iphone?: any;
  consoleObj?: any;
}

export default function QuitacaoModal({
  isOpen,
  onClose,
  sale,
  client,
  iphone,
  consoleObj
}: QuitacaoModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const clientName = client?.name || 'Cliente';
  const clientCpf = client?.cpf || 'Não informado';
  const clientPhone = client?.phone || '';

  const itemName = iphone
    ? `${iphone.model} ${iphone.storage || ''} (${iphone.color || ''})`
    : consoleObj
    ? `[${consoleObj.category === 'tv' ? 'TV' : 'Eletrônico'}] ${consoleObj.model} - ${consoleObj.version || ''}`
    : 'Aparelho / Produto';

  const totalValue = sale.sell_price || 0;
  const downPayment = sale.down_payment || 0;
  const installmentsCount = sale.installments || 1;
  const saleDateFormatted = sale.sale_date ? format(parseLocalDate(sale.sale_date), 'dd/MM/yyyy') : 'N/A';
  const currentDateFormatted = format(new Date(), 'dd/MM/yyyy');

  // Generate formatted WhatsApp message text
  const whatsappMessage = `📄 *DECLARAÇÃO DE QUITAÇÃO DE DÉBITO — GODSHOP*

Olá, *${clientName}*!

Confirmamos com satisfação que a compra realizada em ${saleDateFormatted} foi *TOTALMENTE QUITADA* em nosso sistema:

📱 *Item / Aparelho:* ${itemName}
💰 *Valor Total:* ${formatBRL(totalValue)}
💳 *Forma de Pagamento:* ${sale.payment_method} (${installmentsCount}x)
📅 *Data da Quitação:* ${currentDateFormatted}

✅ *Status:* QUITADO E FINALIZADO
A GODSHOP declara que não existem débitos pendentes referentes a esta compra. Agradecemos a preferência!

Atenciosamente,
*GODSHOP — Kaleb dos Santos Gonçalves*`;

  const handleSendWhatsApp = () => {
    if (!clientPhone) {
      toast.error('Cliente não possui telefone cadastrado.');
      return;
    }
    const success = openWhatsAppMessage(clientPhone, whatsappMessage);
    if (success) {
      toast.success('Termo de Quitação enviado via WhatsApp!');
    } else {
      toast.error('Não foi possível abrir o WhatsApp.');
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(whatsappMessage);
    toast.success('Texto de Quitação copiado!');
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    const toastId = toast.loading('Gerando PDF do Comprovante de Quitação...');
    try {
      const canvas = await captureElementToCanvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Comprovante_Quitacao_${clientName.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF baixado com sucesso!', { id: toastId });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast.error('Erro ao gerar PDF. Tente usar o botão de Imprimir.', { id: toastId });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-card w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Modal Top Actions Header */}
        <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-tight">Comprovante de Quitação Integral</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow"
              title="Enviar no WhatsApp"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow"
              title="Baixar PDF"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all border border-neutral-700"
              title="Imprimir"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
          <div 
            ref={printRef}
            className="bg-white text-neutral-900 p-6 sm:p-8 rounded-xl shadow-lg border border-neutral-200 space-y-6 max-w-xl mx-auto printable-area"
          >
            {/* Header / Store Stamp */}
            <div className="flex items-start justify-between border-b border-neutral-200 pb-5">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-purple-900 flex items-center gap-2">
                  <span>GODSHOP</span>
                  <span className="text-[10px] uppercase bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-full border border-purple-200">
                    Oficial
                  </span>
                </h1>
                <p className="text-xs font-semibold text-neutral-500 mt-0.5">
                  Vendas & Eletrônicos de Alta Qualidade
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Kaleb dos Santos Gonçalves • PIX / Vendas
                </p>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs px-3 py-1.5 rounded-lg shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>DÉBITO QUITADO</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1.5">
                  Emitido em: {currentDateFormatted}
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-2 bg-neutral-50 rounded-lg border border-neutral-200">
              <h2 className="text-sm font-black uppercase tracking-wider text-neutral-800">
                DECLARAÇÃO DE QUITAÇÃO INTEGRAL DE DÉBITO
              </h2>
            </div>

            {/* Client & Product Summary */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Dados do Cliente</span>
                <p className="font-bold text-neutral-800 text-sm">{clientName}</p>
                {clientCpf && <p className="text-neutral-600">CPF: {clientCpf}</p>}
                {clientPhone && <p className="text-neutral-600">Tel: {clientPhone}</p>}
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Dados do Aparelho / Item</span>
                <p className="font-bold text-neutral-800 text-sm">{itemName}</p>
                <p className="text-neutral-600">Data da Compra: {saleDateFormatted}</p>
                <p className="text-neutral-600">Pagamento: {sale.payment_method} ({installmentsCount}x)</p>
              </div>
            </div>

            {/* Financial Details Box */}
            <div className="border border-emerald-200 bg-emerald-50/60 p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-neutral-600">Valor Total da Venda:</span>
                <span className="font-bold text-neutral-900 text-sm">{formatBRL(totalValue)}</span>
              </div>
              {downPayment > 0 && (
                <div className="flex justify-between items-center text-xs text-neutral-600">
                  <span>Entrada Paga:</span>
                  <span className="font-semibold">{formatBRL(downPayment)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs border-t border-emerald-200 pt-2 font-bold text-emerald-900">
                <span className="uppercase text-[11px] tracking-wider">Saldo Devedor Restante:</span>
                <span className="text-base font-black text-emerald-700">R$ 0,00 (100% QUITADO)</span>
              </div>
            </div>

            {/* Legal Formal Statement */}
            <div className="text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 italic">
              "Declaramos para os devidos fins que o(a) cliente <strong>{clientName}</strong> efetuou a liquidação e quitação total do valor de <strong>{formatBRL(totalValue)}</strong> referente à aquisição do produto <strong>{itemName}</strong>. Não restam quaisquer pendências financeiras ou débitos ativos relacionados a esta transação."
            </div>

            {/* Signature & Seal Footer */}
            <div className="pt-6 border-t border-neutral-200 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-emerald-600 shrink-0" />
                <div className="text-[10px] text-neutral-500">
                  <p className="font-bold text-neutral-800">GODSHOP Vendas & Autenticidade</p>
                  <p>Documento gerado digitalmente pelo sistema</p>
                </div>
              </div>

              <div className="text-center border-t border-neutral-400 pt-1 w-44">
                <p className="font-bold text-xs text-neutral-800">GODSHOP</p>
                <p className="text-[10px] text-neutral-500">Kaleb dos Santos Gonçalves</p>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 bg-card border-t flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={handleCopyText}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-muted"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copiar Mensagem</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border hover:bg-muted"
            >
              Fechar
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Enviar Quitação no WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
