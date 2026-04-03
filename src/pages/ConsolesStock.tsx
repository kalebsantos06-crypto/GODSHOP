import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { Plus, Trash2, Edit2, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Console } from '../types';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import ConsoleTable from '../components/ConsoleTable';

export default function ConsolesStock() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingConsole, setEditingConsole] = useState<Console | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: consoles = [], isLoading } = useQuery({
    queryKey: ['consoles'],
    queryFn: () => db.consoles.list(),
  });

  const addMutation = useMutation({
    mutationFn: (newConsole: any) => db.consoles.create(newConsole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consoles'] });
      setIsAdding(false);
      toast.success('Console adicionado ao estoque!');
    },
    onError: () => toast.error('Erro ao adicionar console.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.consoles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consoles'] });
      setEditingConsole(null);
      toast.success('Console atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar console.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.consoles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consoles'] });
      toast.success('Console removido!');
    }
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      model: formData.get('model') as string,
      version: formData.get('version') as string,
      condition: formData.get('condition') as string,
      buy_price: Number(formData.get('buy_price')),
    };

    if (editingConsole) {
      updateMutation.mutate({ id: editingConsole.id, data });
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
          <h1 className="text-2xl font-bold tracking-tight">Estoque de Consoles</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie seus consoles</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingConsole(null);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {isAdding ? 'Fechar' : 'Adicionar Console'}
        </button>
      </div>

      {(isAdding || editingConsole) && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingConsole ? 'Editar Console' : 'Novo Console'}</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo</label>
              <input name="model" defaultValue={editingConsole?.model} required className="w-full p-2 border rounded-md" placeholder="Ex: PlayStation" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Versão</label>
              <input name="version" defaultValue={editingConsole?.version} required className="w-full p-2 border rounded-md" placeholder="Ex: PS4" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Condição</label>
              <select name="condition" defaultValue={editingConsole?.condition || 'seminovo'} required className="w-full p-2 border rounded-md bg-background">
                <option value="lacrado">Lacrado (1 Ano)</option>
                <option value="seminovo">Seminovo (6 Meses)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preço de Compra</label>
              <input name="buy_price" defaultValue={editingConsole?.buy_price} type="number" step="0.01" required className="w-full p-2 border rounded-md" placeholder="R$ 0,00" />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex-1">
                {editingConsole ? 'Atualizar' : 'Salvar'}
              </button>
              <button type="button" onClick={() => { setIsAdding(false); setEditingConsole(null); }} className="bg-muted text-muted-foreground px-4 py-2 rounded-md font-medium">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <ConsoleTable 
          consoles={consoles} 
          onEdit={(console) => {
            setEditingConsole(console);
            setIsAdding(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onDelete={(id) => setDeleteId(id)}
        />
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Console"
        message="Tem certeza que deseja remover este console do estoque? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />
    </div>
  );
}
