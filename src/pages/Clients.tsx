import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { Plus, Trash2, Phone, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmationModal from '../components/ui/ConfirmationModal';

export default function Clients() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
  });

  const addMutation = useMutation({
    mutationFn: (newClient: any) => db.clients.create(newClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsAdding(false);
      toast.success('Cliente adicionado!');
    },
    onError: () => toast.error('Erro ao adicionar cliente.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.clients.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditingClient(null);
      toast.success('Cliente atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar cliente.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.clients.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente removido!');
    }
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addMutation.mutate({
      name: formData.get('name'),
      phone: formData.get('phone'),
      cpf: formData.get('cpf'),
      email: formData.get('email'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClient) return;
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingClient.id,
      data: {
        name: formData.get('name'),
        phone: formData.get('phone'),
        cpf: formData.get('cpf'),
        email: formData.get('email'),
        address: formData.get('address'),
        city: formData.get('city'),
        state: formData.get('state'),
      }
    });
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie sua carteira de clientes</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingClient(null);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </button>
      </div>

      {(isAdding || editingClient) && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingClient ? 'Editar Cliente' : 'Cadastrar Cliente'}</h2>
          <form onSubmit={editingClient ? handleUpdate : handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Completo</label>
              <input name="name" defaultValue={editingClient?.name} required className="w-full p-2 border rounded-md" placeholder="Ex: João da Silva" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone / WhatsApp</label>
              <input name="phone" defaultValue={editingClient?.phone} required className="w-full p-2 border rounded-md" placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CPF</label>
              <input name="cpf" defaultValue={editingClient?.cpf} className="w-full p-2 border rounded-md" placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input name="email" type="email" defaultValue={editingClient?.email} className="w-full p-2 border rounded-md" placeholder="joao@email.com" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Endereço</label>
              <input name="address" defaultValue={editingClient?.address} className="w-full p-2 border rounded-md" placeholder="Rua, Número, Bairro" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <input name="city" defaultValue={editingClient?.city} className="w-full p-2 border rounded-md" placeholder="Ex: São Paulo" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <input name="state" defaultValue={editingClient?.state} className="w-full p-2 border rounded-md" placeholder="Ex: SP" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => { setIsAdding(false); setEditingClient(null); }} className="bg-muted text-muted-foreground px-4 py-2 rounded-md font-medium">
                Cancelar
              </button>
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
                {editingClient ? 'Atualizar Cliente' : 'Salvar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => {
          const clientSales = sales.filter(s => s.client_id === client.id);
          return (
            <div key={client.id} className="bg-card border rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg">{client.name}</h3>
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      setEditingClient(client);
                      setIsAdding(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-muted-foreground hover:bg-muted p-1.5 rounded-md transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteId(client.id)}
                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{client.phone}</span>
                </div>
                {client.cpf && (
                  <div className="text-sm">
                    <span className="font-medium">CPF:</span> {client.cpf}
                  </div>
                )}
              </div>
              <div className="mt-auto pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{clientSales.length}</span> compras realizadas
                </p>
              </div>
            </div>
          );
        })}
        {clients.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border rounded-xl">
            Nenhum cliente cadastrado.
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Cliente"
        message="Tem certeza que deseja remover este cliente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />
    </div>
  );
}
