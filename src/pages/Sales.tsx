import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { Plus, FileText, Filter, Edit2, Trash2, CheckCircle2, Clock, CreditCard, Calendar, DollarSign, MessageSquare, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, isWithinInterval, startOfDay, endOfDay, addDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '../lib/dateUtils';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { Console } from '../types';
import { cn } from '../lib/utils';

export default function Sales() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tempPrice, setTempPrice] = useState<number>(0);
  const [tempDownPayment, setTempDownPayment] = useState<number>(0);
  const [tempInstallments, setTempInstallments] = useState<number>(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Installment Management States
  const [selectedSaleForInstallments, setSelectedSaleForInstallments] = useState<any>(null);
  const [tempPaidCount, setTempPaidCount] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [customInstallmentPayments, setCustomInstallmentPayments] = useState<{ [key: number]: number }>({});
  const [quickPaymentVal, setQuickPaymentVal] = useState<string>('');
  
  const { data: sales = [], isLoading, refetch: refetchSales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
    // Polling for signatures: check every 10 seconds if there are pending signatures
    refetchInterval: (query) => {
      const salesData = query.state.data as any[];
      if (salesData && salesData.some(s => !s.signature_data && !s.signed_at)) {
        return 10000;
      }
      return 30000; // Always poll at least every 30s
    }
  });

  const handleSyncSignatures = async () => {
    const toastId = toast.loading('Sincronizando assinaturas do servidor...');
    try {
      await refetchSales();
      toast.success('Sincronização concluída!', { id: toastId });
    } catch (e) {
      toast.error('Erro ao sincronizar assinaturas.');
    }
  };

  const { data: iphones = [] } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  const { data: consoles = [] } = useQuery({
    queryKey: ['consoles'],
    queryFn: () => db.consoles.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
  });

  const addMutation = useMutation({
    mutationFn: (newSale: any) => db.sales.create(newSale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      queryClient.invalidateQueries({ queryKey: ['consoles'] });
      setIsAdding(false);
      toast.success('Venda registrada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao registrar venda:', error);
      toast.error(`Erro ao registrar venda: ${error.message || 'Erro desconhecido'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.sales.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      queryClient.invalidateQueries({ queryKey: ['consoles'] });
      setEditingSale(null);
      toast.success('Venda atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar venda:', error);
      toast.error(`Erro ao atualizar venda: ${error.message || 'Erro desconhecido'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.sales.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      queryClient.invalidateQueries({ queryKey: ['consoles'] });
      toast.success('Venda excluída com sucesso!');
    },
    onError: () => toast.error('Erro ao excluir venda.')
  });

  const updateInstallmentsMutation = useMutation({
    mutationFn: ({ id, installments_paid }: { id: string, installments_paid: number }) => 
      db.sales.update(id, { installments_paid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setSelectedSaleForInstallments(null);
      toast.success('Parcelas atualizadas com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar parcelas:', error);
      toast.error(`Erro ao atualizar parcelas: ${error.message || 'Erro desconhecido'}`);
    }
  });

  const handleOpenInstallmentsModal = (sale: any) => {
    setSelectedSaleForInstallments(sale);
    setTempPaidCount(sale.installments_paid || 0);
    
    const totalInst = sale.installments || 1;
    const totalAmount = sale.sell_price - (sale.down_payment || 0);
    const instAmount = totalAmount / totalInst;
    
    const stored = localStorage.getItem(`inst_payments_${sale.id}`);
    if (stored) {
      try {
        setCustomInstallmentPayments(JSON.parse(stored));
      } catch (e) {
        const initial: { [key: number]: number } = {};
        for (let i = 1; i <= totalInst; i++) {
          initial[i] = i <= (sale.installments_paid || 0) ? instAmount : 0;
        }
        setCustomInstallmentPayments(initial);
      }
    } else {
      const initial: { [key: number]: number } = {};
      for (let i = 1; i <= totalInst; i++) {
        initial[i] = i <= (sale.installments_paid || 0) ? instAmount : 0;
      }
      setCustomInstallmentPayments(initial);
    }
    
    setCopied(false);
  };

  const getInstallmentDate = (sale: any, index: number) => {
    const baseDate = sale.first_installment_date ? parseLocalDate(sale.first_installment_date) : parseLocalDate(sale.sale_date);
    const intervalMultiplier = sale.first_installment_date ? (index - 1) : index;
    let dueDate;
    if (sale.installment_frequency === 'Semanal') {
      dueDate = addDays(baseDate, intervalMultiplier * 7);
    } else if (sale.installment_frequency === 'Quinzenal') {
      dueDate = addDays(baseDate, intervalMultiplier * 15);
    } else {
      dueDate = addMonths(baseDate, intervalMultiplier);
    }
    return dueDate;
  };

  interface CalculatedInstallment {
    index: number;
    expectedAmount: number;
    paidAmount: number;
    dueDate: Date;
    status: 'fully_paid' | 'pending';
  }

  const getCalculatedInstallments = (
    sale: any,
    customPayments: { [key: number]: number }
  ): CalculatedInstallment[] => {
    if (!sale) return [];
    const totalAmount = sale.sell_price - (sale.down_payment || 0);
    const baseInstCount = sale.installments || 1;

    const list: CalculatedInstallment[] = [];
    
    // First, let's gather the payments for the base installments
    let totalPaid = 0;
    const paidIndices: number[] = [];
    const unpaidIndices: number[] = [];

    for (let i = 1; i <= baseInstCount; i++) {
      const p = customPayments[i] || 0;
      if (p > 0.005) {
        totalPaid += p;
        paidIndices.push(i);
      } else {
        unpaidIndices.push(i);
      }
    }

    // Check if there is still a remaining unpaid balance and we have custom payments on any extra installments
    let remainingUnpaid = totalAmount - totalPaid;
    
    let extraIndex = baseInstCount + 1;
    while (true) {
      const p = customPayments[extraIndex] || 0;
      if (p > 0.005) {
        totalPaid += p;
        remainingUnpaid = totalAmount - totalPaid;
        paidIndices.push(extraIndex);
        extraIndex++;
      } else {
        break;
      }
    }

    // Now, if there is STILL a remaining unpaid balance (> 0.01) and we have no unpaid base installments,
    // we must add at least one open extra installment to hold the remaining balance.
    if (remainingUnpaid > 0.01 && unpaidIndices.length === 0) {
      unpaidIndices.push(extraIndex);
    }

    // Sort all indices
    const allIndices = Array.from(new Set([...paidIndices, ...unpaidIndices])).sort((a, b) => a - b);

    if (unpaidIndices.length > 0) {
      const expectedPerUnpaid = Number((remainingUnpaid / unpaidIndices.length).toFixed(2));
      const totalPaidExpected = paidIndices.reduce((sum, idx) => sum + (customPayments[idx] || 0), 0);
      const countExceptLast = unpaidIndices.length - 1;
      const sumExceptLast = countExceptLast * expectedPerUnpaid;
      const lastUnpaidIndex = unpaidIndices[unpaidIndices.length - 1];
      const lastExpected = Number((totalAmount - totalPaidExpected - sumExceptLast).toFixed(2));
      
      const expectedMap: { [key: number]: number } = {};
      for (const idx of paidIndices) {
        expectedMap[idx] = customPayments[idx] || 0;
      }
      for (let i = 0; i < unpaidIndices.length - 1; i++) {
        expectedMap[unpaidIndices[i]] = expectedPerUnpaid;
      }
      expectedMap[lastUnpaidIndex] = lastExpected;

      for (const idx of allIndices) {
        const isPaid = paidIndices.includes(idx);
        const paidVal = customPayments[idx] || 0;
        const expectedVal = expectedMap[idx];

        list.push({
          index: idx,
          expectedAmount: expectedVal,
          paidAmount: paidVal,
          dueDate: getInstallmentDate(sale, idx),
          status: isPaid ? 'fully_paid' : 'pending'
        });
      }
    } else {
      for (const idx of allIndices) {
        const paidVal = customPayments[idx] || 0;
        list.push({
          index: idx,
          expectedAmount: paidVal,
          paidAmount: paidVal,
          dueDate: getInstallmentDate(sale, idx),
          status: 'fully_paid'
        });
      }
    }

    return list;
  };

  const generateWhatsAppMessage = (sale: any, client: any, iphone: any, console: any, customPayments: { [key: number]: number }) => {
    if (!sale) return '';
    const clientName = client?.name || 'Cliente';
    const categoryName = console ? (console.category === 'tv' ? 'TV' : (console.category === 'rice_cooker' ? 'Panela Elétrica' : (console.category === 'outro' ? 'Eletro' : 'Console'))) : 'Aparelho';
    const itemName = iphone ? `${iphone.model} ${iphone.storage}` : (console ? `${categoryName} ${console.model} - ${console.version}` : 'Aparelho');
    const totalAmount = sale.sell_price - (sale.down_payment || 0);
    
    // Sum total paid so far
    const totalPaid = Number(Object.values(customPayments).reduce((sum, val) => sum + (Number(val) || 0), 0).toFixed(2));
    const remaining = Number(Math.max(0, totalAmount - totalPaid).toFixed(2));
    
    // Use the dynamic calculated schedule
    const calculatedList = getCalculatedInstallments(sale, customPayments);
    const totalInstsCount = calculatedList.length;
    const fullyPaidCount = calculatedList.filter(inst => inst.status === 'fully_paid').length;
    const pendingCount = calculatedList.filter(inst => inst.status === 'pending').length;
    
    let msg = `Olá, *${clientName}*! 📱✨\n\nPassando para confirmar o recebimento do seu pagamento. Seu carnê de parcelas referente à compra do *${itemName}* na *GODSHOP* foi atualizado:\n\n`;
    
    msg += `📊 *Resumo Financeiro:*\n`;
    const downPayment = sale.down_payment || 0;
    if (downPayment > 0) {
      msg += `💰 *Valor do Aparelho:* ${formatBRL(sale.sell_price)}\n`;
      msg += `💵 *Valor de Entrada Pago:* ${formatBRL(downPayment)}\n`;
      msg += `📉 *Valor Restante Parcelado:* ${formatBRL(totalAmount)}\n`;
    } else {
      msg += `💰 *Valor Total Parcelado:* ${formatBRL(totalAmount)}\n`;
    }
    msg += `✅ *Total Pago nas Parcelas:* ${formatBRL(totalPaid)} (${((totalPaid / totalAmount) * 100).toFixed(1)}%)\n`;
    msg += `⏳ *Saldo Devedor:* ${formatBRL(remaining)}\n`;
    msg += `📋 *Resumo de Parcelas:* ${fullyPaidCount} pagas, ${pendingCount} pendentes\n\n`;
    
    msg += `📋 *Detalhamento das Parcelas:*\n`;
    for (const inst of calculatedList) {
      if (inst.status === 'fully_paid') {
        msg += `- *${inst.index}ª Parcela:* Paga (${formatBRL(inst.paidAmount)}) ✅\n`;
      } else {
        msg += `- *${inst.index}ª Parcela:* Pendente (${formatBRL(inst.expectedAmount)}) 📅 (Vencimento: ${format(inst.dueDate, 'dd/MM/yyyy')})\n`;
      }
    }
    
    if (remaining > 0.01) {
      msg += `\n🛍️ *Muito obrigado por comprar na GODSHOP!* Agradecemos imensamente a sua preferência e confiança em nosso trabalho. Se precisar de qualquer suporte, estamos à disposição! 🤍`;
    } else {
      msg = `Olá, *${clientName}*! 🎉🥳\n\n*EXCELENTE NOTÍCIA!* Seu carnê de parcelas referente à compra do *${itemName}* foi *TOTALMENTE QUITADO*!\n\n`;
      if (downPayment > 0) {
        msg += `💰 *Valor do Aparelho:* ${formatBRL(sale.sell_price)}\n`;
        msg += `💵 *Valor de Entrada Pago:* ${formatBRL(downPayment)}\n`;
        msg += `📉 *Total das Parcelas:* ${formatBRL(totalAmount)}\n`;
      }
      msg += `✅ *Total Pago:* ${formatBRL(totalAmount + downPayment)} (100% Pago)\n\n`;
      msg += `🛍️ *Muito obrigado por comprar na GODSHOP!* Gostaríamos de agradecer imensamente pela sua parceria, preferência e por escolher a nossa loja. É uma honra ter você como cliente! Conte sempre conosco para suas próximas compras! 🤍✨`;
    }
    
    return msg;
  };

  const getWhatsAppUrl = (phone: string, text: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.length > 0 && !clean.startsWith('55') && clean.length <= 11) {
      clean = '55' + clean;
    }
    return `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(text)}`;
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Mensagem de atualização copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const iphoneId = formData.get('iphone_id');
    const consoleId = formData.get('console_id');

    const firstInstallmentDate = formData.get('first_installment_date');

    addMutation.mutate({
      iphone_id: iphoneId ? iphoneId.toString() : null,
      console_id: consoleId ? consoleId.toString() : null,
      client_id: formData.get('client_id'),
      sell_price: Number(formData.get('sell_price')),
      down_payment: Number(formData.get('down_payment')) || 0,
      payment_method: formData.get('payment_method'),
      installments: Number(formData.get('installments')) || 1,
      installment_frequency: (formData.get('installment_frequency') as 'Semanal' | 'Quinzenal' | 'Mensal') || 'Mensal',
      sale_date: formData.get('sale_date') ? new Date(formData.get('sale_date') as string).toISOString() : new Date().toISOString(),
      first_installment_date: firstInstallmentDate ? new Date(firstInstallmentDate as string).toISOString() : undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSale) return;
    const formData = new FormData(e.currentTarget);
    const iphoneId = formData.get('iphone_id');
    const consoleId = formData.get('console_id');
    const firstInstallmentDate = formData.get('first_installment_date');

    updateMutation.mutate({
      id: editingSale.id,
      data: {
        iphone_id: iphoneId ? iphoneId.toString() : null,
        console_id: consoleId ? consoleId.toString() : null,
        client_id: formData.get('client_id'),
        sell_price: Number(formData.get('sell_price')),
        down_payment: Number(formData.get('down_payment')) || 0,
        payment_method: formData.get('payment_method'),
        installments: Number(formData.get('installments')) || 1,
        installment_frequency: (formData.get('installment_frequency') as 'Semanal' | 'Quinzenal' | 'Mensal') || 'Mensal',
        sale_date: formData.get('sale_date') ? new Date(formData.get('sale_date') as string).toISOString() : editingSale.sale_date,
        first_installment_date: firstInstallmentDate ? new Date(firstInstallmentDate as string).toISOString() : null,
      }
    });
  };

  const availableIphones = iphones.filter(i => i.status === 'disponivel');
  const availableConsoles = consoles.filter(c => c.status === 'disponivel');

  const filteredSales = sales.filter(sale => {
    if (!startDate || !endDate) return true;
    const date = parseLocalDate(sale.sale_date);
    return isWithinInterval(date, {
      start: startOfDay(parseLocalDate(startDate)),
      end: endOfDay(parseLocalDate(endDate))
    });
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Vendas
            <button 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['sales'] });
                toast.promise(db.sales.list(), {
                  loading: 'Sincronizando assinaturas...',
                  success: 'Sincronização concluída!',
                  error: 'Erro ao sincronizar.'
                });
              }}
              className="p-1 hover:bg-muted rounded-full transition-colors"
              title="Sincronizar assinaturas agora"
            >
              <RefreshCw className={cn("h-4 w-4 text-muted-foreground hover:text-primary", isLoading && "animate-spin")} />
            </button>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Registre e acompanhe suas vendas</p>
          <div className="flex gap-2 mt-2">
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> {sales.filter(s => s.signature_data || s.signed_at).length} Assinadas
            </span>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> {sales.filter(s => !s.signature_data && !s.signed_at).length} Pendentes
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link 
            to="/invoices"
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-secondary/80"
          >
            <FileText className="h-4 w-4" />
            Emitir Notas
          </Link>
          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingSale(null);
              setTempPrice(0);
              setTempDownPayment(0);
              setTempInstallments(1);
            }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nova Venda
          </button>
        </div>
      </div>

      {(isAdding || editingSale) && (
        <div key={editingSale ? `edit-${editingSale.id}` : 'add'} className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingSale ? 'Editar Venda' : 'Registrar Venda'}</h2>
          <form onSubmit={editingSale ? handleUpdate : handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Aparelho</label>
              <select name="iphone_id" defaultValue={editingSale?.iphone_id} className="w-full p-2 border rounded-md bg-background">
                <option value="">Selecione...</option>
                {editingSale?.iphone_id && iphones.find(i => i.id === editingSale.iphone_id) && (
                  <option value={editingSale.iphone_id}>
                    {iphones.find(i => i.id === editingSale.iphone_id)?.model} - {iphones.find(i => i.id === editingSale.iphone_id)?.storage} (Atual)
                  </option>
                )}
                {availableIphones.map(i => (
                  <option key={i.id} value={i.id}>{i.model} - {i.storage} ({i.color})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Eletrônico / Eletro / Console</label>
              <select name="console_id" defaultValue={editingSale?.console_id} className="w-full p-2 border rounded-md bg-background">
                <option value="">Selecione...</option>
                {editingSale?.console_id && consoles.find(c => c.id === editingSale.console_id) && (
                  <option value={editingSale.console_id}>
                    {(() => {
                      const c = consoles.find(item => item.id === editingSale.console_id);
                      if (!c) return '';
                      const cat = c.category === 'tv' ? 'TV' : (c.category === 'rice_cooker' ? 'Panela Elétrica' : (c.category === 'outro' ? 'Outro' : 'Videogame'));
                      return `[${cat}] ${c.model} - ${c.version} (Atual)`;
                    })()}
                  </option>
                )}
                {availableConsoles.map(c => {
                  const cat = c.category === 'tv' ? 'TV' : (c.category === 'rice_cooker' ? 'Panela Elétrica' : (c.category === 'outro' ? 'Outro' : 'Videogame'));
                  return (
                    <option key={c.id} value={c.id}>
                      [{cat}] {c.model} - {c.version}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <select name="client_id" defaultValue={editingSale?.client_id} required className="w-full p-2 border rounded-md bg-background">
                <option value="">Selecione...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor da Venda</label>
              <input 
                name="sell_price" 
                defaultValue={editingSale?.sell_price} 
                type="number" 
                step="0.01" 
                required 
                className="w-full p-2 border rounded-md" 
                placeholder="R$ 0,00"
                onChange={(e) => setTempPrice(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Entrada</label>
              <input 
                name="down_payment" 
                defaultValue={editingSale?.down_payment || 0} 
                type="number" 
                step="0.01" 
                className="w-full p-2 border rounded-md" 
                placeholder="R$ 0,00"
                onChange={(e) => setTempDownPayment(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de Pagamento</label>
              <select name="payment_method" defaultValue={editingSale?.payment_method} required className="w-full p-2 border rounded-md bg-background">
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão">Cartão</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Parcelas</label>
              <div className="flex gap-2">
                <input 
                  name="installments" 
                  defaultValue={editingSale?.installments || 1} 
                  type="number" 
                  min="1" 
                  max="24" 
                  required 
                  className="w-1/2 p-2 border rounded-md"
                  onChange={(e) => setTempInstallments(Number(e.target.value))}
                />
                <select name="installment_frequency" defaultValue={editingSale?.installment_frequency || 'Mensal'} className="w-1/2 p-2 border rounded-md bg-background">
                  <option value="Mensal">Mensal</option>
                  <option value="Quinzenal">Quinzenal</option>
                  <option value="Semanal">Semanal</option>
                </select>
              </div>
              {tempInstallments > 1 && tempPrice > 0 && (
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Valor por parcela: {formatBRL((tempPrice - tempDownPayment) / tempInstallments)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data da Venda</label>
              <input 
                name="sale_date" 
                type="date" 
                defaultValue={editingSale ? format(parseLocalDate(editingSale.sale_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')} 
                required 
                className="w-full p-2 border rounded-md bg-background" 
              />
            </div>
            {tempInstallments > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Data da 1ª Parcela</label>
                <input 
                  name="first_installment_date" 
                  type="date" 
                  defaultValue={editingSale?.first_installment_date ? format(parseLocalDate(editingSale.first_installment_date), 'yyyy-MM-dd') : ''} 
                  required 
                  className="w-full p-2 border rounded-md bg-background" 
                />
              </div>
            )}
            <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => { setIsAdding(false); setEditingSale(null); }} className="bg-muted text-muted-foreground px-4 py-2 rounded-md font-medium">
                Cancelar
              </button>
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
                {editingSale ? 'Atualizar Venda' : 'Confirmar Venda'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="p-2 border rounded-md text-sm"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span className="text-muted-foreground">até</span>
            <input 
              type="date" 
              className="p-2 border rounded-md text-sm"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-sm text-destructive hover:underline ml-2"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Aparelho</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Lucro</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSales.map((sale) => {
                const iphone = iphones.find(i => i.id === sale.iphone_id);
                const consoleObj = consoles.find(c => c.id === sale.console_id);
                const client = clients.find(c => c.id === sale.client_id);
                const profit = iphone ? sale.sell_price - iphone.buy_price : (consoleObj ? sale.sell_price - consoleObj.buy_price : 0);
                const remaining = sale.sell_price - (sale.down_payment || 0);

                return (
                  <tr key={sale.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">{format(parseLocalDate(sale.sale_date), 'dd/MM/yyyy', { locale: ptBR })}</td>
                    <td className="px-4 py-3 font-medium">
                      {iphone ? `${iphone.model} ${iphone.storage}` : (consoleObj ? `${consoleObj.category === 'tv' ? '[TV] ' : (consoleObj.category === 'rice_cooker' ? '[Panela] ' : (consoleObj.category === 'outro' ? '[Eletro] ' : ''))}${consoleObj.model} - ${consoleObj.version}` : 'N/A')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span>{client?.name || 'N/A'}</span>
                        {(sale.signature_data || sale.signed_at) ? (
                          <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 mt-1 bg-emerald-50 w-fit px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="h-3 w-3" /> Assinado
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1 bg-amber-50 w-fit px-1.5 py-0.5 rounded">
                              <Clock className="h-3 w-3" /> Pendente
                            </span>
                            <button 
                              onClick={async () => {
                                const toastId = toast.loading(`Buscando assinatura de ${client?.name || 'Cliente'}...`);
                                try {
                                  // This will trigger the list() query which includes the signature sync logic
                                  await queryClient.invalidateQueries({ queryKey: ['sales'] });
                                  toast.success('Busca concluída!', { id: toastId });
                                } catch (e) {
                                  toast.error('Erro na busca.', { id: toastId });
                                }
                              }}
                              className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                              title="Verificar se o cliente já assinou"
                            >
                              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatBRL(sale.sell_price)}
                      {sale.down_payment && sale.down_payment > 0 && (
                        <span className="text-xs text-muted-foreground block">
                          Entrada: {formatBRL(sale.down_payment)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">{formatBRL(profit)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span>{sale.payment_method}</span>
                        {sale.installments && sale.installments > 1 && (() => {
                          const totalAmount = sale.sell_price - (sale.down_payment || 0);
                          const totalInst = sale.installments || 1;
                          const installmentValue = totalAmount / totalInst;
                          
                          // Check if we have custom payments in localStorage
                          const storedPaymentsStr = localStorage.getItem(`inst_payments_${sale.id}`);
                          let totalPaidFromCustom = 0;
                          let hasCustomPayments = false;
                          let customPayments: Record<number, number> = {};
                          
                          if (storedPaymentsStr) {
                            try {
                              customPayments = JSON.parse(storedPaymentsStr) as Record<number, number>;
                              totalPaidFromCustom = Number(Object.values(customPayments).reduce<number>((sum, val) => sum + (Number(val) || 0), 0).toFixed(2));
                              hasCustomPayments = true;
                            } catch (e) {
                              window.console.error(e);
                            }
                          }
                          
                          const remainingAmount = Number((hasCustomPayments 
                            ? Math.max(0, totalAmount - totalPaidFromCustom)
                            : Math.max(0, totalAmount - ((sale.installments_paid || 0) * installmentValue))
                          ).toFixed(2));
                            
                          const isFullySettled = remainingAmount <= 0.01;

                          const calculatedList = getCalculatedInstallments(sale, customPayments);
                          const totalInstsCount = hasCustomPayments ? calculatedList.length : totalInst;
                          const paidInstsCount = hasCustomPayments 
                            ? calculatedList.filter(inst => inst.status === 'fully_paid').length 
                            : (sale.installments_paid || 0);
                          
                          return (
                            <div className="text-xs text-muted-foreground block space-y-1 mt-1">
                              <span className="block font-medium">{sale.installments}x {sale.installment_frequency === 'Semanal' ? 'Semanal' : (sale.installment_frequency === 'Quinzenal' ? 'Quinzenal' : 'Mensal')}</span>
                              <span className="block font-semibold text-amber-700 dark:text-amber-400">
                                Saldo Devedor: {formatBRL(remainingAmount)}
                              </span>
                              {sale.first_installment_date && <span className="block text-[10px]">1ª parc: {format(parseLocalDate(sale.first_installment_date), 'dd/MM/yyyy')}</span>}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-emerald-600 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                  Pagas: {paidInstsCount} de {totalInstsCount}
                                </span>
                              </div>
                              {isFullySettled && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm mt-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  QUITADO 🎉
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sale.installments && sale.installments > 1 && (
                          <button 
                            onClick={() => handleOpenInstallmentsModal(sale)}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors p-1 rounded-md"
                            title="Gerenciar Parcelas"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setEditingSale(sale);
                            setIsAdding(false);
                            setTempPrice(sale.sell_price);
                            setTempDownPayment(sale.down_payment || 0);
                            setTempInstallments(sale.installments || 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Editar Venda"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteId(sale.id)}
                          className="text-destructive hover:bg-destructive/10 transition-colors p-1 rounded-md"
                          title="Excluir Venda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <Link 
                          to={`/guarantee/${sale.id}`}
                          className="text-primary hover:underline text-xs font-medium ml-2"
                        >
                          Gerar Nota
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma venda encontrada no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Venda"
        message="Tem certeza que deseja excluir esta venda? O aparelho voltará para o estoque como disponível."
        confirmText="Excluir"
      />

      {/* MODAL GERENCIAR PARCELAS */}
      {selectedSaleForInstallments && (() => {
        const sale = selectedSaleForInstallments;
        const client = clients.find(c => c.id === sale.client_id);
        const iphone = iphones.find(i => i.id === sale.iphone_id);
        const consoleObj = consoles.find(c => c.id === sale.console_id);
        
        const clientName = client?.name || 'Cliente';
        const itemName = iphone ? `${iphone.model} ${iphone.storage}` : (consoleObj ? `${consoleObj.model} - ${consoleObj.version}` : 'Aparelho');
        const totalAmount = sale.sell_price - (sale.down_payment || 0);
        const totalInst = sale.installments || 1;
        const instAmount = totalAmount / totalInst;
        
        const messageText = generateWhatsAppMessage(sale, client, iphone, consoleObj, customInstallmentPayments);
        const cleanPhone = client?.phone ? client.phone.replace(/\D/g, '') : '';
        const whatsappUrl = getWhatsAppUrl(cleanPhone, messageText);
        
        const totalPaidAmount = Number(Object.values(customInstallmentPayments).reduce<number>((sum, val) => sum + (Number(val) || 0), 0).toFixed(2));
        const remainingAmount = Number(Math.max(0, totalAmount - totalPaidAmount).toFixed(2));
        const progressPercentage = totalAmount > 0 ? Math.round((totalPaidAmount / totalAmount) * 100) : 100;

        return (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pb-24 sm:pb-6">
            <div className="bg-card border rounded-2xl shadow-xl max-w-4xl w-full max-h-[calc(100vh-140px)] sm:max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
              {/* Header */}
              <div className="bg-emerald-800 text-white p-5 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-300" />
                    Gerenciar Parcelas — GODSHOP
                  </h3>
                  <p className="text-emerald-100 text-xs mt-1">
                    Cliente: <strong className="text-white">{clientName}</strong> • {itemName}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedSaleForInstallments(null)} 
                  className="text-emerald-200 hover:text-white transition-colors text-xl font-semibold bg-emerald-900/40 p-1.5 rounded-full"
                >
                  &times;
                </button>
              </div>

              {/* Body */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
                {/* Left Column: Installments checklist */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1 uppercase tracking-wider text-muted-foreground">Progresso do Pagamento</h4>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>{formatBRL(totalPaidAmount)} pago de {formatBRL(totalAmount)}</span>
                      <span className="text-emerald-600">{progressPercentage}% Pago</span>
                    </div>
                    <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-[#f9fafb] p-4 rounded-xl border space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Valor Total Parcelado:</span>
                      <span className="font-bold text-foreground">{formatBRL(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Valor de Cada Parcela:</span>
                      <span className="font-bold text-emerald-700">{formatBRL(instAmount)} ({sale.installment_frequency})</span>
                    </div>
                    <div className="flex justify-between text-xs border-t pt-1.5">
                      <span className="text-amber-800 dark:text-amber-400 font-semibold">Saldo Devedor Restante:</span>
                      <span className="font-bold text-amber-800 dark:text-amber-400">{formatBRL(remainingAmount)}</span>
                    </div>
                    {sale.down_payment > 0 && (
                      <div className="flex justify-between text-[11px] border-t pt-1">
                        <span className="text-muted-foreground">Valor de Entrada Pago:</span>
                        <span className="font-medium text-muted-foreground">{formatBRL(sale.down_payment)}</span>
                      </div>
                    )}
                  </div>

                  {/* Lançamento e Distribuição Rápida de Pagamento */}
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-3">
                    <div className="flex flex-col gap-1">
                      <h5 className="font-bold text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                        Lançar e Distribuir Pagamento Rápido
                      </h5>
                      <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                        Digite um valor recebido. O sistema irá preencher automaticamente as parcelas de forma inteligente.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 150.00"
                          value={quickPaymentVal}
                          onChange={(e) => setQuickPaymentVal(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 bg-background focus:ring-2 focus:ring-emerald-500 focus:outline-none text-foreground"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const amount = parseFloat(quickPaymentVal);
                          if (isNaN(amount) || amount <= 0) {
                            toast.error('Por favor, insira um valor válido maior que zero.');
                            return;
                          }
                          
                          let remainingPool = amount;
                          const newPayments = { ...customInstallmentPayments };
                          
                          // Distribute sequentially based on the current calculated installments.
                          // Recalculate step-by-step so that expected values adjust correctly after each allocation.
                          while (remainingPool > 0.005) {
                            const calculated = getCalculatedInstallments(sale, newPayments);
                            const firstUnpaid = calculated.find(inst => inst.status === 'pending');
                            
                            if (!firstUnpaid) {
                              // If everything is already fully paid, we add any excess to the last installment
                              const lastIdx = calculated.length > 0 ? calculated[calculated.length - 1].index : totalInst;
                              newPayments[lastIdx] = Number(((newPayments[lastIdx] || 0) + remainingPool).toFixed(2));
                              break;
                            }
                            
                            // Apply up to the expected amount of this first unpaid installment
                            const needed = firstUnpaid.expectedAmount;
                            const apply = Math.min(remainingPool, needed);
                            
                            newPayments[firstUnpaid.index] = Number(((newPayments[firstUnpaid.index] || 0) + apply).toFixed(2));
                            remainingPool -= apply;
                          }
                          
                          setCustomInstallmentPayments(newPayments);
                          setQuickPaymentVal('');
                          toast.success(`R$ ${amount.toFixed(2)} distribuído com sucesso!`);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        Distribuir
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomInstallmentPayments({});
                          toast.info('Valores de todas as parcelas zerados.');
                        }}
                        className="bg-muted hover:bg-muted/80 text-muted-foreground font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Zerar todos os pagamentos"
                      >
                        Zerar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    <h4 className="font-bold text-xs text-muted-foreground mb-2 uppercase tracking-wider">Cronograma e Valores Pagos</h4>
                    {(() => {
                      const calculatedList = getCalculatedInstallments(sale, customInstallmentPayments);
                      return calculatedList.map((inst) => {
                        const dueDate = inst.dueDate;
                        const paidValue = inst.paidAmount;
                        const expectedValue = inst.expectedAmount;
                        const isFullyPaid = inst.status === 'fully_paid';
                        
                        return (
                          <div 
                            key={inst.index} 
                            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-xl gap-2 transition-all ${
                              isFullyPaid 
                                ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900 shadow-sm' 
                                : 'bg-card border-border hover:bg-muted/50 text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={isFullyPaid}
                                onChange={(e) => {
                                  setCustomInstallmentPayments(prev => {
                                    const next = { ...prev };
                                    if (e.target.checked) {
                                      next[inst.index] = Number(expectedValue.toFixed(2));
                                    } else {
                                      next[inst.index] = 0;
                                    }
                                    return next;
                                  });
                                }}
                                className="rounded text-emerald-600 focus:ring-emerald-500 border-muted h-4 w-4 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs">
                                  {inst.index}ª Parcela {inst.index > totalInst && (
                                    <span className="text-[9px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900 ml-1">
                                      Ajuste
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> Vencimento: {format(dueDate, 'dd/MM/yyyy')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] text-muted-foreground">Original: {formatBRL(instAmount)}</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[11px] font-semibold text-muted-foreground">Pago: R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={customInstallmentPayments[inst.index] !== undefined ? customInstallmentPayments[inst.index] : 0}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setCustomInstallmentPayments(prev => ({
                                        ...prev,
                                        [inst.index]: isNaN(val) ? 0 : val
                                      }));
                                    }}
                                    className="w-20 px-1.5 py-0.5 text-right font-mono text-xs font-bold border rounded bg-background focus:ring-1 focus:ring-emerald-500 focus:outline-none text-foreground"
                                  />
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold mt-1 flex items-center gap-1 ${
                                  isFullyPaid 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {isFullyPaid ? <Check className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                                  {isFullyPaid 
                                    ? `Paga (${formatBRL(paidValue)})` 
                                    : `Pendente (${formatBRL(expectedValue)})`}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Right Column: WhatsApp text card and sharing buttons */}
                <div className="lg:col-span-6 flex flex-col space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      Atualização para o Cliente
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Uma mensagem formatada para WhatsApp será gerada automaticamente com o resumo do carnê para manter seu cliente informado.
                    </p>
                  </div>

                  <div className="flex-1 bg-neutral-900 text-neutral-100 p-4 rounded-xl font-mono text-xs overflow-y-auto max-h-[350px] whitespace-pre-wrap border border-neutral-800 shadow-inner relative group">
                    {messageText}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button" 
                      onClick={() => handleCopyMessage(messageText)}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-sm p-3 rounded-xl flex items-center justify-center gap-2 border transition-all"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                    <a 
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-sm p-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-center"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Enviar WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-muted/40 p-3 sm:p-4 border-t flex justify-end gap-2 sm:gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setSelectedSaleForInstallments(null)} 
                  className="bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  disabled={updateInstallmentsMutation.isPending}
                  onClick={() => {
                    // Save custom payment data to localStorage
                    localStorage.setItem(`inst_payments_${sale.id}`, JSON.stringify(customInstallmentPayments));
                    
                    // Count how many are fully paid using the smart calculated schedule
                    const calculated = getCalculatedInstallments(sale, customInstallmentPayments);
                    const countPaid = calculated.filter(inst => inst.status === 'fully_paid').length;
                    
                    updateInstallmentsMutation.mutate({ id: sale.id, installments_paid: countPaid });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
                >
                  {updateInstallmentsMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
