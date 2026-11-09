import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConfirmationModal from '../components/ui/ConfirmationModal';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => db.suppliers.list(),
  });

  const addMutation = useMutation({
    mutationFn: (newProduct: any) => db.products.create(newProduct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsAdding(false);
      toast.success('Produto adicionado ao estoque!');
    },
    onError: () => toast.error('Erro ao adicionar produto.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.products.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
      toast.success('Produto atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar produto.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto removido!');
    }
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const category = formData.get('category') as string;
    const details = (category === 'iPhone' || category === 'Smartphone' || category === 'Games')
      ? { storage: formData.get('storage'), ram: formData.get('ram') }
      : undefined;

    const data = {
      name: formData.get('name'),
      category: category,
      description: formData.get('description'),
      buy_price: Number(formData.get('buy_price')),
      sell_price: Number(formData.get('sell_price')),
      stock_quantity: Number(formData.get('stock_quantity')),
      supplier_id: formData.get('supplier_id'),
      details
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      addMutation.mutate({
        ...data,
        status: 'disponivel',
        created_at: new Date().toISOString()
      });
    }
  };

  const [statusFilter, setStatusFilter] = useState<'all' | 'disponivel' | 'vendido'>('all');

  const filteredProducts = products.filter(product => {
    const isSold = product.status === 'vendido' || (product.stock_quantity ?? 1) === 0;
    if (statusFilter === 'disponivel') return !isSold;
    if (statusFilter === 'vendido') return isSold;
    return true;
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque de Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie seu estoque e produtos cadastrados</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter('disponivel')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'disponivel' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Disponíveis ({products.filter(p => p.status !== 'vendido' && (p.stock_quantity ?? 1) > 0).length})
            </button>
            <button
              onClick={() => setStatusFilter('vendido')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'vendido' ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Vendidos ({products.filter(p => p.status === 'vendido' || (p.stock_quantity ?? 1) === 0).length})
            </button>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingProduct(null);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {isAdding ? 'Fechar' : 'Adicionar Produto'}
        </button>
      </div>

      {(isAdding || editingProduct) && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
          <form key={editingProduct?.id || 'new-product'} onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <input name="name" defaultValue={editingProduct?.name} required className="w-full p-2 border rounded-md" placeholder="Ex: Produto X" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <select 
                name="category" 
                defaultValue={editingProduct?.category || 'Outro'} 
                required 
                className="w-full p-2 border rounded-md bg-background"
                onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
              >
                <option value="iPhone">iPhone</option>
                <option value="Smartphone">Smartphone</option>
                <option value="Games">Games</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            {(editingProduct?.category === 'iPhone' || editingProduct?.category === 'Smartphone' || editingProduct?.category === 'Games') && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Armazenamento</label>
                  <input name="storage" defaultValue={editingProduct?.details?.storage} className="w-full p-2 border rounded-md" placeholder="Ex: 128GB" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Memória RAM</label>
                  <input name="ram" defaultValue={editingProduct?.details?.ram} className="w-full p-2 border rounded-md" placeholder="Ex: 8GB" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade</label>
              <input name="stock_quantity" defaultValue={editingProduct?.stock_quantity} type="number" required className="w-full p-2 border rounded-md" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preço de Compra</label>
              <input name="buy_price" defaultValue={editingProduct?.buy_price} type="number" step="0.01" required className="w-full p-2 border rounded-md" placeholder="R$ 0,00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preço de Venda</label>
              <input name="sell_price" defaultValue={editingProduct?.sell_price} type="number" step="0.01" className="w-full p-2 border rounded-md" placeholder="R$ 0,00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fornecedor</label>
              <select name="supplier_id" defaultValue={editingProduct?.supplier_id} className="w-full p-2 border rounded-md bg-background">
                <option value="">Selecione...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <label className="text-sm font-medium">Descrição</label>
              <textarea name="description" defaultValue={editingProduct?.description} className="w-full p-2 border rounded-md" />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex-1">
                {editingProduct ? 'Atualizar' : 'Salvar'}
              </button>
              <button type="button" onClick={() => { setIsAdding(false); setEditingProduct(null); }} className="bg-muted text-muted-foreground px-4 py-2 rounded-md font-medium">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Qtd</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Preço (Compra)</th>
                <th className="px-4 py-3 font-medium">Preço (Venda)</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map((product) => {
                const isSold = product.status === 'vendido' || (product.stock_quantity ?? 1) === 0;
                return (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3">{product.category}</td>
                    <td className="px-4 py-3">{product.stock_quantity}</td>
                    <td className="px-4 py-3">
                      {isSold ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Vendido
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Disponível
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatBRL(product.buy_price)}</td>
                    <td className="px-4 py-3">{product.sell_price ? formatBRL(product.sell_price) : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingProduct(product);
                            setIsAdding(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-muted-foreground hover:text-foreground p-2 rounded-md transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteId(product.id)}
                          className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum produto encontrado com este filtro.
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
        title="Excluir Produto"
        message="Tem certeza que deseja remover este produto? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />
    </div>
  );
}
