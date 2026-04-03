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
  const [editingIphone, setEditingIphone] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: iphones = [], isLoading } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => db.suppliers.list(),
  });

  const addMutation = useMutation({
    mutationFn: (newIphone: any) => db.iphones.create(newIphone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      setIsAdding(false);
      toast.success('iPhone adicionado ao estoque!');
    },
    onError: () => toast.error('Erro ao adicionar iPhone.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.iphones.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      setEditingIphone(null);
      toast.success('Aparelho atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar aparelho.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.iphones.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      toast.success('iPhone removido!');
    }
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      model: formData.get('model'),
      storage: formData.get('storage'),
      color: formData.get('color'),
      condition: formData.get('condition'),
      buy_price: Number(formData.get('buy_price')),
      imei: formData.get('imei'),
      supplier_id: formData.get('supplier_id'),
    };

    if (editingIphone) {
      updateMutation.mutate({ id: editingIphone.id, data });
    } else {
      addMutation.mutate({
        ...data,
        buy_date: new Date().toISOString(),
        status: 'disponivel'
      });
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie seus aparelhos</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingIphone(null);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {isAdding ? 'Fechar' : 'Adicionar iPhone'}
        </button>
      </div>

      {(isAdding || editingIphone) && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingIphone ? 'Editar Aparelho' : 'Novo Aparelho'}</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo</label>
              <input name="model" defaultValue={editingIphone?.model} required className="w-full p-2 border rounded-md" placeholder="Ex: iPhone 13" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Armazenamento</label>
              <select name="storage" defaultValue={editingIphone?.storage || '128GB'} required className="w-full p-2 border rounded-md bg-background">
                <option value="64GB">64GB</option>
                <option value="128GB">128GB</option>
                <option value="256GB">256GB</option>
                <option value="512GB">512GB</option>
                <option value="1TB">1TB</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <input name="color" defaultValue={editingIphone?.color} required className="w-full p-2 border rounded-md" placeholder="Ex: Midnight" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Condição</label>
              <select name="condition" defaultValue={editingIphone?.condition || 'seminovo'} required className="w-full p-2 border rounded-md bg-background">
                <option value="lacrado">Lacrado (1 Ano)</option>
                <option value="seminovo">Seminovo (6 Meses)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">IMEI / Serial</label>
              <input name="imei" defaultValue={editingIphone?.imei} className="w-full p-2 border rounded-md" placeholder="Ex: 35..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preço de Compra</label>
              <input name="buy_price" defaultValue={editingIphone?.buy_price} type="number" step="0.01" required className="w-full p-2 border rounded-md" placeholder="R$ 0,00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fornecedor</label>
              <select name="supplier_id" defaultValue={editingIphone?.supplier_id} required className="w-full p-2 border rounded-md bg-background">
                <option value="">Selecione...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex-1">
                {editingIphone ? 'Atualizar' : 'Salvar'}
              </button>
              <button type="button" onClick={() => { setIsAdding(false); setEditingIphone(null); }} className="bg-muted text-muted-foreground px-4 py-2 rounded-md font-medium">
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
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Armazenamento</th>
                <th className="px-4 py-3 font-medium">IMEI</th>
                <th className="px-4 py-3 font-medium">Condição</th>
                <th className="px-4 py-3 font-medium">Cor</th>
                <th className="px-4 py-3 font-medium">Preço (Compra)</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {iphones.map((iphone) => (
                <tr key={iphone.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{iphone.model}</td>
                  <td className="px-4 py-3">{iphone.storage}</td>
                  <td className="px-4 py-3 font-mono text-xs">{iphone.imei || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      iphone.condition === 'lacrado' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {iphone.condition === 'lacrado' ? 'Lacrado' : 'Seminovo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{iphone.color}</td>
                  <td className="px-4 py-3">{formatBRL(iphone.buy_price)}</td>
                  <td className="px-4 py-3">{format(new Date(iphone.buy_date), 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      iphone.status === 'disponivel' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {iphone.status === 'disponivel' ? 'Disponível' : 'Vendido'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingIphone(iphone);
                          setIsAdding(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-muted-foreground hover:text-foreground p-2 rounded-md transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteId(iphone.id)}
                        className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {iphones.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum aparelho no estoque.
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
        title="Excluir Aparelho"
        message="Tem certeza que deseja remover este iPhone do estoque? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />
    </div>
  );
}
