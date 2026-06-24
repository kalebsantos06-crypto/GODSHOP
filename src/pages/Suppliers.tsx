import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { Plus, Trash2, Building2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmationModal from '../components/ui/ConfirmationModal';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => db.suppliers.list(),
  });

  const { data: iphones = [] } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  const addMutation = useMutation({
    mutationFn: (newSupplier: any) => db.suppliers.create(newSupplier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsAdding(false);
      toast.success('Fornecedor adicionado!');
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar fornecedor:', error);
      toast.error(`Erro ao adicionar fornecedor: ${error?.message || error}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.suppliers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setEditingSupplier(null);
      toast.success('Fornecedor atualizado!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar fornecedor:', error);
      toast.error(`Erro ao atualizar fornecedor: ${error?.message || error}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.suppliers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fornecedor removido!');
    },
    onError: (error: any) => {
      console.error('Erro ao remover fornecedor:', error);
      toast.error(`Erro ao remover fornecedor: ${error?.message || error}`);
    }
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addMutation.mutate({
      name: formData.get('name') as string,
      contact: formData.get('contact') as string,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSupplier) return;
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingSupplier.id,
      data: {
        name: formData.get('name') as string,
        contact: formData.get('contact') as string,
      }
    });
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie seus fornecedores de aparelhos</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingSupplier(null);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </button>
      </div>

      {(isAdding || editingSupplier) && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}</h2>
          <form onSubmit={editingSupplier ? handleUpdate : handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Empresa / Contato</label>
              <input name="name" defaultValue={editingSupplier?.name} required className="w-full p-2 border rounded-md" placeholder="Ex: Fornecedor SP" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone / WhatsApp</label>
              <input name="contact" defaultValue={editingSupplier?.contact} required className="w-full p-2 border rounded-md" placeholder="(11) 99999-9999" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => { setIsAdding(false); setEditingSupplier(null); }} className="bg-muted text-muted-foreground px-4 py-2 rounded-md font-medium">
                Cancelar
              </button>
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
                {editingSupplier ? 'Atualizar Fornecedor' : 'Salvar Fornecedor'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(supplier => {
          const suppliedCount = iphones.filter(i => i.supplier_id === supplier.id).length;
          return (
            <div key={supplier.id} className="bg-card border rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg">{supplier.name}</h3>
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      setEditingSupplier(supplier);
                      setIsAdding(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-muted-foreground hover:bg-muted p-1.5 rounded-md transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteId(supplier.id)}
                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">{supplier.contact}</span>
              </div>
              <div className="mt-auto pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{suppliedCount}</span> aparelhos fornecidos
                </p>
              </div>
            </div>
          );
        })}
        {suppliers.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border rounded-xl">
            Nenhum fornecedor cadastrado.
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Fornecedor"
        message="Tem certeza que deseja remover este fornecedor? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />
    </div>
  );
}
