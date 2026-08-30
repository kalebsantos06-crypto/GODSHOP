
import React, { useEffect, useState } from 'react';
import { Package, Search, Filter, Smartphone, Gamepad2, Info } from 'lucide-react';
import { db } from '../../services/db';

export default function ProductStock() {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await db.product_units.list();
      setUnits(data || []);
    } catch (err) {
      console.error('Error loading stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = units.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.identifier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Produtos em Estoque</h1>
          <p className="text-muted-foreground text-sm">Controle detalhado de unidades e identificação (IMEI/Serial).</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card/50 border border-white/10 pl-11 pr-4 py-3 rounded-2xl outline-none focus:ring-2 ring-emerald-500/50" 
            placeholder="Buscar por IMEI, Serial ou Nome do Produto..." 
          />
        </div>
        <button className="p-3 bg-card/50 border border-white/10 rounded-2xl hover:bg-white/5 transition">
          <Filter className="h-5 w-5" />
        </button>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 text-[10px] uppercase tracking-widest font-black text-muted-foreground border-b border-white/5">
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">IMEI / Serial</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Situação Fiscal</th>
                <th className="px-6 py-4">Preço Venda</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground animate-pulse">Carregando estoque...</td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Nenhum produto em estoque encontrado.</td>
                </tr>
              ) : filteredUnits.map((item, i) => (
                <tr key={item.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted/20 rounded-xl flex items-center justify-center">
                        {item.category === 'Console' ? <Gamepad2 className="h-5 w-5 text-blue-500" /> : <Smartphone className="h-5 w-5 text-emerald-500" />}
                      </div>
                      <span className="font-bold">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs opacity-70">{item.identifier || 'Não informado'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${item.status === 'Disponível' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted/20 text-muted-foreground'}`}>
                      {item.status || 'Disponível'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${item.fiscal_status === 'Regular' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {item.fiscal_status || 'Sem Nota'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black text-emerald-500">R$ {Number(item.sell_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button className="p-2 hover:bg-muted/30 rounded-lg transition text-muted-foreground hover:text-white">
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
