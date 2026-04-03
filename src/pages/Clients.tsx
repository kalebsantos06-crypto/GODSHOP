import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { Plus, Trash2, Phone, Edit2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmationModal from '../components/ui/ConfirmationModal';

export default function Clients() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
  });

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.cpf && client.cpf.includes(searchTerm))
  );

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
    onError: (error) => {
      console.error('Erro ao adicionar cliente:', error);
      toast.error('Erro ao adicionar cliente.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.clients.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditingClient(null);
      toast.success('Cliente atualizado!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.clients.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente removido!');
    }
  });

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const street = formData.get('street') as string || '';
    const number = formData.get('number') as string || '';
    const neighborhood = formData.get('neighborhood') as string || '';
    const complement = formData.get('complement') as string || '';
    
    const addressParts = [];
    if (street) addressParts.push(street);
    if (number) addressParts.push(number);
    if (neighborhood) addressParts.push(neighborhood);
    if (complement) addressParts.push(complement);
    
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      cpf: formData.get('cpf') as string || undefined,
      email: formData.get('email') as string || undefined,
      street: street || undefined,
      number: number || undefined,
      neighborhood: neighborhood || undefined,
      complement: complement || undefined,
      city: formData.get('city') as string || undefined,
      state: formData.get('state') as string || undefined,
      address: addressParts.join(', ') || undefined,
    };
    addMutation.mutate(data);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClient) return;
    const formData = new FormData(e.currentTarget);
    const street = formData.get('street') as string || '';
    const number = formData.get('number') as string || '';
    const neighborhood = formData.get('neighborhood') as string || '';
    const complement = formData.get('complement') as string || '';
    
    const addressParts = [];
    if (street) addressParts.push(street);
    if (number) addressParts.push(number);
    if (neighborhood) addressParts.push(neighborhood);
    if (complement) addressParts.push(complement);
    
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      cpf: formData.get('cpf') as string || undefined,
      email: formData.get('email') as string || undefined,
      street: street || undefined,
      number: number || undefined,
      neighborhood: neighborhood || undefined,
      complement: complement || undefined,
      city: formData.get('city') as string || undefined,
      state: formData.get('state') as string || undefined,
      address: addressParts.join(', ') || undefined,
    };
    updateMutation.mutate({
      id: editingClient.id,
      data
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

      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 border rounded-xl bg-card shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
      </div>

      {(isAdding || editingClient) && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingClient ? 'Editar Cliente' : 'Cadastrar Cliente'}</h2>
          <form 
            key={editingClient?.id || 'new'}
            onSubmit={editingClient ? handleUpdate : handleAdd} 
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <input name="name" defaultValue={editingClient?.name} required className="w-full p-2 border rounded-md" placeholder="Ex: João da Silva" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone / WhatsApp</label>
                <input name="phone" defaultValue={editingClient?.phone} required className="w-full p-2 border rounded-md" placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">CPF</label>
                <input name="cpf" defaultValue={editingClient?.cpf} className="w-full p-2 border rounded-md" placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input name="email" type="email" defaultValue={editingClient?.email} className="w-full p-2 border rounded-md" placeholder="joao@email.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:col-span-2">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Rua</label>
                <input name="street" defaultValue={editingClient?.street} className="w-full p-2 border rounded-md" placeholder="Ex: Rua das Flores" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Número</label>
                <input name="number" defaultValue={editingClient?.number} className="w-full p-2 border rounded-md" placeholder="Ex: 123" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Complemento</label>
                <input name="complement" defaultValue={editingClient?.complement} className="w-full p-2 border rounded-md" placeholder="Ex: Apto 101" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bairro</label>
                <input name="neighborhood" defaultValue={editingClient?.neighborhood} className="w-full p-2 border rounded-md" placeholder="Ex: Centro" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade</label>
                <input name="city" defaultValue={editingClient?.city} className="w-full p-2 border rounded-md" placeholder="Ex: São Paulo" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado (UF)</label>
                <input name="state" defaultValue={editingClient?.state} className="w-full p-2 border rounded-md" placeholder="Ex: SP" maxLength={2} />
              </div>
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
        {filteredClients.map(client => {
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
              <div className="flex flex-col gap-2 text-muted-foreground mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{client.phone}</span>
                  </div>
                  <a 
                    href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-emerald-500 text-white p-2 rounded-full hover:bg-emerald-600 transition-colors shadow-sm"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
                {client.cpf && (
                  <div className="text-sm">
                    <span className="font-medium">CPF:</span> {client.cpf}
                  </div>
                )}
                {(client.street || client.number || client.neighborhood || client.city) && (
                  <div className="text-sm truncate">
                    <span className="font-medium">End:</span> {client.street}{client.number ? `, ${client.number}` : ''}{client.neighborhood ? ` - ${client.neighborhood}` : ''}{client.city ? ` - ${client.city}` : ''}
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
        {filteredClients.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border rounded-xl">
            {searchTerm ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
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
