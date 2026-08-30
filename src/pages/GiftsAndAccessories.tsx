import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { GiftOrAccessory, GiftPurchase, GiftDispatch, AccessorySale } from '../types';
import { 
  Gift, ShoppingBag, Plus, Search, Trash2, Edit3, Package, User, 
  Calendar, ArrowDownCircle, ArrowUpCircle, Sparkles, Tag, Filter, 
  CheckCircle2, DollarSign, Wallet, RefreshCw, X
} from 'lucide-react';
import { formatBRL } from '../lib/formatCurrency';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function GiftsAndAccessories() {
  const queryClient = useQueryClient();

  // Active Tab: 'inventory' | 'purchases' | 'dispatches' | 'sales'
  const [activeTab, setActiveTab] = useState<'inventory' | 'purchases' | 'dispatches' | 'sales'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'brinde' | 'acessorio' | 'ambos'>('all');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GiftOrAccessory | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<GiftOrAccessory | null>(null);

  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedItemForDispatch, setSelectedItemForDispatch] = useState<GiftOrAccessory | null>(null);

  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedItemForSale, setSelectedItemForSale] = useState<GiftOrAccessory | null>(null);

  // Queries
  const { data: gifts = [], isLoading: isLoadingGifts } = useQuery({
    queryKey: ['gifts'],
    queryFn: () => db.gifts.list() as Promise<GiftOrAccessory[]>,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['gift_purchases'],
    queryFn: () => db.gift_purchases.list() as Promise<GiftPurchase[]>,
  });

  const { data: dispatches = [] } = useQuery({
    queryKey: ['gift_dispatches'],
    queryFn: () => db.gift_dispatches.list() as Promise<GiftDispatch[]>,
  });

  const { data: accessorySales = [] } = useQuery({
    queryKey: ['accessory_sales'],
    queryFn: () => db.accessory_sales.list() as Promise<AccessorySale[]>,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => db.suppliers.list(),
  });

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'capas',
    type: 'brinde' as 'brinde' | 'acessorio' | 'ambos',
    stock_quantity: 0,
    cost_price: 0,
    sell_price: 0,
    supplier: '',
    description: '',
  });

  const [purchaseForm, setPurchaseForm] = useState({
    item_id: '',
    item_name: '',
    quantity: 1,
    unit_cost: 0,
    payment_source: 'saldo_vendas' as 'saldo_vendas' | 'caixa_loja' | 'outro',
    supplier: '',
    notes: '',
  });

  const [dispatchForm, setDispatchForm] = useState({
    item_id: '',
    item_name: '',
    quantity: 1,
    client_id: '',
    client_name: '',
    notes: '',
  });

  const [saleForm, setSaleForm] = useState({
    item_id: '',
    item_name: '',
    quantity: 1,
    unit_sell_price: 0,
    client_id: '',
    client_name: '',
    payment_method: 'PIX',
    notes: '',
  });

  // Open item modal for create/edit
  const handleOpenItemModal = (item?: GiftOrAccessory) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        category: item.category || 'capas',
        type: item.type || 'brinde',
        stock_quantity: item.stock_quantity || 0,
        cost_price: item.cost_price || 0,
        sell_price: item.sell_price || 0,
        supplier: item.supplier || '',
        description: item.description || '',
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        category: 'capas',
        type: 'brinde',
        stock_quantity: 1,
        cost_price: 0,
        sell_price: 0,
        supplier: '',
        description: '',
      });
    }
    setIsItemModalOpen(true);
  };

  // Save Item mutation
  const saveItemMutation = useMutation({
    mutationFn: async () => {
      if (!itemForm.name.trim()) throw new Error('Informe o nome do item.');
      if (editingItem) {
        return db.gifts.update(editingItem.id, itemForm);
      } else {
        return db.gifts.create(itemForm);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      setIsItemModalOpen(false);
      toast.success(editingItem ? 'Item atualizado!' : 'Item cadastrado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar item.');
    }
  });

  // Delete Item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => db.gifts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      toast.success('Item removido do estoque.');
    }
  });

  // Register Purchase (Débito do Saldo de Vendas) mutation
  const registerPurchaseMutation = useMutation({
    mutationFn: async () => {
      const item = gifts.find(g => g.id === purchaseForm.item_id) || selectedItemForPurchase;
      if (!item && !purchaseForm.item_name) throw new Error('Selecione um item.');
      
      const qty = Number(purchaseForm.quantity) || 1;
      const unitCost = Number(purchaseForm.unit_cost) || 0;
      const totalCost = qty * unitCost;

      // 1. Create Purchase record
      const purchaseRecord = await db.gift_purchases.create({
        item_id: item?.id || '',
        item_name: item?.name || purchaseForm.item_name,
        quantity: qty,
        unit_cost: unitCost,
        total_cost: totalCost,
        payment_source: purchaseForm.payment_source,
        purchase_date: new Date().toISOString(),
        supplier: purchaseForm.supplier,
        notes: purchaseForm.notes,
      });

      // 2. Increase Stock Quantity and update cost_price if item exists
      if (item) {
        const newStock = (item.stock_quantity || 0) + qty;
        await db.gifts.update(item.id, {
          stock_quantity: newStock,
          cost_price: unitCost > 0 ? unitCost : item.cost_price,
        });
      }

      return purchaseRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      queryClient.invalidateQueries({ queryKey: ['gift_purchases'] });
      setIsPurchaseModalOpen(false);
      toast.success(`Compra registrada! R$ ${purchaseForm.quantity * purchaseForm.unit_cost} debitado (${purchaseForm.payment_source === 'saldo_vendas' ? 'Saldo das Vendas' : 'Caixa'}).`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao registrar compra.');
    }
  });

  // Register Dispatch (Dar Brinde ao Cliente) mutation
  const registerDispatchMutation = useMutation({
    mutationFn: async () => {
      const item = gifts.find(g => g.id === dispatchForm.item_id) || selectedItemForDispatch;
      if (!item) throw new Error('Selecione o brinde.');
      const qty = Number(dispatchForm.quantity) || 1;
      if (item.stock_quantity < qty) {
        throw new Error(`Estoque insuficiente! Disponível: ${item.stock_quantity}`);
      }

      const totalCost = qty * (item.cost_price || 0);

      // 1. Create Dispatch record
      await db.gift_dispatches.create({
        item_id: item.id,
        item_name: item.name,
        quantity: qty,
        client_id: dispatchForm.client_id,
        client_name: dispatchForm.client_name,
        unit_cost: item.cost_price || 0,
        total_cost: totalCost,
        dispatch_date: new Date().toISOString(),
        notes: dispatchForm.notes,
      });

      // 2. Deduct from Stock
      const newStock = Math.max(0, item.stock_quantity - qty);
      await db.gifts.update(item.id, { stock_quantity: newStock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      queryClient.invalidateQueries({ queryKey: ['gift_dispatches'] });
      setIsDispatchModalOpen(false);
      toast.success('Brinde entregue e baixado do estoque!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao entregar brinde.');
    }
  });

  // Register Accessory Sale mutation
  const registerSaleMutation = useMutation({
    mutationFn: async () => {
      const item = gifts.find(g => g.id === saleForm.item_id) || selectedItemForSale;
      if (!item) throw new Error('Selecione o acessório.');
      const qty = Number(saleForm.quantity) || 1;
      if (item.stock_quantity < qty) {
        throw new Error(`Estoque insuficiente! Disponível: ${item.stock_quantity}`);
      }

      const unitSell = Number(saleForm.unit_sell_price) || (item.sell_price || 0);
      const unitCost = item.cost_price || 0;
      const totalPrice = qty * unitSell;
      const totalProfit = totalPrice - (qty * unitCost);

      // 1. Create Accessory Sale record
      await db.accessory_sales.create({
        item_id: item.id,
        item_name: item.name,
        quantity: qty,
        unit_cost: unitCost,
        unit_sell_price: unitSell,
        total_price: totalPrice,
        total_profit: totalProfit,
        client_id: saleForm.client_id,
        client_name: saleForm.client_name,
        payment_method: saleForm.payment_method,
        sale_date: new Date().toISOString(),
        notes: saleForm.notes,
      });

      // 2. Deduct from Stock
      const newStock = Math.max(0, item.stock_quantity - qty);
      await db.gifts.update(item.id, { stock_quantity: newStock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      queryClient.invalidateQueries({ queryKey: ['accessory_sales'] });
      setIsSaleModalOpen(false);
      toast.success('Venda de acessório lançada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao registrar venda.');
    }
  });

  // Open modals handlers
  const handleOpenPurchase = (item?: GiftOrAccessory) => {
    setSelectedItemForPurchase(item || null);
    setPurchaseForm({
      item_id: item?.id || (gifts[0]?.id || ''),
      item_name: item?.name || '',
      quantity: 1,
      unit_cost: item?.cost_price || 0,
      payment_source: 'saldo_vendas',
      supplier: item?.supplier || '',
      notes: '',
    });
    setIsPurchaseModalOpen(true);
  };

  const handleOpenDispatch = (item?: GiftOrAccessory) => {
    const targetItem = item || gifts.find(g => g.type === 'brinde' || g.type === 'ambos') || gifts[0];
    setSelectedItemForDispatch(targetItem || null);
    setDispatchForm({
      item_id: targetItem?.id || '',
      item_name: targetItem?.name || '',
      quantity: 1,
      client_id: '',
      client_name: '',
      notes: '',
    });
    setIsDispatchModalOpen(true);
  };

  const handleOpenSale = (item?: GiftOrAccessory) => {
    const targetItem = item || gifts.find(g => g.type === 'acessorio' || g.type === 'ambos') || gifts[0];
    setSelectedItemForSale(targetItem || null);
    setSaleForm({
      item_id: targetItem?.id || '',
      item_name: targetItem?.name || '',
      quantity: 1,
      unit_sell_price: targetItem?.sell_price || 0,
      client_id: '',
      client_name: '',
      payment_method: 'PIX',
      notes: '',
    });
    setIsSaleModalOpen(true);
  };

  // Calculations for summary cards
  const totalStockItemsCount = gifts.reduce((sum, g) => sum + (g.stock_quantity || 0), 0);
  const totalStockCostValue = gifts.reduce((sum, g) => sum + ((g.stock_quantity || 0) * (g.cost_price || 0)), 0);
  
  const totalPurchasedDebitedFromSales = purchases
    .filter(p => p.payment_source === 'saldo_vendas')
    .reduce((sum, p) => sum + (p.total_cost || 0), 0);

  const totalGiftDispatchesCount = dispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const totalGiftDispatchesCost = dispatches.reduce((sum, d) => sum + (d.total_cost || 0), 0);

  const totalAccessoryRevenue = accessorySales.reduce((sum, s) => sum + (s.total_price || 0), 0);
  const totalAccessoryProfit = accessorySales.reduce((sum, s) => sum + (s.total_profit || 0), 0);

  // Filter gifts list
  const filteredGifts = gifts.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 dark:bg-purple-400/10 rounded-xl border border-purple-500/20 text-purple-600 dark:text-purple-400">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Brindes & Acessórios</h2>
              <p className="text-xs text-muted-foreground">
                Gerencie brindes de clientes comprados com o saldo de vendas e comercialização de acessórios.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenPurchase()}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Wallet className="h-4 w-4" />
            <span>Comprar (Débito)</span>
          </button>
          <button
            onClick={() => handleOpenDispatch()}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span>Dar de Brinde</span>
          </button>
          <button
            onClick={() => handleOpenSale()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Vender Acessório</span>
          </button>
          <button
            onClick={() => handleOpenItemModal()}
            className="bg-foreground text-background text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Item</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Estoque de Brindes/Acessórios */}
        <div className="bg-card/70 backdrop-blur-md p-4 rounded-2xl border shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Estoque Total</span>
            <Package className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold">{totalStockItemsCount} un</div>
            <div className="text-[11px] text-muted-foreground font-medium">Custo: {formatBRL(totalStockCostValue)}</div>
          </div>
        </div>

        {/* Card 2: Débito em Saldo de Vendas */}
        <div className="bg-card/70 backdrop-blur-md p-4 rounded-2xl border border-amber-500/20 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-semibold">Débito no Saldo</span>
            <ArrowDownCircle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatBRL(totalPurchasedDebitedFromSales)}
            </div>
            <div className="text-[11px] text-muted-foreground">Abatido do caixa de vendas</div>
          </div>
        </div>

        {/* Card 3: Brindes Entregues */}
        <div className="bg-card/70 backdrop-blur-md p-4 rounded-2xl border shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-xs font-semibold">Mimos Entregues</span>
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">{totalGiftDispatchesCount} brindes</div>
            <div className="text-[11px] text-muted-foreground">Investimento: {formatBRL(totalGiftDispatchesCost)}</div>
          </div>
        </div>

        {/* Card 4: Vendas de Acessórios */}
        <div className="bg-card/70 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/20 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-semibold">Venda de Acessórios</span>
            <ArrowUpCircle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatBRL(totalAccessoryRevenue)}
            </div>
            <div className="text-[11px] text-emerald-600/80 font-medium">Lucro: +{formatBRL(totalAccessoryProfit)}</div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'text-muted-foreground hover:bg-card'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Estoque ({gifts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'purchases' 
              ? 'bg-amber-600 text-white shadow-md' 
              : 'text-muted-foreground hover:bg-card'
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>Compras com Saldo ({purchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dispatches')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'dispatches' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'text-muted-foreground hover:bg-card'
          }`}
        >
          <Gift className="h-4 w-4" />
          <span>Brindes Entregues ({dispatches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'sales' 
              ? 'bg-emerald-600 text-white shadow-md' 
              : 'text-muted-foreground hover:bg-card'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Venda de Acessórios ({accessorySales.length})</span>
        </button>
      </div>

      {/* TAB 1: ESTOQUE DE BRINDES & ACESSÓRIOS */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-card/60 rounded-xl border border-muted text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={typeFilter}
                onChange={(e: any) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-card/60 rounded-xl border border-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Todos os Tipos</option>
                <option value="brinde">Apenas Brindes</option>
                <option value="acessorio">Apenas Acessórios</option>
                <option value="ambos">Brindes & Acessórios (Ambos)</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-card/60 rounded-xl border border-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Todas Categorias</option>
                <option value="capas">Capinhas</option>
                <option value="peliculas">Películas</option>
                <option value="carregadores">Carregadores</option>
                <option value="fones">Fones</option>
                <option value="cabos">Cabos</option>
                <option value="mimos">Mimos / Brindes Especial</option>
                <option value="outros">Outros</option>
              </select>

              <a
                href="#/offer-tags"
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
                title="Abrir Gerador de Encartes e Tags de Oferta"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Gerar Encartes / Tags</span>
              </a>
            </div>
          </div>

          {/* Cards Grid */}
          {isLoadingGifts ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Carregando estoque de brindes...</div>
          ) : filteredGifts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed bg-card/30 space-y-3">
              <Gift className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
              <p className="text-sm font-semibold">Nenhum brinde ou acessório encontrado.</p>
              <p className="text-xs text-muted-foreground">Clique no botão "Novo Item" acima para cadastrar seu primeiro brinde ou acessório.</p>
              <button
                onClick={() => handleOpenItemModal()}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition"
              >
                <Plus className="h-4 w-4" />
                <span>Cadastrar Item</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredGifts.map((item) => {
                const isLowStock = item.stock_quantity <= 2;
                return (
                  <div 
                    key={item.id} 
                    className="bg-card/70 backdrop-blur-md rounded-2xl border p-4 flex flex-col justify-between hover:shadow-lg transition duration-200 group relative"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          item.type === 'brinde'
                            ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                            : item.type === 'acessorio'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                        }`}>
                          {item.type === 'brinde' ? '🎁 Brinde' : item.type === 'acessorio' ? '🏷️ Acessório' : '🎁/🏷️ Brinde e Acessório'}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleOpenItemModal(item)}
                            className="p-1 text-muted-foreground hover:text-foreground rounded transition"
                            title="Editar Item"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja remover "${item.name}" do estoque?`)) {
                                deleteItemMutation.mutate(item.id);
                              }
                            }}
                            className="p-1 text-red-500 hover:text-red-700 rounded transition"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-foreground mb-1 line-clamp-2">{item.name}</h4>
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                      )}

                      <div className="space-y-1 text-xs mb-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estoque:</span>
                          <span className={`font-bold ${isLowStock ? 'text-red-500 font-extrabold' : 'text-foreground'}`}>
                            {item.stock_quantity} un {isLowStock && '(Baixo!)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Custo Unitário:</span>
                          <span className="font-semibold">{formatBRL(item.cost_price || 0)}</span>
                        </div>
                        {item.type !== 'brinde' && (
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                            <span className="font-medium">Preço Venda:</span>
                            <span className="font-bold">{formatBRL(item.sell_price || 0)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions bar inside card */}
                    <div className="pt-2 border-t flex items-center gap-1.5">
                      {(item.type === 'brinde' || item.type === 'ambos') && (
                        <button
                          onClick={() => handleOpenDispatch(item)}
                          disabled={item.stock_quantity <= 0}
                          className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg transition text-center cursor-pointer active:scale-95"
                          title="Dar como brinde para cliente"
                        >
                          Dar Brinde
                        </button>
                      )}

                      {(item.type === 'acessorio' || item.type === 'ambos') && (
                        <button
                          onClick={() => handleOpenSale(item)}
                          disabled={item.stock_quantity <= 0}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg transition text-center cursor-pointer active:scale-95"
                          title="Vender acessório"
                        >
                          Vender
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenPurchase(item)}
                        className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold rounded-lg transition"
                        title="Registrar nova compra (adicionar ao estoque)"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPRAS COM SALDO DE VENDAS */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Historico de Compras com Saldo</h3>
            <button
              onClick={() => handleOpenPurchase()}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Compra</span>
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed text-xs text-muted-foreground">
              Nenhuma compra de brindes/acessórios registrada.
            </div>
          ) : (
            <div className="bg-card/70 rounded-2xl border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Item Comprado</th>
                      <th className="p-3 text-center">Qtd</th>
                      <th className="p-3">Custo Unit.</th>
                      <th className="p-3">Total Gasto</th>
                      <th className="p-3">Origem dos Fundos</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground">
                          {p.purchase_date ? format(new Date(p.purchase_date), 'dd/MM/yyyy HH:mm') : '-'}
                        </td>
                        <td className="p-3 font-bold text-foreground">{p.item_name}</td>
                        <td className="p-3 text-center font-bold">{p.quantity}</td>
                        <td className="p-3">{formatBRL(p.unit_cost || 0)}</td>
                        <td className="p-3 font-bold text-amber-600 dark:text-amber-400">{formatBRL(p.total_cost || 0)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            p.payment_source === 'saldo_vendas' 
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {p.payment_source === 'saldo_vendas' ? '💳 Saldo das Vendas (Débito)' : 'Caixa / Outro'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              if (confirm('Deseja excluir este registro de compra?')) {
                                db.gift_purchases.delete(p.id).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['gift_purchases'] });
                                  toast.success('Compra removida.');
                                });
                              }
                            }}
                            className="p-1 text-red-500 hover:text-red-700 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BRINDES ENTREGUES A CLIENTES */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Histórico de Mimos Presenteados</h3>
            <button
              onClick={() => handleOpenDispatch()}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Dar de Brinde</span>
            </button>
          </div>

          {dispatches.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed text-xs text-muted-foreground">
              Nenhum brinde entregue a clientes registrado.
            </div>
          ) : (
            <div className="bg-card/70 rounded-2xl border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Cliente Presenteado</th>
                      <th className="p-3">Brinde Entregue</th>
                      <th className="p-3 text-center">Qtd</th>
                      <th className="p-3">Custo do Mimo</th>
                      <th className="p-3">Observações</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dispatches.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground">
                          {d.dispatch_date ? format(new Date(d.dispatch_date), 'dd/MM/yyyy HH:mm') : '-'}
                        </td>
                        <td className="p-3 font-bold text-purple-600 dark:text-purple-400">
                          {d.client_name || 'Cliente Geral'}
                        </td>
                        <td className="p-3 font-semibold text-foreground">{d.item_name}</td>
                        <td className="p-3 text-center font-bold">{d.quantity}</td>
                        <td className="p-3 font-medium text-muted-foreground">{formatBRL(d.total_cost || 0)}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-[200px]">{d.notes || '-'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              if (confirm('Deseja excluir este histórico de brinde?')) {
                                db.gift_dispatches.delete(d.id).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['gift_dispatches'] });
                                  toast.success('Registro removido.');
                                });
                              }
                            }}
                            className="p-1 text-red-500 hover:text-red-700 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: VENDA DE ACESSÓRIOS */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Histórico de Vendas de Acessórios</h3>
            <button
              onClick={() => handleOpenSale()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Vender Acessório</span>
            </button>
          </div>

          {accessorySales.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed text-xs text-muted-foreground">
              Nenhuma venda de acessório registrada.
            </div>
          ) : (
            <div className="bg-card/70 rounded-2xl border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Acessório</th>
                      <th className="p-3 text-center">Qtd</th>
                      <th className="p-3">Preço Total</th>
                      <th className="p-3">Lucro OBTIDO</th>
                      <th className="p-3">Pagamento</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {accessorySales.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground">
                          {s.sale_date ? format(new Date(s.sale_date), 'dd/MM/yyyy HH:mm') : '-'}
                        </td>
                        <td className="p-3 font-semibold">{s.client_name || 'Balcão / Avulso'}</td>
                        <td className="p-3 font-bold text-foreground">{s.item_name}</td>
                        <td className="p-3 text-center font-bold">{s.quantity}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(s.total_price || 0)}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">+{formatBRL(s.total_profit || 0)}</td>
                        <td className="p-3 font-semibold">{s.payment_method}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              if (confirm('Deseja excluir este registro de venda de acessório?')) {
                                db.accessory_sales.delete(s.id).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['accessory_sales'] });
                                  toast.success('Venda removida.');
                                });
                              }
                            }}
                            className="p-1 text-red-500 hover:text-red-700 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CADASTRAR / EDITAR ITEM NO ESTOQUE */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl p-4 sm:p-5 relative flex flex-col max-h-[85vh] my-auto">
            <div className="flex items-center justify-between pb-3 border-b shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                <span>{editingItem ? 'Editar Item no Estoque' : 'Cadastrar Novo Item'}</span>
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs pr-1">
              <div>
                <label className="block font-semibold mb-1">Nome do Item / Produto *</label>
                <input
                  type="text"
                  placeholder="Ex: Capinha Magsafe iPhone 15 Pro, Copo Stanley, etc."
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Tipo de Finalidade</label>
                  <select
                    value={itemForm.type}
                    onChange={(e: any) => setItemForm({ ...itemForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-semibold"
                  >
                    <option value="brinde">🎁 Brinde (Mimo Cliente)</option>
                    <option value="acessorio">🏷️ Acessório de Venda</option>
                    <option value="ambos">🎁/🏷️ Ambos (Brinde e Venda)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Categoria</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-semibold"
                  >
                    <option value="capas">Capinhas</option>
                    <option value="peliculas">Películas</option>
                    <option value="carregadores">Carregadores</option>
                    <option value="fones">Fones</option>
                    <option value="cabos">Cabos</option>
                    <option value="mimos">Mimos Especial</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.stock_quantity}
                    onChange={(e) => setItemForm({ ...itemForm, stock_quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.cost_price}
                    onChange={(e) => setItemForm({ ...itemForm, cost_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.sell_price}
                    onChange={(e) => setItemForm({ ...itemForm, sell_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-bold text-emerald-600"
                    disabled={itemForm.type === 'brinde'}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Fornecedor (Opcional)</label>
                <input
                  type="text"
                  placeholder="Nome do fornecedor ou distribuidor..."
                  value={itemForm.supplier}
                  onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Descrição / Observações</label>
                <textarea
                  rows={2}
                  placeholder="Cores disponíveis, modelo compatível, etc."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t shrink-0">
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border font-semibold text-xs text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => saveItemMutation.mutate()}
                disabled={saveItemMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition"
              >
                {saveItemMutation.isPending ? 'Salvando...' : 'Salvar Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR COMPRA (DÉBITO DO SALDO DE VENDAS) */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl p-4 sm:p-5 relative flex flex-col max-h-[85vh] my-auto">
            <div className="flex items-center justify-between pb-3 border-b shrink-0">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Wallet className="h-5 w-5" />
                  <span>Comprar Brindes / Estocar (Débito)</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  A compra será abatida do saldo das vendas e os itens adicionados ao estoque.
                </p>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs pr-1">
              <div>
                <label className="block font-semibold mb-1">Selecione o Item do Estoque</label>
                <select
                  value={purchaseForm.item_id}
                  onChange={(e) => {
                    const sel = gifts.find(g => g.id === e.target.value);
                    setPurchaseForm({
                      ...purchaseForm,
                      item_id: e.target.value,
                      item_name: sel?.name || purchaseForm.item_name,
                      unit_cost: sel?.cost_price || purchaseForm.unit_cost,
                    });
                  }}
                  className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-semibold"
                >
                  <option value="">-- Selecionar do Estoque Existente --</option>
                  {gifts.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} (Estoque atual: {g.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              {!purchaseForm.item_id && (
                <div>
                  <label className="block font-semibold mb-1">Nome do Item (Caso seja novo)</label>
                  <input
                    type="text"
                    placeholder="Ex: Capas Silicone iPhone 14"
                    value={purchaseForm.item_name}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, item_name: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Quantidade Comprada</label>
                  <input
                    type="number"
                    min="1"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Custo Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchaseForm.unit_cost}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, unit_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between font-bold text-xs text-amber-700 dark:text-amber-300">
                <span>Total a Debitar:</span>
                <span className="text-sm font-black">{formatBRL((purchaseForm.quantity || 0) * (purchaseForm.unit_cost || 0))}</span>
              </div>

              <div>
                <label className="block font-semibold mb-1">Fonte de Pagamento / Débito</label>
                <select
                  value={purchaseForm.payment_source}
                  onChange={(e: any) => setPurchaseForm({ ...purchaseForm, payment_source: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-bold text-amber-600"
                >
                  <option value="saldo_vendas">💳 Saldo das Vendas (Abater da Receita)</option>
                  <option value="caixa_loja">💵 Caixa da Loja / Dinheiro</option>
                  <option value="outro">Outro / Cartão Empresa</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Fornecedor</label>
                <input
                  type="text"
                  placeholder="Nome do fornecedor..."
                  value={purchaseForm.supplier}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t shrink-0">
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border font-semibold text-xs text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => registerPurchaseMutation.mutate()}
                disabled={registerPurchaseMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition"
              >
                {registerPurchaseMutation.isPending ? 'Processando...' : 'Confirmar & Debitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ENTREGAR BRINDE AO CLIENTE */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl p-4 sm:p-5 relative flex flex-col max-h-[85vh] my-auto">
            <div className="flex items-center justify-between pb-3 border-b shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Sparkles className="h-5 w-5" />
                <span>Dar Brinde a Cliente</span>
              </h3>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs pr-1">
              <div>
                <label className="block font-semibold mb-1">Brinde a ser Entregue *</label>
                <select
                  value={dispatchForm.item_id}
                  onChange={(e) => {
                    const sel = gifts.find(g => g.id === e.target.value);
                    setDispatchForm({
                      ...dispatchForm,
                      item_id: e.target.value,
                      item_name: sel?.name || '',
                    });
                  }}
                  className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-semibold"
                >
                  <option value="">-- Selecione o Brinde --</option>
                  {gifts.filter(g => g.type === 'brinde' || g.type === 'ambos').map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} (Disponível: {g.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={dispatchForm.quantity}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Cliente (Cadastrado)</label>
                  <select
                    value={dispatchForm.client_id}
                    onChange={(e) => {
                      const sel = clients.find(c => c.id === e.target.value);
                      setDispatchForm({
                        ...dispatchForm,
                        client_id: e.target.value,
                        client_name: sel?.name || dispatchForm.client_name,
                      });
                    }}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs"
                  >
                    <option value="">-- Selecione ou digite abaixo --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!dispatchForm.client_id && (
                <div>
                  <label className="block font-semibold mb-1">Nome do Cliente (Avulso)</label>
                  <input
                    type="text"
                    placeholder="Ex: João Silva"
                    value={dispatchForm.client_name}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, client_name: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Observações (Motivo / Pedido)</label>
                <input
                  type="text"
                  placeholder="Ex: Brinde cortesia na compra do iPhone 15"
                  value={dispatchForm.notes}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t shrink-0">
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border font-semibold text-xs text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => registerDispatchMutation.mutate()}
                disabled={registerDispatchMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition"
              >
                {registerDispatchMutation.isPending ? 'Entregando...' : 'Confirmar & Baixar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VENDER ACESSÓRIO */}
      {isSaleModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl p-4 sm:p-5 relative flex flex-col max-h-[85vh] my-auto">
            <div className="flex items-center justify-between pb-3 border-b shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <ShoppingBag className="h-5 w-5" />
                <span>Vender Acessório</span>
              </h3>
              <button
                onClick={() => setIsSaleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs pr-1">
              <div>
                <label className="block font-semibold mb-1">Acessório *</label>
                <select
                  value={saleForm.item_id}
                  onChange={(e) => {
                    const sel = gifts.find(g => g.id === e.target.value);
                    setSaleForm({
                      ...saleForm,
                      item_id: e.target.value,
                      item_name: sel?.name || '',
                      unit_sell_price: sel?.sell_price || 0,
                    });
                  }}
                  className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-semibold"
                >
                  <option value="">-- Selecione o Acessório --</option>
                  {gifts.filter(g => g.type === 'acessorio' || g.type === 'ambos').map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} (Estoque: {g.stock_quantity} - R$ {g.sell_price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={saleForm.quantity}
                    onChange={(e) => setSaleForm({ ...saleForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Preço Venda Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={saleForm.unit_sell_price}
                    onChange={(e) => setSaleForm({ ...saleForm, unit_sell_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between font-bold text-xs text-emerald-700 dark:text-emerald-300">
                <span>Total da Venda:</span>
                <span className="text-sm font-black">{formatBRL((saleForm.quantity || 0) * (saleForm.unit_sell_price || 0))}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Forma de Pagamento</label>
                  <select
                    value={saleForm.payment_method}
                    onChange={(e) => setSaleForm({ ...saleForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs font-bold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Cliente (Opcional)</label>
                  <select
                    value={saleForm.client_id}
                    onChange={(e) => {
                      const sel = clients.find(c => c.id === e.target.value);
                      setSaleForm({
                        ...saleForm,
                        client_id: e.target.value,
                        client_name: sel?.name || saleForm.client_name,
                      });
                    }}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs"
                  >
                    <option value="">-- Balcão / Não Informado --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!saleForm.client_id && (
                <div>
                  <label className="block font-semibold mb-1">Nome do Cliente Avulso</label>
                  <input
                    type="text"
                    placeholder="Ex: Pedro Santos"
                    value={saleForm.client_name}
                    onChange={(e) => setSaleForm({ ...saleForm, client_name: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 rounded-xl border text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t shrink-0">
              <button
                onClick={() => setIsSaleModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border font-semibold text-xs text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => registerSaleMutation.mutate()}
                disabled={registerSaleMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
              >
                {registerSaleMutation.isPending ? 'Concluindo...' : 'Finalizar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
