import React, { useState } from 'react';
import { copyToClipboard } from '../utils/url';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { 
  Plus, FileText, Filter, Edit2, Trash2, CheckCircle2, Clock, CreditCard, 
  Calendar, DollarSign, MessageSquare, Copy, Check, ExternalLink, RefreshCw, 
  FileCheck, ShoppingCart, Smartphone, Gamepad2, Gift, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isWithinInterval, startOfDay, endOfDay, addDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate, getInstallmentDate, getCalculatedInstallments, getSaleClient, CalculatedInstallment } from '../lib/dateUtils';
import { broadcastLocalChange } from '../services/realtime';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import WhatsAppStatusModal from '../components/WhatsAppStatusModal';
import QuitacaoModal from '../components/QuitacaoModal';
import { WhatsAppStatusType } from '../lib/whatsappUtils';
import { Console } from '../types';
import { cn } from '../lib/utils';
import { safeSetLocalStorage } from '../utils/imageStorageUtils';

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

  // WhatsApp Status Modal States
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusClientData, setStatusClientData] = useState<{ name: string; phone: string; itemName?: string } | null>(null);
  const [statusDefaultType, setStatusDefaultType] = useState<WhatsAppStatusType>('order_preparing');
  
  // Quitação Modal States
  const [quitacaoModalOpen, setQuitacaoModalOpen] = useState(false);
  const [quitacaoData, setQuitacaoData] = useState<{ sale: any; client: any; iphone?: any; consoleObj?: any } | null>(null);
  
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

  const { data: gifts = [] } = useQuery({
    queryKey: ['gifts'],
    queryFn: () => db.gifts.list(),
  });

  const [cartItems, setCartItems] = useState<Array<{ type: 'iphone' | 'console' | 'gift' | 'accessory'; id: string; name: string; price: number; quantity?: number; cost_price?: number }>>([]);
  const [selectedProductType, setSelectedProductType] = useState<'iphone' | 'console' | 'gift'>('iphone');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemPrice, setItemPrice] = useState<number>(0);

  const handleProductSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    if (!prodId) {
      setItemPrice(0);
      return;
    }
    if (selectedProductType === 'iphone') {
      const i = iphones.find(item => item.id === prodId);
      if (i) setItemPrice(Number(i.sell_price || 0));
    } else if (selectedProductType === 'console') {
      const c = consoles.find(item => item.id === prodId);
      if (c) setItemPrice(Number(c.sell_price || 0));
    } else if (selectedProductType === 'gift') {
      const g = gifts.find(item => item.id === prodId);
      if (g) setItemPrice(Number(g.sell_price || 0));
    }
  };

  const handleAddToCart = () => {
    if (!selectedProductId) {
      toast.error('Selecione um produto para adicionar à venda.');
      return;
    }
    if (cartItems.some(item => item.id === selectedProductId)) {
      toast.error('Este produto já foi adicionado ao carrinho.');
      return;
    }

    let itemName = '';
    let itemCost = 0;
    let defPrice = itemPrice > 0 ? itemPrice : 0;

    if (selectedProductType === 'iphone') {
      const i = iphones.find(item => item.id === selectedProductId);
      if (!i) return;
      itemName = `${i.model} - ${i.storage} (${i.color})`;
      itemCost = Number(i.buy_price || i.cost_price || 0);
      if (!defPrice) defPrice = Number(i.sell_price || 0);
    } else if (selectedProductType === 'console') {
      const c = consoles.find(item => item.id === selectedProductId);
      if (!c) return;
      const cat = c.category === 'tv' ? 'TV' : (c.category === 'rice_cooker' ? 'Panela' : (c.category === 'outro' ? 'Eletro' : 'Console'));
      itemName = `[${cat}] ${c.model} - ${c.version}`;
      itemCost = Number(c.buy_price || c.cost_price || 0);
      if (!defPrice) defPrice = Number(c.sell_price || 0);
    } else if (selectedProductType === 'gift') {
      const g = gifts.find(item => item.id === selectedProductId);
      if (!g) return;
      itemName = `[Mimo] ${g.name}`;
      itemCost = Number(g.cost_price || 0);
      if (!defPrice) defPrice = Number(g.sell_price || 0);
    }

    const newItem: { type: 'iphone' | 'console' | 'gift' | 'accessory'; id: string; name: string; price: number; quantity: number; cost_price: number } = {
      type: (selectedProductType === 'gift' ? 'accessory' : selectedProductType) as any,
      id: selectedProductId,
      name: itemName,
      price: defPrice,
      quantity: 1,
      cost_price: itemCost
    };

    const updatedCart = [...cartItems, newItem];
    setCartItems(updatedCart);
    setSelectedProductId('');
    setItemPrice(0);

    const total = updatedCart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    setTempPrice(total);
    toast.success(`${itemName} adicionado ao carrinho!`);
  };

  const handleRemoveFromCart = (index: number) => {
    const itemToRemove = cartItems[index];
    const updatedCart = cartItems.filter((_, idx) => idx !== index);
    setCartItems(updatedCart);
    const total = updatedCart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    setTempPrice(total);
    if (itemToRemove) {
      toast.info(`${itemToRemove.name} removido do carrinho.`);
    }
  };

  const addMutation = useMutation({
    mutationFn: (newSale: any) => db.sales.create(newSale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      queryClient.invalidateQueries({ queryKey: ['consoles'] });
      broadcastLocalChange('sales');
      broadcastLocalChange('clients');
      setIsAdding(false);
      setSelectedClientId('');
      setIsCreatingNewClient(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientCpf('');
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
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      queryClient.invalidateQueries({ queryKey: ['consoles'] });
      broadcastLocalChange('sales');
      broadcastLocalChange('clients');
      setEditingSale(null);
      setSelectedClientId('');
      setIsCreatingNewClient(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientCpf('');
      toast.success('Venda e cliente atualizados com sucesso!');
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
    mutationFn: ({ id, installments_paid, custom_payments }: { id: string, installments_paid: number, custom_payments?: string }) => 
      db.sales.update(id, { installments_paid, custom_payments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      broadcastLocalChange('sales');
      setSelectedSaleForInstallments(null);
      toast.success('Parcelas e cronograma atualizados em tempo real!');
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
    
    let loadedPayments = null;
    if (sale.custom_payments) {
      try {
        loadedPayments = typeof sale.custom_payments === 'string' ? JSON.parse(sale.custom_payments) : sale.custom_payments;
      } catch (e) {}
    }
    if (!loadedPayments) {
      const stored = localStorage.getItem(`inst_payments_${sale.id}`);
      if (stored) {
        try {
          loadedPayments = JSON.parse(stored);
        } catch (e) {}
      }
    }

    if (loadedPayments) {
      setCustomInstallmentPayments(loadedPayments);
    } else {
      const initial: { [key: number]: number } = {};
      for (let i = 1; i <= totalInst; i++) {
        initial[i] = i <= (sale.installments_paid || 0) ? instAmount : 0;
      }
      setCustomInstallmentPayments(initial);
    }
    
    setCopied(false);
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
    
    const attendantName = localStorage.getItem('auto_attendant_name') || 'Karen';
    const pixInfo = localStorage.getItem('auto_pix_info') || 'Chave Pix (Celular/Telefone): 13036942637\nNome: Kaleb dos Santos Gonçalves';

    let msg = `Olá, *${clientName}*! 😊 Aqui é a *${attendantName}*, assistente virtual da *GODSHOP*. (Esta é uma mensagem automática)\n\nPassando para confirmar o recebimento do seu pagamento. Seu carnê de parcelas referente à compra do *${itemName}* foi atualizado:\n\n`;
    
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
      msg += `\nNossa chave PIX oficial para pagamentos das próximas parcelas é:\n\n*${pixInfo}*\n\n🛍️ *Muito obrigado por comprar na GODSHOP!* Agradecemos imensamente a sua preferência e confiança em nosso trabalho. Se precisar de qualquer suporte, estamos à disposição! 🤍`;
    } else {
      msg = `Olá, *${clientName}*! 🎉🥳 Aqui é a *${attendantName}*, assistente virtual da *GODSHOP*. (Esta é uma mensagem automática)\n\n*EXCELENTE NOTÍCIA!* Seu carnê de parcelas referente à compra do *${itemName}* foi *TOTALMENTE QUITADO*!\n\n`;
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

  const handleCopyMessage = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      toast.success('Mensagem de atualização copiada para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info('Mensagem pronta');
    }
  };

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast.error('Adicione pelo menos um produto ao carrinho.');
      return;
    }
    const formData = new FormData(e.currentTarget);
    const firstIphone = cartItems.find(i => i.type === 'iphone')?.id;
    const firstConsole = cartItems.find(i => i.type === 'console')?.id;
    const firstInstallmentDate = formData.get('first_installment_date');

    let clientId = selectedClientId || (formData.get('client_id') as string) || '';
    let clientObj = clients.find(c => c && String(c.id) === String(clientId)) || null;

    if (isCreatingNewClient) {
      if (!newClientName.trim()) {
        toast.error('Por favor, informe o nome do novo cliente.');
        return;
      }
      try {
        const created = await db.clients.create({
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          cpf: newClientCpf.trim(),
        });
        clientId = String(created.id);
        clientObj = created;
        setSelectedClientId(String(created.id));
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        toast.success(`Cliente "${created.name}" cadastrado e vinculado com sucesso!`);
      } catch (err: any) {
        toast.error('Erro ao cadastrar novo cliente: ' + (err.message || 'Erro desconhecido'));
        return;
      }
    }

    addMutation.mutate({
      iphone_id: firstIphone || null,
      console_id: firstConsole || null,
      items: cartItems,
      client_id: clientId,
      client_name: clientObj?.name || newClientName.trim() || '',
      client_phone: clientObj?.phone || newClientPhone.trim() || '',
      client_cpf: clientObj?.cpf || newClientCpf.trim() || '',
      client_address: clientObj?.address || '',
      client: clientObj || null,
      sell_price: tempPrice > 0 ? tempPrice : Number(formData.get('sell_price')),
      down_payment: Number(formData.get('down_payment')) || 0,
      payment_method: formData.get('payment_method'),
      installments: Number(formData.get('installments')) || 1,
      installment_frequency: (formData.get('installment_frequency') as 'Semanal' | 'Quinzenal' | 'Mensal') || 'Mensal',
      sale_date: formData.get('sale_date') ? (formData.get('sale_date') as string) : format(new Date(), 'yyyy-MM-dd'),
      first_installment_date: firstInstallmentDate ? (firstInstallmentDate as string) : undefined,
    });
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSale) return;
    const formData = new FormData(e.currentTarget);
    const firstIphone = cartItems.find(i => i.type === 'iphone')?.id;
    const firstConsole = cartItems.find(i => i.type === 'console')?.id;
    const firstInstallmentDate = formData.get('first_installment_date');
    const cleanFirstDate = firstInstallmentDate && typeof firstInstallmentDate === 'string' && firstInstallmentDate.trim() !== '' ? firstInstallmentDate.toString().trim() : null;

    const formClientId = (formData.get('client_id') as string)?.trim() || selectedClientId || editingSale.client_id || '';
    const existingClient = getSaleClient(editingSale, clients);

    let targetClientId = formClientId || existingClient?.id || '';
    let targetClientObj = clients.find(c => c && String(c.id) === String(targetClientId)) || existingClient || null;

    if (isCreatingNewClient) {
      if (!newClientName.trim()) {
        toast.error('Por favor, informe o nome do novo cliente.');
        return;
      }
      try {
        const created = await db.clients.create({
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          cpf: newClientCpf.trim(),
        });
        targetClientId = String(created.id);
        targetClientObj = created;
        setSelectedClientId(String(created.id));
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        toast.success(`Cliente "${created.name}" cadastrado e vinculado com sucesso!`);
      } catch (err: any) {
        toast.error('Erro ao cadastrar novo cliente: ' + (err.message || 'Erro desconhecido'));
        return;
      }
    }

    if (!targetClientId && !isCreatingNewClient && existingClient) {
      targetClientId = String(existingClient.id || '');
      targetClientObj = existingClient;
    }

    const finalClientName = targetClientObj?.name || (isCreatingNewClient ? newClientName.trim() : '') || existingClient?.name || editingSale.client_name || editingSale.client?.name || '';
    const finalClientPhone = targetClientObj?.phone || (isCreatingNewClient ? newClientPhone.trim() : '') || existingClient?.phone || editingSale.client_phone || editingSale.client?.phone || '';
    const finalClientCpf = targetClientObj?.cpf || (isCreatingNewClient ? newClientCpf.trim() : '') || existingClient?.cpf || editingSale.client_cpf || editingSale.client?.cpf || '';
    const finalClientAddress = targetClientObj?.address || existingClient?.address || editingSale.client_address || editingSale.client?.address || '';

    const finalClientObj = targetClientObj || existingClient || (finalClientName ? {
      id: targetClientId || 'client-obj',
      name: finalClientName,
      phone: finalClientPhone,
      cpf: finalClientCpf,
      address: finalClientAddress
    } : null);

    updateMutation.mutate({
      id: editingSale.id,
      data: {
        iphone_id: firstIphone || null,
        console_id: firstConsole || null,
        items: cartItems,
        client_id: targetClientId || editingSale.client_id || '',
        client_name: finalClientName,
        client_phone: finalClientPhone,
        client_cpf: finalClientCpf,
        client_address: finalClientAddress,
        client: finalClientObj,
        sell_price: tempPrice > 0 ? tempPrice : Number(formData.get('sell_price')),
        down_payment: Number(formData.get('down_payment')) || 0,
        payment_method: formData.get('payment_method'),
        installments: Number(formData.get('installments')) || 1,
        installment_frequency: (formData.get('installment_frequency') as 'Semanal' | 'Quinzenal' | 'Mensal') || 'Mensal',
        sale_date: formData.get('sale_date') ? (formData.get('sale_date') as string) : editingSale.sale_date,
        first_installment_date: cleanFirstDate,
      }
    });
  };

  const availableIphones = iphones.filter(i => (!cartItems.some(ci => ci.id === i.id)));
  const availableConsoles = consoles.filter(c => (!cartItems.some(ci => ci.id === c.id)));
  const availableGifts = gifts.filter(g => (!cartItems.some(ci => ci.id === g.id)));

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
              onClick={handleSyncSignatures}
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
              setSelectedClientId('');
              setIsCreatingNewClient(false);
              setNewClientName('');
              setNewClientPhone('');
              setNewClientCpf('');
              setTempPrice(0);
              setTempDownPayment(0);
              setTempInstallments(1);
              setCartItems([]);
              setSelectedProductId('');
              setItemPrice(0);
            }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nova Venda
          </button>
        </div>
      </div>

      {(isAdding || editingSale) && (
        <div key={editingSale ? `edit-${editingSale.id}` : 'add'} className="bg-card border rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {editingSale ? 'Editar Venda & Produtos' : 'Registrar Nova Venda'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Selecione os produtos comprados pelo cliente. O valor total é calculado automaticamente.
              </p>
            </div>
          </div>

          <form onSubmit={editingSale ? handleUpdate : handleAdd} className="space-y-6">
            {/* Multi-Product Cart Section */}
            <div className="bg-muted/30 border border-border/80 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <ShoppingCart className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      Aparelhos & Produtos da Venda ({cartItems.length} {cartItems.length === 1 ? 'item selecionado' : 'itens selecionados'})
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Adicione 1, 2, 3 ou mais celulares, consoles ou mimos para este mesmo cliente.
                    </p>
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <div className="flex items-center gap-2 bg-background/80 px-3 py-1.5 rounded-lg border">
                    <span className="text-xs font-semibold text-muted-foreground">Total Produtos:</span>
                    <span className="text-sm font-black text-emerald-500 font-mono">
                      {formatBRL(cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0))}
                    </span>
                  </div>
                )}
              </div>

              {/* Selector Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-card p-3.5 rounded-xl border border-border/50 shadow-xs">
                {/* Category Selector */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">1. Tipo do Produto</label>
                  <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-lg border">
                    <button
                      type="button"
                      onClick={() => { setSelectedProductType('iphone'); setSelectedProductId(''); setItemPrice(0); }}
                      className={cn(
                        "text-[11px] font-bold py-1.5 rounded transition flex items-center justify-center gap-1 cursor-pointer",
                        selectedProductType === 'iphone' ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      iPhone
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedProductType('console'); setSelectedProductId(''); setItemPrice(0); }}
                      className={cn(
                        "text-[11px] font-bold py-1.5 rounded transition flex items-center justify-center gap-1 cursor-pointer",
                        selectedProductType === 'console' ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Gamepad2 className="h-3.5 w-3.5" />
                      Games
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedProductType('gift'); setSelectedProductId(''); setItemPrice(0); }}
                      className={cn(
                        "text-[11px] font-bold py-1.5 rounded transition flex items-center justify-center gap-1 cursor-pointer",
                        selectedProductType === 'gift' ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Gift className="h-3.5 w-3.5" />
                      Mimo
                    </button>
                  </div>
                </div>

                {/* Product Dropdown */}
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">
                    2. Selecionar {selectedProductType === 'iphone' ? 'iPhone / Celular' : (selectedProductType === 'console' ? 'Console / TV / Eletro' : 'Acessório / Mimo')}
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={handleProductSelectChange}
                    className="w-full p-2 rounded-lg border bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">Selecione um produto do estoque...</option>
                    {selectedProductType === 'iphone' && availableIphones.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.model} - {i.storage} ({i.color}) — {formatBRL(Number(i.sell_price || 0))} {i.status === 'vendido' ? '(Vendido)' : ''}
                      </option>
                    ))}
                    {selectedProductType === 'console' && availableConsoles.map(c => {
                      const cat = c.category === 'tv' ? 'TV' : (c.category === 'rice_cooker' ? 'Panela' : (c.category === 'outro' ? 'Eletro' : 'Console'));
                      return (
                        <option key={c.id} value={c.id}>
                          [{cat}] {c.model} - {c.version} — {formatBRL(Number(c.sell_price || 0))} {c.status === 'vendido' ? '(Vendido)' : ''}
                        </option>
                      );
                    })}
                    {selectedProductType === 'gift' && availableGifts.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} — {formatBRL(Number(g.sell_price || 0))} {g.status === 'vendido' ? '(Vendido)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Individual Item Price */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">3. Preço Unitário</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemPrice || ''}
                    placeholder="R$ 0,00"
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border bg-background text-xs font-mono font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Add to Cart Button */}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!selectedProductId}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs py-2 px-3 rounded-lg transition cursor-pointer shadow flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    + Adicionar à Venda
                  </button>
                </div>
              </div>

              {/* Cart Items List */}
              {cartItems.length === 0 ? (
                <div className="border border-dashed border-border/80 rounded-xl p-6 text-center text-xs text-muted-foreground bg-background/50 space-y-1">
                  <ShoppingCart className="h-6 w-6 mx-auto mb-1 text-muted-foreground/50" />
                  <p className="font-semibold text-foreground">Nenhum aparelho adicionado ainda</p>
                  <p>Escolha um iPhone ou Videogame acima e clique em <strong>"+ Adicionar à Venda"</strong>. Você pode adicionar quantos itens quiser!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Itens Vinculados a esta Nota/Venda:</span>
                    <span className="text-emerald-500 font-bold">{cartItems.length} aparelho(s)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cartItems.map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className="flex items-center justify-between p-3 rounded-xl border bg-background text-xs shadow-xs hover:border-primary/50 transition"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0 mr-2">
                          <span className={cn(
                            "p-2 rounded-lg shrink-0",
                            item.type === 'iphone' ? "bg-blue-500/10 text-blue-500" : (item.type === 'console' ? "bg-purple-500/10 text-purple-500" : "bg-amber-500/10 text-amber-500")
                          )}>
                            {item.type === 'iphone' ? <Smartphone className="h-4 w-4" /> : (item.type === 'console' ? <Gamepad2 className="h-4 w-4" /> : <Gift className="h-4 w-4" />)}
                          </span>
                          <div className="truncate flex-1 min-w-0">
                            <div className="font-bold text-foreground truncate">{item.name}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-muted-foreground font-semibold shrink-0">Preço R$:</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => {
                                  const newPrice = Number(e.target.value);
                                  const updated = cartItems.map((ci, iIdx) => iIdx === idx ? { ...ci, price: newPrice } : ci);
                                  setCartItems(updated);
                                  const newTotal = updated.reduce((sum, ci) => sum + (ci.price * (ci.quantity || 1)), 0);
                                  setTempPrice(newTotal);
                                }}
                                className="w-24 p-0.5 px-1.5 text-xs border rounded font-mono font-bold text-emerald-600 bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer shrink-0 ml-1"
                          title="Remover produto da venda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sale Financial and Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="space-y-2 md:col-span-2 bg-muted/20 border border-border/60 p-3 rounded-xl">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold flex items-center gap-1.5">
                    Cliente {editingSale && getSaleClient(editingSale, clients)?.name && (
                      <span className="text-xs text-primary font-medium">
                        ({getSaleClient(editingSale, clients)?.name})
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewClient(!isCreatingNewClient);
                      setNewClientName('');
                      setNewClientPhone('');
                      setNewClientCpf('');
                    }}
                    className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {isCreatingNewClient ? '← Selecionar da Lista' : '+ Novo Cliente Rápido'}
                  </button>
                </div>

                {isCreatingNewClient ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Nome do Cliente *</label>
                      <input
                        type="text"
                        placeholder="Nome completo..."
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        required={isCreatingNewClient}
                        className="w-full p-2 border rounded-md text-xs bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        className="w-full p-2 border rounded-md text-xs bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">CPF</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={newClientCpf}
                        onChange={(e) => setNewClientCpf(e.target.value)}
                        className="w-full p-2 border rounded-md text-xs bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <select 
                    name="client_id" 
                    value={selectedClientId} 
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required={!isCreatingNewClient}
                    className="w-full p-2 border rounded-md bg-background text-sm font-medium"
                  >
                    <option value="">Selecione um cliente cadastrado...</option>
                    {(() => {
                      const activeClient = editingSale ? getSaleClient(editingSale, clients) : null;
                      if (activeClient && activeClient.id && !clients.some(c => String(c.id) === String(activeClient.id))) {
                        return (
                          <option value={String(activeClient.id)}>
                            {activeClient.name} {activeClient.phone ? `(${activeClient.phone})` : ''}
                          </option>
                        );
                      }
                      return null;
                    })()}
                    {clients.map(c => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Valor Total da Venda</label>
                  {cartItems.length > 0 && (
                    <span className="text-[10px] text-emerald-500 font-bold font-mono">Calculado</span>
                  )}
                </div>
                <input 
                  name="sell_price" 
                  value={tempPrice || ''} 
                  type="number" 
                  step="0.01" 
                  required 
                  className="w-full p-2 border rounded-md font-bold font-mono text-emerald-500" 
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
                  className="w-full p-2 border rounded-md font-mono" 
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
                    defaultValue={editingSale?.first_installment_date ? format(parseLocalDate(editingSale.first_installment_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')} 
                    required 
                    className="w-full p-2 border rounded-md bg-background" 
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <button 
                type="button" 
                onClick={() => {
                  setIsAdding(false);
                  setEditingSale(null);
                  setSelectedClientId('');
                  setIsCreatingNewClient(false);
                  setNewClientName('');
                  setNewClientPhone('');
                  setNewClientCpf('');
                  setCartItems([]);
                }} 
                className="bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-md font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={cartItems.length === 0}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-5 py-2 rounded-md font-bold transition cursor-pointer shadow"
              >
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
                const client = getSaleClient(sale, clients);
                const iphone = iphones.find(i => i.id === sale.iphone_id) || (
                  (sale.id === '7ab8846f-1d26-4591-908c-b8fa6742edfb' || (client?.name || sale.client_name || '').toLowerCase().includes('paula'))
                    ? iphones.find(i => i.id === '089025de-e939-432c-8204-29f95ed02821' || i.model?.toLowerCase().includes('poco x6'))
                    : (
                      (sale.id === 'd9d66639-2db6-4991-9074-39d019d80097' || ((client?.name || sale.client_name || '').toLowerCase().includes('yuri') && Number(sale.sell_price) === 1950))
                        ? iphones.find(i => i.id === '6a34a484-559e-47ea-b9b7-bf3d5819f81b' || i.model?.toLowerCase().includes('moto g86'))
                        : undefined
                    )
                );
                const consoleObj = consoles.find(c => c.id === sale.console_id);
                const profit = db.getProfit(sale, iphones, consoles);
                const remaining = sale.sell_price - (sale.down_payment || 0);

                // Installments and Payments calculation
                const isInstallmentSale = sale.installments && sale.installments > 1;
                let customPayments: Record<number, number> = {};
                let hasCustomPayments = false;
                
                if (sale.custom_payments) {
                  try {
                    customPayments = (typeof sale.custom_payments === 'string' 
                      ? JSON.parse(sale.custom_payments) 
                      : sale.custom_payments) as Record<number, number>;
                    hasCustomPayments = Object.keys(customPayments).length > 0;
                  } catch (e) {
                    window.console.error(e);
                  }
                }
                
                if (!hasCustomPayments) {
                  const storedPaymentsStr = localStorage.getItem(`inst_payments_${sale.id}`);
                  if (storedPaymentsStr) {
                    try {
                      customPayments = JSON.parse(storedPaymentsStr) as Record<number, number>;
                      hasCustomPayments = true;
                    } catch (e) {
                      window.console.error(e);
                    }
                  }
                }
                
                if (!hasCustomPayments && isInstallmentSale) {
                  const totalAmount = sale.sell_price - (sale.down_payment || 0);
                  const totalInst = sale.installments || 1;
                  const installmentValue = totalAmount / totalInst;
                  for (let i = 1; i <= totalInst; i++) {
                    customPayments[i] = i <= (sale.installments_paid || 0) ? installmentValue : 0;
                  }
                }

                const calculatedList = isInstallmentSale ? getCalculatedInstallments(sale, customPayments) : [];
                const nextPending = isInstallmentSale ? calculatedList.find(inst => inst.status === 'pending') : null;
                const isFullySettled = isInstallmentSale ? !nextPending : false;

                const totalInstsCount = isInstallmentSale ? (hasCustomPayments ? calculatedList.length : sale.installments) : 1;
                const paidInstsCount = isInstallmentSale 
                  ? (hasCustomPayments ? calculatedList.filter(inst => inst.status === 'fully_paid').length : (sale.installments_paid || 0))
                  : 0;

                const remainingAmount = isInstallmentSale 
                  ? Number((hasCustomPayments 
                      ? Math.max(0, sale.sell_price - (sale.down_payment || 0) - Object.values(customPayments).reduce((s, v) => s + (v || 0), 0))
                      : Math.max(0, sale.sell_price - (sale.down_payment || 0) - ((sale.installments_paid || 0) * ((sale.sell_price - (sale.down_payment || 0)) / sale.installments)))
                    ).toFixed(2))
                  : 0;

                const saleItemName = iphone ? `${iphone.model} ${iphone.storage}` : (consoleObj ? `${consoleObj.model} - ${consoleObj.version}` : 'Aparelho');

                return (
                  <tr key={sale.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{format(parseLocalDate(sale.sale_date), 'dd/MM/yyyy')}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {sale.items && Array.isArray(sale.items) && sale.items.length > 0 ? (
                        <div className="space-y-1">
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded mr-1.5 inline-block">
                            {sale.items.length} {sale.items.length === 1 ? 'aparelho' : 'aparelhos'}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {sale.items.map(it => it.name).join(' + ')}
                          </span>
                        </div>
                      ) : (
                        iphone ? `${iphone.model} ${iphone.storage}` : (consoleObj ? `${consoleObj.category === 'tv' ? '[TV] ' : (consoleObj.category === 'rice_cooker' ? '[Panela] ' : (consoleObj.category === 'outro' ? '[Eletro] ' : ''))}${consoleObj.model} - ${consoleObj.version}` : 'N/A')
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {client?.name || sale.client_name || sale.client?.name ? (
                            client?.name || sale.client_name || sale.client?.name
                          ) : (
                            <span className="text-muted-foreground font-medium">
                              Cliente Geral
                            </span>
                          )}
                        </span>
                        {!client?.name && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSale(sale);
                              setIsAdding(false);
                              const sc = getSaleClient(sale, clients);
                              setSelectedClientId(sc?.id ? String(sc.id) : (sale.client_id ? String(sale.client_id) : ''));
                              setIsCreatingNewClient(false);
                              setNewClientName('');
                              setNewClientPhone('');
                              setNewClientCpf('');
                              setTempPrice(sale.sell_price);
                              setTempDownPayment(sale.down_payment || 0);
                              setTempInstallments(sale.installments || 1);
                              if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
                                setCartItems(sale.items);
                              } else {
                                const existingItems = [];
                                if (sale.iphone_id) {
                                  const found = iphones.find(i => i.id === sale.iphone_id);
                                  if (found) {
                                    existingItems.push({
                                      type: 'iphone' as const,
                                      id: found.id,
                                      name: `iPhone ${found.model} - ${found.storage} (${found.color})`,
                                      price: Number(sale.sell_price),
                                      quantity: 1,
                                      cost_price: Number(found.buy_price || 0)
                                    });
                                  }
                                } else if (sale.console_id) {
                                  const found = consoles.find(c => c.id === sale.console_id);
                                  if (found) {
                                    existingItems.push({
                                      type: 'console' as const,
                                      id: found.id,
                                      name: `[Console] ${found.model} - ${found.version}`,
                                      price: Number(sale.sell_price),
                                      quantity: 1,
                                      cost_price: Number(found.buy_price || 0)
                                    });
                                  }
                                }
                                setCartItems(existingItems);
                              }
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-[11px] bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold px-2 py-0.5 rounded-md transition-colors w-fit my-1 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> + Add Cliente
                          </button>
                        )}
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
                                  // Direct Supabase lookup for this sale ID
                                  const { data: supaData } = await supabase
                                    .from('public_sales')
                                    .select('*')
                                    .eq('id', sale.id)
                                    .maybeSingle();

                                  const sigData = supaData?.signature_data || supaData?.sale_data?.signatureInfo?.signature_data;
                                  const sigAt = supaData?.signed_at || supaData?.sale_data?.signatureInfo?.signed_at;
                                  const sigIp = supaData?.signed_ip || supaData?.sale_data?.signatureInfo?.signed_ip;

                                  if (sigData || sigAt) {
                                    try {
                                      await supabase.from('sales').update({
                                        signature_data: sigData,
                                        signed_at: sigAt,
                                        signed_ip: sigIp
                                      }).eq('id', sale.id);
                                    } catch (e) {}

                                    // Update local cache
                                    const localSales = JSON.parse(localStorage.getItem('db_fallback_sales') || '[]');
                                    const updated = localSales.map((s: any) => s.id === sale.id ? { ...s, signature_data: sigData, signed_at: sigAt, signed_ip: sigIp } : s);
                                    localStorage.setItem('db_fallback_sales', JSON.stringify(updated));
                                    
                                    toast.success('Assinatura localizada e vinculada!', { id: toastId });
                                  } else {
                                    toast.info('Assinatura ainda não realizada pelo cliente.', { id: toastId });
                                  }

                                  await queryClient.invalidateQueries({ queryKey: ['sales'] });
                                } catch (e) {
                                  toast.error('Erro na busca de assinatura.', { id: toastId });
                                }
                              }}
                              className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors cursor-pointer"
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
                        {isInstallmentSale && (
                          <div className="text-xs text-muted-foreground block space-y-1 mt-1">
                            <span className="block font-medium">{sale.installments}x {sale.installment_frequency === 'Semanal' ? 'Semanal' : (sale.installment_frequency === 'Quinzenal' ? 'Quinzenal' : 'Mensal')}</span>
                            <span className="block font-semibold text-amber-700 dark:text-amber-400">
                              Saldo Devedor: {formatBRL(remainingAmount)}
                            </span>
                            {nextPending ? (
                              <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5" title={`Próxima Parcela (${nextPending.index}ª)`}>
                                <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                Próxima Parcela: {format(nextPending.dueDate, 'dd/MM/yyyy')}
                              </span>
                            ) : (
                              <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5" title="Sem parcelas pendentes">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                Quitada
                              </span>
                            )}
                            {sale.first_installment_date && (
                              <span className="block text-[10px]">
                                {nextPending ? (
                                  `${nextPending.index}ª parc: ${format(nextPending.dueDate, 'dd/MM/yyyy')}`
                                ) : (
                                  `1ª parc: ${format(parseLocalDate(sale.first_installment_date), 'dd/MM/yyyy')}`
                                )}
                              </span>
                            )}
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
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            if (!client?.phone) {
                              toast.error('Cliente desta venda não possui telefone cadastrado.');
                              return;
                            }
                            setStatusClientData({
                              name: client?.name || 'Cliente',
                              phone: client.phone,
                              itemName: saleItemName
                            });
                            setStatusDefaultType('order_preparing');
                            setStatusModalOpen(true);
                          }}
                          className="bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all p-1.5 rounded-lg text-xs flex items-center gap-1 font-bold cursor-pointer"
                          title="Avisar Cliente via WhatsApp (Preparando, A Caminho, Agradecimento, Cadastro)"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span className="hidden sm:inline">Status</span>
                        </button>
                        <button
                          onClick={() => {
                            setQuitacaoData({
                              sale,
                              client,
                              iphone: iphones.find(i => i.id === sale.iphone_id) || iphone,
                              consoleObj: consoles.find(c => c.id === sale.console_id)
                            });
                            setQuitacaoModalOpen(true);
                          }}
                          className="bg-purple-600/10 text-purple-600 hover:bg-purple-600 hover:text-white transition-all p-1.5 rounded-lg text-xs flex items-center gap-1 font-bold cursor-pointer"
                          title="Gerar / Enviar Comprovante de Quitação Integral"
                        >
                          <FileCheck className="h-4 w-4" />
                          <span className="hidden sm:inline">Quitação</span>
                        </button>
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
                            const sc = getSaleClient(sale, clients);
                            setSelectedClientId(sc?.id ? String(sc.id) : (sale.client_id ? String(sale.client_id) : ''));
                            setIsCreatingNewClient(false);
                            setNewClientName('');
                            setNewClientPhone('');
                            setNewClientCpf('');
                            setTempPrice(sale.sell_price);
                            setTempDownPayment(sale.down_payment || 0);
                            setTempInstallments(sale.installments || 1);
                            if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
                              setCartItems(sale.items);
                            } else {
                              const existingItems = [];
                              if (sale.iphone_id) {
                                const found = iphones.find(i => i.id === sale.iphone_id);
                                existingItems.push({
                                  type: 'iphone' as const,
                                  id: sale.iphone_id,
                                  name: found 
                                    ? `iPhone ${found.model} - ${found.storage} (${found.color})` 
                                    : (sale.iphone?.model ? `iPhone ${sale.iphone.model} - ${sale.iphone.storage || ''}` : (sale.item_name || 'iPhone (Venda Finalizada)')),
                                  price: Number(sale.sell_price),
                                  quantity: 1,
                                  cost_price: Number(found?.buy_price || sale.buy_price || 0)
                                });
                              } else if (sale.console_id) {
                                const found = consoles.find(c => c.id === sale.console_id);
                                existingItems.push({
                                  type: 'console' as const,
                                  id: sale.console_id,
                                  name: found 
                                    ? `[Console] ${found.model} - ${found.version}` 
                                    : (sale.console?.model ? `[Console] ${sale.console.model} - ${sale.console.version || ''}` : (sale.item_name || 'Console (Venda Finalizada)')),
                                  price: Number(sale.sell_price),
                                  quantity: 1,
                                  cost_price: Number(found?.buy_price || sale.buy_price || 0)
                                });
                              }
                              setCartItems(existingItems);
                            }
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
        const iphone = iphones.find(i => i.id === sale.iphone_id) || (
          (sale.id === '7ab8846f-1d26-4591-908c-b8fa6742edfb' || (client?.name || sale.client_name || '').toLowerCase().includes('paula'))
            ? iphones.find(i => i.id === '089025de-e939-432c-8204-29f95ed02821' || i.model?.toLowerCase().includes('poco x6'))
            : (
              (sale.id === 'd9d66639-2db6-4991-9074-39d019d80097' || ((client?.name || sale.client_name || '').toLowerCase().includes('yuri') && Number(sale.sell_price) === 1950))
                ? iphones.find(i => i.id === '6a34a484-559e-47ea-b9b7-bf3d5819f81b' || i.model?.toLowerCase().includes('moto g86'))
                : undefined
            )
        );
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setQuitacaoData({
                        sale,
                        client,
                        iphone,
                        consoleObj
                      });
                      setQuitacaoModalOpen(true);
                    }}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow border border-emerald-500/40"
                    title="Emitir Comprovante de Quitação Integral"
                  >
                    <FileCheck className="h-4 w-4 text-emerald-200" />
                    <span>Termo de Quitação</span>
                  </button>
                  <button 
                    onClick={() => setSelectedSaleForInstallments(null)} 
                    className="text-emerald-200 hover:text-white transition-colors text-xl font-semibold bg-emerald-900/40 p-1.5 rounded-full"
                  >
                    &times;
                  </button>
                </div>
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <h5 className="font-bold text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                          Lançar e Distribuir Pagamento Rápido
                        </h5>
                        <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                          Digite um valor recebido. O sistema irá preencher automaticamente as parcelas de forma inteligente.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const calculated = getCalculatedInstallments(sale, customInstallmentPayments);
                          const maxIdx = calculated.length > 0 ? Math.max(...calculated.map(i => i.index)) : totalInst;
                          const nextIdx = maxIdx + 1;
                          setCustomInstallmentPayments(prev => ({
                            ...prev,
                            [nextIdx]: 0
                          }));
                          toast.success(`Parcela ${nextIdx} adicionada ao carnê com sucesso!`);
                        }}
                        className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm active:scale-95 self-start sm:self-auto"
                        title="Adicionar mais uma parcela ao carnê"
                      >
                        <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Adicionar Parcela</span>
                      </button>
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-sm active:scale-95"
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
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Cronograma e Valores Pagos</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const calculated = getCalculatedInstallments(sale, customInstallmentPayments);
                          const maxIdx = calculated.length > 0 ? Math.max(...calculated.map(i => i.index)) : totalInst;
                          const nextIdx = maxIdx + 1;
                          setCustomInstallmentPayments(prev => ({
                            ...prev,
                            [nextIdx]: 0
                          }));
                          toast.success(`Parcela ${nextIdx} adicionada ao carnê!`);
                        }}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        title="Adicionar parcela extra"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Adicionar Parcela</span>
                      </button>
                    </div>
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
                                <span className="font-semibold text-xs flex items-center gap-1.5">
                                  {inst.index}ª Parcela 
                                  {inst.index > totalInst && (
                                    <span className="text-[9px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                                      Adicionada
                                    </span>
                                  )}
                                  {inst.index > totalInst && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCustomInstallmentPayments(prev => {
                                          const next = { ...prev };
                                          delete next[inst.index];
                                          return next;
                                        });
                                        toast.info(`Parcela ${inst.index} removida.`);
                                      }}
                                      className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                                      title={`Remover ${inst.index}ª parcela`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
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
                    
                    updateInstallmentsMutation.mutate({ 
                      id: sale.id, 
                      installments_paid: countPaid,
                      custom_payments: JSON.stringify(customInstallmentPayments)
                    });
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

      {/* MODAL DE NOTIFICAÇÃO WHATSAPP */}
      <WhatsAppStatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        clientName={statusClientData?.name || ''}
        clientPhone={statusClientData?.phone || ''}
        itemName={statusClientData?.itemName || ''}
        defaultStatusType={statusDefaultType}
      />

      {/* MODAL DE QUITAÇÃO INTEGRAL */}
      <QuitacaoModal
        isOpen={quitacaoModalOpen}
        onClose={() => {
          setQuitacaoModalOpen(false);
          setQuitacaoData(null);
        }}
        sale={quitacaoData?.sale}
        client={quitacaoData?.client}
        iphone={quitacaoData?.iphone}
        consoleObj={quitacaoData?.consoleObj}
      />
    </div>
  );
}
