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

  const { data: sales = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
  });

  const availableCount = iphones.filter(p => p.status === 'disponivel').length;
  const soldCount = iphones.filter(p => p.status === 'vendido').length;
  
  // Calculate profit
  const totalProfit = sales.reduce((sum, sale) => {
    const iphone = iphones.find(i => i.id === sale.iphone_id);
    if (iphone) {
      return sum + (sale.sell_price - iphone.buy_price);
    }
    return sum;
  }, 0);

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
      const iphone = iphones.find(i => i.id === sale.iphone_id);
      return sum + (iphone ? sale.sell_price - iphone.buy_price : 0);
    }, 0);
    return {
      name: format(month, 'MMM', { locale: ptBR }),
      lucro: profit,
    };
  });

  if (isLoadingIphones || isLoadingSales) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Lucro Total" value={formatBRL(totalProfit)} icon={DollarSign} color="green" />
        <StatCard title="Vendas Realizadas" value={soldCount} icon={ShoppingCart} color="primary" />
        <StatCard title="Em Estoque" value={availableCount} icon={Smartphone} color="yellow" />
        <StatCard title="Lucro Médio" value={formatBRL(sales.length ? totalProfit / sales.length : 0)} icon={TrendingUp} color="primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lucro Mensal</CardTitle>
        </CardHeader>
        <CardContent>
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
