import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Smartphone, ShoppingCart, TrendingUp, RefreshCw, Sparkles, Quote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/shared/StatCard';
import { formatBRL } from '../lib/formatCurrency';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [tip, setTip] = useState<string>('');
  const [loadingTip, setLoadingTip] = useState(false);

  const fetchTip = React.useCallback(async () => {
    setLoadingTip(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        setTip('Mantenha seu estoque sempre atualizado e foque no atendimento personalizado para fidelizar seus clientes!');
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Dê uma dica curta, prática e motivadora para um dono de loja de iPhones, celulares e games. Varie muito os temas: vendas, estoque, marketing, atendimento ou mentalidade. Ocasionalmente, cite ou se inspire em grandes empreendedores de sucesso (ex: Steve Jobs, Jeff Bezos, Flávio Augusto, etc). Responda em português, seja direto e impactante. Máximo 180 caracteres.",
      });
      setTip(response.text || 'Mantenha seu estoque sempre atualizado e foque no atendimento personalizado para fidelizar seus clientes!');
    } catch (error) {
      console.error('Erro ao buscar dica:', error);
      setTip('A inovação é o segredo do sucesso. Esteja sempre atento às novidades do mundo mobile e games!');
    } finally {
      setLoadingTip(false);
    }
  }, []);

  useEffect(() => {
    fetchTip();
  }, [fetchTip]);

  const { data: iphones = [], isLoading: isLoadingIphones } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  const { data: consoles = [], isLoading: isLoadingConsoles } = useQuery({
    queryKey: ['consoles'],
    queryFn: () => db.consoles.list(),
  });

  const { data: sales = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
  });

  const availableIphones = iphones.filter(p => p.status === 'disponivel');
  const availableConsoles = consoles.filter(p => p.status === 'disponivel');
  const availableCount = availableIphones.length + availableConsoles.length;
  
  const soldIphones = iphones.filter(p => p.status === 'vendido');
  const soldConsoles = consoles.filter(p => p.status === 'vendido');
  const soldCount = soldIphones.length + soldConsoles.length;
  
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
    return {
      label,
      value: formatBRL(sale.sell_price - buyPrice),
      sublabel: format(new Date(sale.sale_date), 'dd/MM')
    };
  });

  const salesPreview = sales.slice(0, 3).map(sale => {
    let label = 'Venda';
    if (sale.iphone_id) {
      const item = iphones.find(i => i.id === sale.iphone_id);
      label = item ? `${item.model}` : 'iPhone';
    } else if (sale.console_id) {
      const item = consoles.find(c => c.id === sale.console_id);
      label = item ? `${item.model}` : 'Console';
    }
    return {
      label,
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

  if (isLoadingIphones || isLoadingSales || isLoadingConsoles) {
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
              <button 
                onClick={fetchTip} 
                disabled={loadingTip}
                className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-300 disabled:opacity-50 active:scale-90"
                title="Nova dica"
              >
                <RefreshCw className={cn("h-4 w-4 text-muted-foreground/60 hover:text-primary", loadingTip && "animate-spin")} />
              </button>
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Lucro Total" value={formatBRL(totalProfit)} icon={DollarSign} color="green" preview={profitPreview} />
        <StatCard title="Vendas Realizadas" value={soldCount} icon={ShoppingCart} color="primary" preview={salesPreview} />
        <StatCard title="Em Estoque" value={availableCount} icon={Smartphone} color="yellow" preview={stockPreview} />
        <StatCard title="Lucro Médio" value={formatBRL(sales.length ? totalProfit / sales.length : 0)} icon={TrendingUp} color="primary" preview={avgProfitPreview} />
      </div>

      <Card className="border-none shadow-xl bg-background/60 backdrop-blur-md overflow-hidden">
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
  );
}
