import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../services/db';
import { iPhone, Console, GiftOrAccessory } from '../../types';
import { StudioLinkedProduct } from '../../types/studio';
import { formatBRL } from '../../lib/formatCurrency';
import { X, Search, Smartphone, Tv, Gift, Check, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: StudioLinkedProduct) => void;
}

export default function ProductSelectorModal({
  isOpen,
  onClose,
  onSelectProduct
}: ProductSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'iphone' | 'console' | 'gift'>('all');

  const { data: iphones = [] } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list()
  });

  const { data: consoles = [] } = useQuery({
    queryKey: ['consoles'],
    queryFn: () => db.consoles.list()
  });

  const { data: gifts = [] } = useQuery({
    queryKey: ['gifts'],
    queryFn: () => db.gifts.list()
  });

  if (!isOpen) return null;

  // Unify products into commercial selectable items
  const unifiedProducts: StudioLinkedProduct[] = [];

  iphones.forEach((p: iPhone) => {
    unifiedProducts.push({
      id: p.id,
      type: 'iphone',
      name: `iPhone ${p.model} ${p.storage}`,
      model: p.model,
      storage: p.storage,
      color: p.color,
      condition: p.condition || 'Seminovo Grade A',
      price: p.sell_price || p.buy_price * 1.3 || 2500,
      originalSellPrice: p.sell_price || p.buy_price * 1.3 || 2500,
      warranty: p.condition?.includes('lacrado') ? '1 Ano Garantia Apple / GodShop' : '90 Dias Garantia GodShop',
      photoUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80'
    });
  });

  consoles.forEach((c: Console) => {
    unifiedProducts.push({
      id: c.id,
      type: 'console',
      name: `${c.model} - ${c.version || ''}`,
      model: c.model,
      version: c.version,
      condition: c.condition || 'Seminovo Impecável',
      price: c.sell_price || c.buy_price * 1.25 || 3200,
      originalSellPrice: c.sell_price || c.buy_price * 1.25 || 3200,
      warranty: '90 Dias Garantia GodShop',
      photoUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80'
    });
  });

  gifts.forEach((g: GiftOrAccessory) => {
    unifiedProducts.push({
      id: g.id,
      type: 'gift',
      name: g.name,
      condition: 'Novo Lacrado',
      price: g.sell_price || 99,
      originalSellPrice: g.sell_price || 99,
      warranty: 'Garantia de 30 dias',
      photoUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80'
    });
  });

  // Filter
  const filtered = unifiedProducts.filter(item => {
    const matchCat = categoryFilter === 'all' || item.type === categoryFilter;
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.model || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Catálogo GodShop — Selecionar Produto
              </h3>
              <p className="text-xs text-zinc-400">
                Os dados cadastrados (fotos, preços e garantia) serão carregados na arte.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-3 sm:p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-2 bg-zinc-900">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por iPhone, PlayStation, Acessório..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              Todos ({unifiedProducts.length})
            </button>
            <button
              onClick={() => setCategoryFilter('iphone')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'iphone'
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              <Smartphone className="h-3 w-3" /> iPhones
            </button>
            <button
              onClick={() => setCategoryFilter('console')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'console'
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              <Tv className="h-3 w-3" /> Consoles
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-sm font-medium">Nenhum produto encontrado com este filtro.</p>
              <p className="text-xs text-zinc-600 mt-1">Verifique o estoque ou limpe o termo de busca.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={`${item.type}_${item.id}`}
                onClick={() => {
                  onSelectProduct(item);
                  onClose();
                }}
                className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 hover:border-amber-500/60 hover:bg-zinc-800/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={item.photoUrl}
                      alt={item.name}
                      className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors truncate">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 truncate">
                      <span>{item.condition}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">{item.warranty}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-black text-sm text-emerald-400 font-mono">
                    {formatBRL(item.price)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    ou 12x de {formatBRL(item.price / 12)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
