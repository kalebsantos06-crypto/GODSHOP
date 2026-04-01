import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PriceTable() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingPrice, setEditingPrice] = useState<any>(null);

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
    onError: () => toast.error('Erro ao adicionar preço.')
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      model: formData.get('model'),
      storage: formData.get('storage'),
      price: Number(formData.get('price')),
    };

    if (editingPrice) {
      updateMutation.mutate({ id: editingPrice.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tabela de Preços (Venda)</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os preços de venda para seus clientes</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingPrice(null);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {isAdding ? 'Fechar' : 'Novo Preço'}
        </button>
      </div>

      {(isAdding || editingPrice) && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingPrice ? 'Editar Preço' : 'Cadastrar Preço'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo</label>
              <input name="model" defaultValue={editingPrice?.model} required className="w-full p-2 border rounded-md" placeholder="Ex: iPhone 13" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Armazenamento</label>
              <select name="storage" defaultValue={editingPrice?.storage || '128GB'} required className="w-full p-2 border rounded-md bg-background">
                <option value="64GB">64GB</option>
                <option value="128GB">128GB</option>
                <option value="256GB">256GB</option>
                <option value="512GB">512GB</option>
                <option value="1TB">1TB</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preço de Venda</label>
              <input name="price" defaultValue={editingPrice?.price} type="number" step="0.01" required className="w-full p-2 border rounded-md" placeholder="R$ 0,00" />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => { setIsAdding(false); setEditingPrice(null); }} className="bg-muted text-muted-foreground px-4 py-2 rounded-md font-medium">
                Cancelar
              </button>
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
                {editingPrice ? 'Atualizar Preço' : 'Salvar Preço'}
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
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Armazenamento</th>
                <th className="px-4 py-3 font-medium">Preço de Venda</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {prices.sort((a, b) => a.model.localeCompare(b.model)).map((item) => (
                <tr key={item.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{item.model}</td>
                  <td className="px-4 py-3">{item.storage}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{formatBRL(item.price)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingPrice(item);
                          setIsAdding(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-muted-foreground hover:text-foreground p-2 rounded-md transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if(confirm('Tem certeza?')) deleteMutation.mutate(item.id);
                        }}
                        className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {prices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum preço cadastrado na tabela.
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
