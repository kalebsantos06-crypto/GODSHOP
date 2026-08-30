
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Search, Filter, Info } from 'lucide-react';
import { db } from '../../services/db';

export default function ProductsWithoutInvoice() {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await db.product_units.list();
      // Filter for units without regularized fiscal status
      const irregular = (data || []).filter(u => u.fiscal_status === 'Sem Nota' || !u.fiscal_status);
      setUnits(irregular);
    } catch (err) {
      console.error('Error loading irregular stock:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Produtos sem Nota Fiscal</h1>
          <p className="text-muted-foreground text-sm">Controle de mercadorias que entraram sem documento fiscal de origem.</p>
        </div>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
        <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-500 uppercase tracking-wider">Atenção Fiscal</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Estes produtos foram registrados sem NF de entrada. A regularização destes itens é necessária antes da emissão da NF de saída, dependendo do regime tributário.
          </p>
        </div>
      </div>

      <div className="bg-card/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 text-[10px] uppercase tracking-widest font-black text-muted-foreground border-b border-white/5">
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">IMEI / Serial</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4">Data Entrada</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground animate-pulse">Carregando itens pendentes...</td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-emerald-500 font-bold italic">Tudo regularizado! Nenhum produto sem nota encontrado.</td>
                </tr>
              ) : units.map((item, i) => (
                <tr key={item.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4 font-bold">{item.name}</td>
                  <td className="px-6 py-4 font-mono opacity-70">{item.identifier || 'S/N'}</td>
                  <td className="px-6 py-4">{item.supplier_name || '-'}</td>
                  <td className="px-6 py-4 opacity-70">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 font-black uppercase text-[9px]">
                      Pendente
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button className="p-1.5 hover:bg-muted/30 rounded-lg transition" title="Ver Detalhes">
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
