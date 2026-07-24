import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Smartphone, ShoppingCart, TrendingUp, RefreshCw, Sparkles, Quote, Database, AlertTriangle, CheckCircle2, Coins, Package, ShieldCheck, MessageSquare, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/shared/StatCard';
import { formatBRL } from '../lib/formatCurrency';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addDays, addMonths, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '../lib/dateUtils';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const queryClient = useQueryClient();

  const { data: tip, isLoading: loadingTip, refetch: refetchTip } = useQuery({
    queryKey: ['dailyTip'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/dailytip');
        const contentType = response.headers.get('content-type');
        if (!response.ok || !contentType || !contentType.includes('application/json')) {
          return 'Mantenha seu estoque sempre atualizado e foque no atendimento personalizado para fidelizar seus clientes!';
        }
        const data = await response.json();
        return data.tip || 'Mantenha seu estoque sempre atualizado e foque no atendimento personalizado para fidelizar seus clientes!';
      } catch (error) {
        console.log('Dica do dia (local): carregando dica padrão integrada.');
        return 'A inovação é o segredo do sucesso. Esteja sempre atento às novidades do mundo mobile e games!';
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: iphones = [], isLoading: isLoadingIphones, refetch: refetchIphones } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const { data: consoles = [], isLoading: isLoadingConsoles, refetch: refetchConsoles } = useQuery({
    queryKey: ['consoles'],
    queryFn: () => db.consoles.list(),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const { data: sales = [], isLoading: isLoadingSales, refetch: refetchSales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
    refetchOnMount: 'always',
    staleTime: 0,
    // Polling: Refetch every 15 seconds if there are pending signatures
    refetchInterval: (query) => {
      const salesData = query.state.data as any[];
      if (salesData && salesData.some(s => !s.signature_data && !s.signed_at)) {
        return 15000;
      }
      return false;
    }
  });

  const { data: clients = [], isLoading: isLoadingClients, refetch: refetchClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const handleRefreshAll = () => {
    refetchIphones();
    refetchConsoles();
    refetchSales();
    refetchClients();
    refetchTip();
    toast.success('Dados atualizados!');
  };

  const availableIphones = iphones.filter(p => p.status === 'disponivel');
  const availableConsoles = consoles.filter(p => p.status === 'disponivel');
  const availableCount = availableIphones.length + availableConsoles.length;
  
  const soldCount = sales.length;
  
  // Calculate profit
  const totalProfit = sales.reduce((sum, sale) => {
    let buyPrice = 0;
    if (sale.iphone_id) {
      const iphone = iphones.find(i => i.id === sale.iphone_id);
      if (iphone) buyPrice = iphone.buy_price;
    } else if (sale.console_id) {
      const consoleItem = consoles.find(c => c.id === sale.console_id);
      if (consoleItem) buyPrice = consoleItem.buy_price;
    }
    return sum + (sale.sell_price - buyPrice);
  }, 0);

  // Calculate revenue (Faturamento)
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.sell_price, 0);

  // Calculate stock cost (Investimento)
  const totalStockCost = availableIphones.reduce((sum, i) => sum + i.buy_price, 0) +
                         availableConsoles.reduce((sum, c) => sum + c.buy_price, 0);

  // Detailed Financial Calculations
  const totalReceived = sales.reduce((sum, sale) => {
    const downPayment = sale.down_payment || 0;
    const totalAmount = sale.sell_price - downPayment;
    
    if (sale.installments && sale.installments > 1) {
      // Check localStorage for custom payments (same logic as in Sales.tsx)
      const storedPaymentsStr = localStorage.getItem(`inst_payments_${sale.id}`);
      if (storedPaymentsStr) {
        try {
          const customPayments = JSON.parse(storedPaymentsStr) as Record<number, number>;
          const totalPaidFromCustom = Object.values(customPayments).reduce<number>((sum, val) => sum + (Number(val) || 0), 0);
          return sum + downPayment + totalPaidFromCustom;
        } catch (e) {
          // Fallback if JSON is invalid
        }
      }
      
      const totalInstallments = sale.installments || 1;
      const installmentsPaid = sale.installments_paid || 0;
      const installmentValue = totalAmount / totalInstallments;
      return sum + downPayment + (installmentsPaid * installmentValue);
    }
    
    // For 1 installment, we assume it's fully paid (cash/pix/card)
    return sum + sale.sell_price;
  }, 0);

  const totalRemainingBalance = totalRevenue - totalReceived;
  
  const signedSales = sales.filter(s => s.signature_data || s.signed_at).length;
  const pendingSales = sales.length - signedSales;
  const signatureRate = sales.length ? (signedSales / sales.length) * 100 : 0;

  const totalBuyPriceOfSoldItems = sales.reduce((sum, sale) => {
    let buyPrice = 0;
    if (sale.iphone_id) {
      const iphone = iphones.find(i => i.id === sale.iphone_id);
      if (iphone) buyPrice = iphone.buy_price;
    } else if (sale.console_id) {
      const consoleItem = consoles.find(c => c.id === sale.console_id);
      if (consoleItem) buyPrice = consoleItem.buy_price;
    }
    return sum + buyPrice;
  }, 0);

  // Previews
  const profitPreview = sales.slice(0, 3).map(sale => {
    let label = 'Venda';
    let buyPrice = 0;
    if (sale.iphone_id) {
      const item = iphones.find(i => i.id === sale.iphone_id);
      label = item ? `${item.model} ${item.storage}` : 'iPhone';
      buyPrice = item?.buy_price || 0;
    } else if (sale.console_id) {
      const item = consoles.find(c => c.id === sale.console_id);
      label = item ? `${item.model} ${item.version}` : 'Console';
      buyPrice = item?.buy_price || 0;
    }
    const client = clients.find(c => c.id === sale.client_id);
    const clientDisplay = client ? `${client.name.split(' ')[0]} (${label})` : label;
    return {
      label: clientDisplay,
      value: formatBRL(sale.sell_price - buyPrice),
      sublabel: format(parseLocalDate(sale.sale_date), 'dd/MM')
    };
  });

  const revenuePreview = sales.slice(0, 3).map(sale => {
    let label = 'Venda';
    if (sale.iphone_id) {
      const item = iphones.find(i => i.id === sale.iphone_id);
      label = item ? `${item.model} ${item.storage}` : 'iPhone';
    } else if (sale.console_id) {
      const item = consoles.find(c => c.id === sale.console_id);
      label = item ? `${item.model} ${item.version}` : 'Console';
    }
    const client = clients.find(c => c.id === sale.client_id);
    const clientDisplay = client ? `${client.name.split(' ')[0]} (${label})` : label;
    return {
      label: clientDisplay,
      value: formatBRL(sale.sell_price),
      sublabel: format(parseLocalDate(sale.sale_date), 'dd/MM')
    };
  });

  const stockCostPreview = [...availableIphones, ...availableConsoles]
    .sort((a, b) => b.buy_price - a.buy_price)
    .slice(0, 3)
    .map(item => ({
      label: item.model,
      value: formatBRL(item.buy_price),
      sublabel: 'storage' in item ? item.storage : item.version
    }));

  const salesPreview = sales.slice(0, 3).map(sale => {
    let label = 'Venda';
    if (sale.iphone_id) {
      const item = iphones.find(i => i.id === sale.iphone_id);
      label = item ? `${item.model}` : 'iPhone';
    } else if (sale.console_id) {
      const item = consoles.find(c => c.id === sale.console_id);
      label = item ? `${item.model}` : 'Console';
    }
    const client = clients.find(c => c.id === sale.client_id);
    const clientDisplay = client ? `${client.name.split(' ')[0]} (${label})` : label;
    return {
      label: clientDisplay,
      value: formatBRL(sale.sell_price),
      sublabel: sale.payment_method
    };
  });

  const stockPreview = [...availableIphones, ...availableConsoles]
    .sort((a, b) => new Date(b.buy_date).getTime() - new Date(a.buy_date).getTime())
    .slice(0, 3)
    .map(item => ({
      label: item.model,
      value: 'Disponível',
      sublabel: 'storage' in item ? item.storage : item.version
    }));

  const avgProfitPreview = Array.from(new Set([...iphones, ...consoles].map(i => i.model)))
    .map(model => {
      const modelSales = sales.filter(s => {
        const item = s.iphone_id ? iphones.find(i => i.id === s.iphone_id) : consoles.find(c => c.id === s.console_id);
        return item?.model === model;
      });
      if (modelSales.length === 0) return null;
      const profit = modelSales.reduce((sum, s) => {
        const item = s.iphone_id ? iphones.find(i => i.id === s.iphone_id) : consoles.find(c => c.id === s.console_id);
        return sum + (s.sell_price - (item?.buy_price || 0));
      }, 0);
      return { model, avg: profit / modelSales.length };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.avg || 0) - (a?.avg || 0))
    .slice(0, 3)
    .map(item => ({
      label: item!.model,
      value: formatBRL(item!.avg),
      sublabel: 'Média por modelo'
    }));

  // Monthly profit data for last 6 months
  const now = new Date();
  const months = eachMonthOfInterval({
    start: subMonths(startOfMonth(now), 5),
    end: startOfMonth(now),
  });

  const monthlyData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthSales = sales.filter(s => {
      const d = new Date(s.sale_date);
      return d >= monthStart && d <= monthEnd;
    });
    const profit = monthSales.reduce((sum, sale) => {
      let buyPrice = 0;
      if (sale.iphone_id) {
        const item = iphones.find(i => i.id === sale.iphone_id);
        if (item) buyPrice = item.buy_price;
      } else if (sale.console_id) {
        const item = consoles.find(c => c.id === sale.console_id);
        if (item) buyPrice = item.buy_price;
      }
      return sum + (sale.sell_price - buyPrice);
    }, 0);
    return {
      name: format(month, 'MMM', { locale: ptBR }),
      lucro: profit,
    };
  });

  const getInstallmentDate = (sale: any, index: number) => {
    const baseDate = sale.first_installment_date ? parseLocalDate(sale.first_installment_date) : parseLocalDate(sale.sale_date);
    const intervalMultiplier = sale.first_installment_date ? (index - 1) : index;
    if (sale.installment_frequency === 'Semanal') {
      return addDays(baseDate, intervalMultiplier * 7);
    } else if (sale.installment_frequency === 'Quinzenal') {
      return addDays(baseDate, intervalMultiplier * 15);
    } else {
      return addMonths(baseDate, intervalMultiplier);
    }
  };

  const getCalculatedInstallments = (
    sale: any,
    customPayments: { [key: number]: number }
  ) => {
    if (!sale) return [];
    const totalAmount = sale.sell_price - (sale.down_payment || 0);
    const baseInstCount = sale.installments || 1;

    const list: {
      index: number;
      expectedAmount: number;
      paidAmount: number;
      dueDate: Date;
      status: 'fully_paid' | 'pending';
    }[] = [];
    
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

    if (remainingUnpaid > 0.01 && unpaidIndices.length === 0) {
      unpaidIndices.push(extraIndex);
    }

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

  const getPendingNotificationsCount = () => {
    let count = 0;
    if (!sales || sales.length === 0) return 0;
    const today = startOfDay(new Date());

    for (const sale of sales) {
      if (!sale.installments || sale.installments <= 1) continue;

      let customPayments: { [key: number]: number } = {};
      try {
        const stored = localStorage.getItem(`inst_payments_${sale.id}`);
        if (stored) {
          customPayments = JSON.parse(stored);
        } else {
          const instAmount = Number(((sale.sell_price - (sale.down_payment || 0)) / sale.installments).toFixed(2));
          for (let i = 1; i <= sale.installments; i++) {
            customPayments[i] = i <= (sale.installments_paid || 0) ? instAmount : 0;
          }
        }
      } catch (e) {
        // Safe fallback
      }

      const calculatedList = getCalculatedInstallments(sale, customPayments);
      for (const inst of calculatedList) {
        if (inst.status === 'pending') {
          const dueDay = startOfDay(inst.dueDate);
          const daysDiff = differenceInDays(dueDay, today);
          if (daysDiff <= 3) {
            count++;
          }
        }
      }
    }
    return count;
  };

  const pendingNotifCount = getPendingNotificationsCount();

  const getUpcomingInstallments = () => {
    const list: any[] = [];
    if (!sales || sales.length === 0) return [];
    const today = startOfDay(new Date());

    for (const sale of sales) {
      if (!sale.installments || sale.installments <= 1) continue;

      let customPayments: { [key: number]: number } = {};
      try {
        const stored = localStorage.getItem(`inst_payments_${sale.id}`);
        if (stored) {
          customPayments = JSON.parse(stored);
        } else {
          const instAmount = Number(((sale.sell_price - (sale.down_payment || 0)) / sale.installments).toFixed(2));
          for (let i = 1; i <= sale.installments; i++) {
            customPayments[i] = i <= (sale.installments_paid || 0) ? instAmount : 0;
          }
        }
      } catch (e) {}

      const calculatedList = getCalculatedInstallments(sale, customPayments);
      const client = clients.find(c => c.id === sale.client_id);
      const iphone = iphones.find(i => i.id === sale.iphone_id);
      const consoleObj = consoles.find(c => c.id === sale.console_id);
      const categoryName = consoleObj ? (consoleObj.category === 'tv' ? 'TV' : (consoleObj.category === 'rice_cooker' ? 'Panela Elétrica' : (consoleObj.category === 'outro' ? 'Eletro' : 'Console'))) : 'Aparelho';
      const itemName = iphone ? `${iphone.model} ${iphone.storage}` : (consoleObj ? `${categoryName} ${consoleObj.model}` : 'Aparelho');

      for (const inst of calculatedList) {
        if (inst.status === 'pending') {
          const dueDay = startOfDay(inst.dueDate);
          const daysDiff = differenceInDays(dueDay, today);
          list.push({
            id: `${sale.id}_inst_${inst.index}`,
            clientName: client?.name || 'Cliente Sem Nome',
            clientPhone: client?.phone ? client.phone.replace(/\D/g, '') : '',
            itemName,
            installmentIndex: inst.index,
            expectedAmount: inst.expectedAmount,
            dueDate: inst.dueDate,
            daysDiff
          });
        }
      }
    }

    return list.sort((a, b) => a.daysDiff - b.daysDiff).slice(0, 3);
  };

  const upcomingInstallments = getUpcomingInstallments();

  if (isLoadingIphones || isLoadingSales || isLoadingConsoles || isLoadingClients) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Banner de Dica Premium */}
      <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 sm:p-6 shadow-2xl transition-all duration-500 hover:bg-white/10">
        {/* Efeito de brilho de fundo */}
        <div className="absolute -right-10 -top-10 h-32 w-32 bg-primary/20 blur-[60px] transition-all duration-700 group-hover:bg-primary/30"></div>
        <div className="absolute -left-10 -bottom-10 h-32 w-32 bg-primary/10 blur-[60px] transition-all duration-700 group-hover:bg-primary/20"></div>
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-[1px] w-4 bg-primary/50"></span>
                <span className="text-[10px] font-black tracking-[0.2em] text-primary uppercase opacity-80">Insight Empreendedor</span>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  to="/settings?tab=automacao"
                  className="relative p-1.5 hover:bg-white/10 rounded-full transition-all duration-300 active:scale-90 flex items-center justify-center text-emerald-400 hover:text-emerald-300"
                  title="Enviar Cobranças / Automação WhatsApp"
                >
                  <MessageSquare className="h-4 w-4" />
                  {pendingNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
                        {pendingNotifCount}
                      </span>
                    </span>
                  )}
                </Link>
                <button 
                  onClick={async () => {
                    const toastId = toast.loading('Sincronizando todas as assinaturas...');
                    try {
                      await queryClient.invalidateQueries({ queryKey: ['sales'] });
                      await refetchSales();
                      toast.success('Assinaturas sincronizadas com o servidor!', { id: toastId });
                    } catch (e) {
                      toast.error('Erro ao sincronizar.', { id: toastId });
                    }
                  }} 
                  disabled={isLoadingSales}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-300 disabled:opacity-50 active:scale-90"
                  title="Sincronizar assinaturas agora"
                >
                  <ShieldCheck className={cn("h-4 w-4 text-emerald-500", isLoadingSales && "animate-pulse")} />
                </button>
                <button 
                  onClick={handleRefreshAll} 
                  disabled={isLoadingSales}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-300 disabled:opacity-50 active:scale-90"
                  title="Atualizar tudo"
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", (isLoadingSales || isLoadingIphones) && "animate-spin")} />
                </button>
                <button 
                  onClick={() => refetchTip()} 
                  disabled={loadingTip}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-300 disabled:opacity-50 active:scale-90"
                  title="Nova dica"
                >
                  <Sparkles className={cn("h-4 w-4 text-muted-foreground/60 hover:text-amber-500", loadingTip && "animate-pulse")} />
                </button>
              </div>
            </div>

            <div className="relative">
              <Quote className="absolute -left-2 -top-2 h-8 w-8 text-primary/10 -z-10 rotate-12" />
              {loadingTip ? (
                <div className="space-y-2 py-1">
                  <div className="h-3 bg-white/10 animate-pulse rounded-full w-full"></div>
                  <div className="h-3 bg-white/10 animate-pulse rounded-full w-2/3"></div>
                </div>
              ) : (
                <p className="text-sm sm:text-base font-medium text-foreground/90 italic leading-relaxed pl-1">
                  {tip}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard title="Lucro Total" value={formatBRL(totalProfit)} icon={DollarSign} color="green" preview={profitPreview} />
        <StatCard title="Faturamento Bruto" value={formatBRL(totalRevenue)} icon={Coins} color="primary" preview={revenuePreview} />
        <StatCard title="Vendas Realizadas" value={soldCount} icon={ShoppingCart} color="primary" preview={salesPreview} />
        <StatCard title="Em Estoque" value={availableCount} icon={Smartphone} color="yellow" preview={stockPreview} />
        <StatCard title="Custo de Estoque" value={formatBRL(totalStockCost)} icon={Package} color="yellow" preview={stockCostPreview} />
        <StatCard title="Lucro Médio" value={formatBRL(sales.length ? totalProfit / sales.length : 0)} icon={TrendingUp} color="primary" preview={avgProfitPreview} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-xl bg-background/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Detalhamento de Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faturamento Bruto</span>
                  <span className="text-sm font-medium">Total Geral de Vendas</span>
                </div>
                <span className="text-lg font-bold text-primary">{formatBRL(totalRevenue)}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Recebido</span>
                  <span className="text-sm font-medium">Entradas + Parcelas Pagas</span>
                </div>
                <span className="text-lg font-bold text-emerald-600">{formatBRL(totalReceived)}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo Pendente</span>
                  <span className="text-sm font-medium">A Receber em Parcelas</span>
                </div>
                <span className="text-lg font-bold text-amber-600">{formatBRL(totalRemainingBalance)}</span>
              </div>

              <div className="pt-2 mt-2 border-t space-y-1">
                <p className="text-[10px] text-muted-foreground italic">
                  * Faturamento Bruto = Soma do preço de venda de todos os itens.
                </p>
                <p className="text-[10px] text-muted-foreground italic">
                  * O Lucro é calculado subtraindo o preço de compra do preço de venda.
                </p>
              </div>

              {upcomingInstallments.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cobranças WhatsApp:</h4>
                    <Link to="/settings?tab=automacao" className="text-[9px] text-primary font-bold hover:underline">
                      Ver tudo →
                    </Link>
                  </div>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {upcomingInstallments.map((inst) => {
                      let diffLabel = '';
                      let diffClass = '';
                      if (inst.daysDiff === 0) {
                        diffLabel = 'Hoje';
                        diffClass = 'text-amber-500 font-bold';
                      } else if (inst.daysDiff === 1) {
                        diffLabel = 'Amanhã';
                        diffClass = 'text-blue-400 font-medium';
                      } else if (inst.daysDiff < 0) {
                        diffLabel = `Atrasada ${Math.abs(inst.daysDiff)}d`;
                        diffClass = 'text-rose-500 font-bold animate-pulse';
                      } else {
                        diffLabel = `Em ${inst.daysDiff}d`;
                        diffClass = 'text-muted-foreground';
                      }

                      return (
                        <div key={inst.id} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/50 text-xs">
                          <div className="flex flex-col min-w-0 flex-1 pr-2">
                            <span className="font-bold truncate">{inst.clientName}</span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {inst.installmentIndex}ª Parc. • {formatBRL(inst.expectedAmount)} • {inst.itemName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn("text-[10px] uppercase", diffClass)}>
                              {diffLabel}
                            </span>
                            {inst.clientPhone ? (
                              <a
                                href={`https://api.whatsapp.com/send?phone=${inst.clientPhone}&text=${encodeURIComponent(
                                  `Olá, *${inst.clientName}*! 😊 Passando para lembrar que a *${inst.installmentIndex}ª Parcela* de *${formatBRL(inst.expectedAmount)}* referente à compra do *${inst.itemName}* ` +
                                  (inst.daysDiff === 0 ? "vence *HOJE*!" : inst.daysDiff === 1 ? "vence *AMANHÃ*!" : inst.daysDiff === 2 ? "vence em *2 DIAS*!" : inst.daysDiff === 3 ? "vence em *3 DIAS*!" : inst.daysDiff === -1 ? "venceu *ONTEM*. Caso já tenha pago, favor desconsiderar." : inst.daysDiff === -2 ? "venceu há *2 DIAS*. Caso já tenha pago, favor desconsiderar." : inst.daysDiff === -3 ? "venceu há *3 DIAS*. Caso já tenha pago, favor desconsiderar." : `venceu em ${format(inst.dueDate, 'dd/MM/yyyy')}. Caso já tenha pago, favor desconsiderar.`) +
                                  ` Se precisar do Pix da GODSHOP, estamos à disposição! 🤍`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors flex items-center justify-center"
                                title="Enviar lembrete via WhatsApp"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-[10px] text-muted-foreground select-none" title="Sem telefone cadastrado">
                                S/ Tel
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 border-none shadow-xl bg-background/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Análise de Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas Assinadas</span>
                  <span className="text-sm font-medium">Contratos Garantidos</span>
                </div>
                <span className="text-lg font-bold text-emerald-600">{signedSales}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendentes</span>
                  <span className="text-sm font-medium">Aguardando Assinatura</span>
                </div>
                <span className="text-lg font-bold text-amber-600">{pendingSales}</span>
              </div>

              <div className="pt-2">
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-muted-foreground">Taxa de Formalização</span>
                  <span className="text-emerald-600">{signatureRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${signatureRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t space-y-1">
                <p className="text-[10px] text-muted-foreground italic">
                  * O sistema sincroniza automaticamente assinaturas coletadas no portal público.
                </p>
                {pendingSales > 0 && (
                  <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Verificação em tempo real ativa
                  </p>
                )}
              </div>

              {pendingSales > 0 && (
                <div className="pt-3 border-t">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Aguardando Cliente:</h4>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {sales.filter(s => !s.signature_data && !s.signed_at).slice(0, 5).map(sale => {
                      const client = clients.find(c => c.id === sale.client_id);
                      return (
                        <div key={sale.id} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/50">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold truncate max-w-[120px]">{client?.name || 'Cliente'}</span>
                            <span className="text-[9px] text-muted-foreground">{format(parseLocalDate(sale.sale_date), 'dd/MM')}</span>
                          </div>
                          <button 
                            onClick={async () => {
                              try {
                                const baseUrl = window.location.origin;
                                const link = `${baseUrl}/assinar/${sale.id}`;
                                await navigator.clipboard.writeText(link);
                                toast.success('Link de assinatura copiado!');
                              } catch (e) {
                                toast.error('Erro ao copiar link');
                              }
                            }}
                            className="p-1.5 hover:bg-primary/10 rounded text-primary transition-colors"
                            title="Copiar link de assinatura"
                          >
                            <Quote className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                    {pendingSales > 5 && (
                      <p className="text-[9px] text-center text-muted-foreground pt-1">
                        + {pendingSales - 5} outras pendências
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 border-none shadow-xl bg-background/60 backdrop-blur-md overflow-hidden">
        <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Desempenho de Lucro Mensal
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                  tickFormatter={(v) => `R$ ${v}`} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [formatBRL(value), 'Lucro']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--card-foreground))'
                  }}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="lucro" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);
}
