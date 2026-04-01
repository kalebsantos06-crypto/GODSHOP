import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';

export default function PriceTable() {
  const { data: iphones = [], isLoading } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  if (isLoading) return <div>Carregando...</div>;

  // Group by model and storage
  const priceMap = iphones.reduce((acc, iphone) => {
    const key = `${iphone.model} - ${iphone.storage}`;
    if (!acc[key]) {
      acc[key] = {
        model: iphone.model,
        storage: iphone.storage,
        minPrice: iphone.buy_price,
        maxPrice: iphone.buy_price,
        count: 1
      };
    } else {
      acc[key].minPrice = Math.min(acc[key].minPrice, iphone.buy_price);
      acc[key].maxPrice = Math.max(acc[key].maxPrice, iphone.buy_price);
      acc[key].count += 1;
    }
    return acc;
  }, {} as Record<string, any>);

  const groupedPrices = Object.values(priceMap).sort((a, b) => a.model.localeCompare(b.model));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tabela de Preços (Custo)</h1>
        <p className="text-muted-foreground text-sm mt-1">Média de preços de compra por modelo e armazenamento</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Armazenamento</th>
                <th className="px-4 py-3 font-medium">Custo Mínimo</th>
                <th className="px-4 py-3 font-medium">Custo Máximo</th>
                <th className="px-4 py-3 font-medium">Aparelhos no Histórico</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupedPrices.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{item.model}</td>
                  <td className="px-4 py-3">{item.storage}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{formatBRL(item.minPrice)}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">{formatBRL(item.maxPrice)}</td>
                  <td className="px-4 py-3">{item.count}</td>
                </tr>
              ))}
              {groupedPrices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum aparelho no histórico para calcular preços.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
