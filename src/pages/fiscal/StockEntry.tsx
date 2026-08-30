
import React from 'react';
import { Package, ArrowRight, Scan, Plus } from 'lucide-react';

export default function StockEntry() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'iPhone',
    identifier: '',
    cost_price: '',
    sell_price: '',
    storage: '',
    color: '',
    battery_health: '',
    condition: 'Excelente / Vitrine',
    purchase_id: ''
  });

  const handleSave = async () => {
    if (!formData.name || !formData.identifier) {
      return toast.error('Preencha pelo menos o modelo e o IMEI/Serial.');
    }

    setLoading(true);
    try {
      await db.product_units.create({
        ...formData,
        cost_price: Number(formData.cost_price),
        sell_price: Number(formData.sell_price),
        status: 'Disponível',
        fiscal_status: 'Sem Nota',
        created_at: new Date().toISOString()
      });
      toast.success('Entrada registrada com sucesso!');
      setFormData({
        name: '',
        category: 'iPhone',
        identifier: '',
        cost_price: '',
        sell_price: '',
        storage: '',
        color: '',
        battery_health: '',
        condition: 'Excelente / Vitrine',
        purchase_id: ''
      });
    } catch (err) {
      console.error('Error saving stock entry:', err);
      toast.error('Erro ao registrar entrada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Entrada de Mercadoria</h1>
          <p className="text-muted-foreground text-sm">Registro individual de unidades por IMEI ou Serial Number.</p>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Identificação</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Produto / Modelo</label>
              <input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                placeholder="Ex: iPhone 15 Pro"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">IMEI / Serial Number</label>
              <div className="flex gap-2">
                <input 
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  className="flex-1 bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  placeholder="Escaneie ou digite..." 
                />
                <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition">
                  <Scan className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Especificações Técnicas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Capacidade</label>
                <input 
                  value={formData.storage}
                  onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  placeholder="256GB"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Cor</label>
                <input 
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  placeholder="Azul"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Bateria (%)</label>
                <input 
                  value={formData.battery_health}
                  onChange={(e) => setFormData({ ...formData, battery_health: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  placeholder="100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Estado</label>
                <select 
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none"
                >
                  <option>Novo / Lacrado</option>
                  <option>Excelente / Vitrine</option>
                  <option>Bom</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Valores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Custo Unitário</label>
                <input 
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  placeholder="R$ 0,00" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Preço Venda</label>
                <input 
                  value={formData.sell_price}
                  onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  placeholder="R$ 0,00" 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Vincular à Compra (Opcional)</label>
              <select className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none">
                <option>Nenhuma compra selecionada</option>
              </select>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-2xl transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-pulse">PROCESSANDO...</span>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              REGISTRAR ENTRADA NO ESTOQUE
            </>
          )}
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { toast } from 'sonner';
import { db } from '../../services/db';
