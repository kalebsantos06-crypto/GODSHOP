import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { Plus, Trash2, Edit2, Search, Smartphone, X, Gamepad2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmationModal from '../components/ui/ConfirmationModal';

type Category = 'iphone' | 'console';

export default function PriceTable() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingPrice, setEditingPrice] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('iphone');

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ['prices'],
    queryFn: () => db.prices.list(),
  });

  const addMutation = useMutation({
    mutationFn: (newPrice: any) => db.prices.create(newPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      setIsAdding(false);
      toast.success('Preço adicionado!');
    },
    onError: () => toast.error('Erro ao adicionar preço. Verifique se a coluna "category" existe no banco.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.prices.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      setEditingPrice(null);
      toast.success('Preço atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar preço.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.prices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      toast.success('Preço removido!');
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const items = [
        { category: 'iphone', model: 'iPhone 11', storage: '128GB', price: 1000.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11', storage: '256GB', price: 1000.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11', storage: '64GB', price: 900.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11 Pro', storage: '256GB', price: 1200.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11 Pro', storage: '512GB', price: 1250.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11 Pro Max', storage: '256GB', price: 1300.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11 Pro Max', storage: '512GB', price: 1350.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11 Pro Max', storage: '64GB', price: 1200.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 12', storage: '128GB', price: 1200.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 12', storage: '64GB', price: 1200.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 12 Pro Max', storage: '128GB', price: 2000.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 13', storage: '128GB', price: 1650.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 14', storage: '256GB', price: 2150.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 14 Pro', storage: '256GB', price: 2500.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 14 Pro Max', storage: '128GB', price: 2500.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 14 Pro Max', storage: '256GB', price: 2800.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 15 Plus', storage: '128GB', price: 2500.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 15 Pro Max', storage: '256GB', price: 3500.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 8 Plus', storage: '256GB', price: 500.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone XR', storage: '128GB', price: 850.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone XR', storage: '64GB', price: 850.00, condition: 'Seminovo Grade A' }
      ];
      
      for (const item of items) {
        await db.prices.create(item as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      toast.success('Tabela importada com sucesso!');
    },
    onError: () => toast.error('Erro ao importar tabela.')
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      model: formData.get('model'),
      version: formData.get('version'),
      storage: formData.get('storage'),
      color: formData.get('color'),
      condition: formData.get('condition'),
      price: Number(formData.get('price')),
      category: selectedCategory,
    };

    if (editingPrice) {
      updateMutation.mutate({ id: editingPrice.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const filteredPrices = useMemo(() => {
    return prices.filter(item => 
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.storage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.version?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.condition?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.model.localeCompare(b.model));
  }, [prices, searchTerm]);

  const uniqueModels = useMemo(() => {
    return Array.from(new Set(prices.filter(p => p.category === selectedCategory).map(p => p.model))).sort();
  }, [prices, selectedCategory]);

  if (isLoading) return <div className="flex items-center justify-center h-64">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tabela de Preços (Venda)</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os preços de venda para iPhones e Consoles</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-secondary/80 transition-colors w-full sm:w-auto justify-center shadow-sm disabled:opacity-50"
          >
            {importMutation.isPending ? 'Importando...' : 'Importar Lista'}
          </button>
          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingPrice(null);
              if (!isAdding) setSelectedCategory('iphone');
            }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center shadow-sm"
          >
            {isAdding || editingPrice ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isAdding || editingPrice ? 'Fechar' : 'Novo Preço'}
          </button>
        </div>
      </div>

      {(isAdding || editingPrice) && (
        <div className="bg-card border rounded-xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{editingPrice ? 'Editar Preço' : 'Cadastrar Novo Preço'}</h2>
            </div>
            {!editingPrice && (
              <div className="flex bg-muted p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('iphone')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${selectedCategory === 'iphone' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  iPhone
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('console')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${selectedCategory === 'console' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  Console
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                Modelo {selectedCategory === 'iphone' ? <Smartphone className="h-3 w-3" /> : <Gamepad2 className="h-3 w-3" />}
              </label>
              <input 
                name="model" 
                list="models-list"
                defaultValue={editingPrice?.model} 
                required 
                className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder={selectedCategory === 'iphone' ? "Ex: iPhone 15" : "Ex: PlayStation 5"} 
              />
              <datalist id="models-list">
                {uniqueModels.map(model => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Versão</label>
              <input 
                name="version" 
                defaultValue={editingPrice?.version} 
                className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder={selectedCategory === 'iphone' ? "Ex: Pro Max, Plus" : "Ex: Slim, Digital Edition"} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {selectedCategory === 'iphone' ? 'Armazenamento' : 'Capacidade'}
              </label>
              {selectedCategory === 'iphone' ? (
                <select 
                  name="storage" 
                  defaultValue={editingPrice?.storage || '128GB'} 
                  required 
                  className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="64GB">64GB</option>
                  <option value="128GB">128GB</option>
                  <option value="256GB">256GB</option>
                  <option value="512GB">512GB</option>
                  <option value="1TB">1TB</option>
                </select>
              ) : (
                <input 
                  name="storage" 
                  defaultValue={editingPrice?.storage} 
                  required 
                  className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                  placeholder="Ex: 825GB, 1TB" 
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <input 
                name="color" 
                defaultValue={editingPrice?.color} 
                className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder="Ex: Titânio Natural, Branco" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Condição</label>
              <select 
                name="condition" 
                defaultValue={editingPrice?.condition || 'Novo Lacrado'} 
                required 
                className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="Novo Lacrado">Novo Lacrado</option>
                <option value="Seminovo Grade A">Seminovo Grade A</option>
                <option value="Seminovo Grade B">Seminovo Grade B</option>
                <option value="Usado">Usado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-600">Preço de Venda Sugerido</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium">R$</span>
                <input 
                  name="price" 
                  defaultValue={editingPrice?.price} 
                  type="number" 
                  step="0.01" 
                  required 
                  className="w-full p-2.5 pl-10 border border-emerald-200 rounded-lg bg-emerald-50/30 text-emerald-700 font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" 
                  placeholder="0,00" 
                />
              </div>
            </div>

            <div className="lg:col-span-3 flex justify-end gap-3 pt-2 border-t mt-2">
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setEditingPrice(null); }} 
                className="bg-muted text-muted-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-primary text-primary-foreground px-8 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-95"
              >
                {editingPrice ? 'Atualizar Preço' : 'Salvar na Tabela'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Pesquisar por modelo, armazenamento ou categoria..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> iPhone</span>
            <span className="flex items-center gap-1 ml-2"><Gamepad2 className="h-3 w-3" /> Console</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Categoria</th>
                <th className="px-6 py-4 font-semibold">Produto</th>
                <th className="px-6 py-4 font-semibold">Especificações</th>
                <th className="px-6 py-4 font-semibold">Condição</th>
                <th className="px-6 py-4 font-semibold">Preço Sugerido</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPrices.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors group">
                  <td className="px-6 py-4">
                    {item.category === 'console' ? (
                      <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                        <Gamepad2 className="h-4 w-4" />
                        Console
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-purple-600 font-medium">
                        <Smartphone className="h-4 w-4" />
                        iPhone
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{item.model}</div>
                    {item.version && <div className="text-xs text-muted-foreground">{item.version}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground border uppercase">
                        {item.storage}
                      </span>
                      {item.color && (
                        <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground border uppercase">
                          {item.color}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                      item.condition === 'Novo Lacrado' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {item.condition || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-emerald-600 font-bold text-base">
                      {formatBRL(item.price)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingPrice(item);
                          setSelectedCategory(item.category || 'iphone');
                          setIsAdding(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-muted-foreground hover:text-primary p-2 rounded-md hover:bg-primary/10 transition-all"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteId(item.id)}
                        className="text-muted-foreground hover:text-destructive p-2 rounded-md hover:bg-destructive/10 transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPrices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="p-4 bg-muted rounded-full">
                        <Search className="h-10 w-10 opacity-20" />
                      </div>
                      <p className="text-base font-medium">Nenhum item encontrado na tabela.</p>
                      <button 
                        onClick={() => setIsAdding(true)}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Cadastrar o primeiro item agora
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Preço"
        message="Tem certeza que deseja remover este item da tabela de preços? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />
    </div>
  );
}
