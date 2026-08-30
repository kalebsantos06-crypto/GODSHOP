
import React, { useEffect, useState } from 'react';
import { Archive, Search, Filter, Download, ExternalLink } from 'lucide-react';
import { db } from '../../services/db';

export default function ReceivedInvoices() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await db.purchases.list();
      setPurchases(data || []);
    } catch (err) {
      console.error('Error loading purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Notas Recebidas</h1>
          <p className="text-muted-foreground text-sm">Notas fiscais emitidas por fornecedores contra o seu CNPJ.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-6 py-3 rounded-2xl transition shadow-xl text-xs">
          CONSULTAR SEFAZ
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card/50 border border-white/10 pl-11 pr-4 py-3 rounded-2xl outline-none" 
            placeholder="Buscar por Fornecedor ou Número da Nota..." 
          />
        </div>
        <button className="p-3 bg-card/50 border border-white/10 rounded-2xl hover:bg-white/5 transition">
          <Filter className="h-5 w-5" />
        </button>
      </div>

      <div className="bg-card/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 text-[10px] uppercase tracking-widest font-black text-muted-foreground border-b border-white/5">
                <th className="px-6 py-4">NF-e / Fornecedor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Data Recebimento</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground animate-pulse">Carregando notas de entrada...</td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Nenhuma nota fiscal recebida encontrada.</td>
                </tr>
              ) : filteredPurchases.map((item, i) => (
                <tr key={item.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <p className="font-bold">{item.invoice_number || 'S/N'}</p>
                    <p className="opacity-50 text-[9px] uppercase tracking-wider">{item.supplier_name || 'Fornecedor Desconhecido'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 font-black uppercase text-[9px]">
                      {item.has_invoice ? 'XML Importado' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-6 py-4 opacity-70">
                    {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 font-black">R$ {Number(item.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1">
                      <button className="p-1.5 hover:bg-muted/30 rounded-lg transition"><ExternalLink className="h-3.5 w-3.5" /></button>
                      <button className="p-1.5 hover:bg-muted/30 rounded-lg transition"><Download className="h-3.5 w-3.5" /></button>
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
