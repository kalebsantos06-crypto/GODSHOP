
import React from 'react';
import { BarChart3, Receipt, Package, ShoppingCart, AlertCircle } from 'lucide-react';

export default function FiscalDashboard() {
  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Dashboard Fiscal</h1>
          <p className="text-muted-foreground text-sm">Visão geral tributária e de estoque da sua loja.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Notas de Entrada Hoje', value: '12', icon: Receipt, color: 'text-emerald-500' },
          { label: 'Compras Hoje (Fiscal)', value: 'R$ 8.450,00', icon: ShoppingCart, color: 'text-blue-500' },
          { label: 'Aparelhos em Estoque', value: '87', icon: Package, color: 'text-amber-500' },
          { label: 'Pendentes de Nota', value: '7', icon: AlertCircle, color: 'text-red-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-card/50 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black mt-1">{stat.value}</h3>
              </div>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl h-64 flex items-center justify-center">
        <p className="text-muted-foreground italic text-sm">Gráficos de vendas e impostos em desenvolvimento...</p>
      </div>
    </div>
  );
}
