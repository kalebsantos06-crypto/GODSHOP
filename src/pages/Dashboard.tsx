import React from 'react';
import { db } from '../services/db';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Smartphone, ShoppingCart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/shared/StatCard';
import { formatBRL } from '../lib/formatCurrency';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
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
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm sm:text-base font-medium">Bem-vindo de volta! Aqui está o resumo do seu negócio.</p>
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
