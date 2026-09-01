import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Search, Check, Mail, Phone, Shield, User, Users, Calendar, Laptop, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../types/AuthContext';
import ConfirmationModal from '../components/ui/ConfirmationModal';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'system' | 'external'>('system');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch system users
  const { data: systemUsers = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery<SystemUser[]>({
    queryKey: ['systemUsers'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) return await res.json();
        return [];
      } catch (err) {
        console.warn('Could not fetch system users:', err);
        return [];
      }
    }
  });

  // 2. Fetch external client registrations
  const { data: externalRegistrations = [], isLoading: loadingExternal, refetch: refetchExternal } = useQuery({
    queryKey: ['externalRegistrations', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const res = await fetch(`/api/public-clients?userId=${currentUser.id}`);
        if (res.ok) return await res.json();
        return [];
      } catch (err) {
        console.warn('Could not fetch external registrations:', err);
        return [];
      }
    },
    enabled: !!currentUser?.id,
  });

  // Mutations for System Users
  const addMutation = useMutation({
    mutationFn: async (newUser: Partial<SystemUser>) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao adicionar usuário');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] });
      setIsAdding(false);
      toast.success('Usuário cadastrado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao cadastrar usuário.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<SystemUser> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao atualizar usuário');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] });
      setEditingUser(null);
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar usuário.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover usuário');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] });
      setDeleteId(null);
      toast.success('Usuário removido com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao remover usuário.');
    }
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      role: formData.get('role') as string,
      status: formData.get('status') as string,
    };
    addMutation.mutate(data);
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      role: formData.get('role') as string,
      status: formData.get('status') as string,
    };
    updateMutation.mutate({ id: editingUser.id, data });
  };

  const filteredSystemUsers = systemUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone.includes(searchTerm)
  );

  const filteredExternal = externalRegistrations.filter((r: any) => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.cpf && r.cpf.includes(searchTerm)) ||
    r.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cadastro de Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os vendedores, equipe do sistema e acompanhe cadastros externos</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              if (activeTab === 'system') {
                refetchUsers();
              } else {
                refetchExternal();
              }
              toast.success('Lista atualizada!');
            }}
            className="p-2 border rounded-md hover:bg-card text-muted-foreground transition cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {activeTab === 'system' && (
            <button
              onClick={() => {
                setIsAdding(!isAdding);
                setEditingUser(null);
              }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium hover:bg-primary/90 transition shadow-md cursor-pointer w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Novo Usuário
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-4">
        <button
          onClick={() => {
            setActiveTab('system');
            setSearchTerm('');
          }}
          className={`pb-3 text-sm font-semibold relative transition cursor-pointer ${
            activeTab === 'system' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Vendedores & Equipe ({systemUsers.length})
          </div>
          {activeTab === 'system' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"></div>}
        </button>
        <button
          onClick={() => {
            setActiveTab('external');
            setSearchTerm('');
          }}
          className={`pb-3 text-sm font-semibold relative transition cursor-pointer ${
            activeTab === 'external' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <Laptop className="h-4 w-4" />
            Solicitações Externas ({externalRegistrations.length})
          </div>
          {activeTab === 'external' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"></div>}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder={activeTab === 'system' ? "Buscar por nome, email ou telefone..." : "Buscar solicitações por nome, CPF ou telefone..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 border rounded-xl bg-card shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>
      </div>

      {/* System Users Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Add/Edit User form */}
          {(isAdding || editingUser) && (
            <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
              <h2 className="text-base font-semibold">{editingUser ? 'Editar Cadastro de Usuário' : 'Cadastrar Novo Usuário'}</h2>
              <form onSubmit={editingUser ? handleUpdateSubmit : handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider opacity-70">Nome Completo</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingUser?.name || ''}
                    placeholder="Ex: João Vendedor"
                    className="w-full p-2.5 border rounded-lg text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider opacity-70">E-mail</label>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={editingUser?.email || ''}
                    placeholder="joao@vendedor.com"
                    className="w-full p-2.5 border rounded-lg text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider opacity-70">Telefone</label>
                  <input
                    name="phone"
                    defaultValue={editingUser?.phone || ''}
                    placeholder="(11) 99999-9999"
                    className="w-full p-2.5 border rounded-lg text-sm bg-background"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider opacity-70">Função</label>
                    <select
                      name="role"
                      defaultValue={editingUser?.role || 'Vendedor'}
                      className="w-full p-2.5 border rounded-lg text-sm bg-background"
                    >
                      <option value="Vendedor">Vendedor</option>
                      <option value="Gerente">Gerente</option>
                      <option value="Administrador">Administrador</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider opacity-70">Status</label>
                    <select
                      name="status"
                      defaultValue={editingUser?.status || 'Ativo'}
                      className="w-full p-2.5 border rounded-lg text-sm bg-background"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingUser(null);
                    }}
                    className="bg-muted text-muted-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-muted/80 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition shadow-md cursor-pointer"
                  >
                    {editingUser ? 'Atualizar Usuário' : 'Salvar Usuário'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of System Users */}
          {loadingUsers ? (
            <div className="text-center py-12 text-muted-foreground">Carregando usuários do sistema...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSystemUsers.map((u) => (
                <div key={u.id} className="bg-card border rounded-xl p-5 shadow-sm flex flex-col justify-between relative group overflow-hidden transition hover:shadow-md">
                  {/* Accent Line */}
                  <div className={`absolute top-0 left-0 right-0 h-[3px] ${u.status === 'Ativo' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                  
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-base tracking-tight">{u.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Shield className="h-3.5 w-3.5 text-primary opacity-80" />
                          <span className="text-xs text-muted-foreground font-medium">{u.role}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full ${
                        u.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-white/5'
                      }`}>
                        {u.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      {u.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>Cadastrado em {new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 mt-4 border-t border-white/5">
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setIsAdding(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      Editar
                    </button>
                    {u.email !== 'kalebsantos06@gmail.com' && (
                      <button
                        onClick={() => setDeleteId(u.id)}
                        className="bg-destructive/10 hover:bg-destructive/20 text-destructive py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Remover usuário"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {filteredSystemUsers.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-card border rounded-xl">
                  Nenhum usuário encontrado para a busca.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* External Registrations Tab */}
      {activeTab === 'external' && (
        <div className="space-y-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-sm text-amber-500">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Dica de Fluxo</strong>
              Estas são fichas cadastrais preenchidas remotamente por clientes através do link exclusivo de cadastro rápido. Ao aprovar uma solicitação na aba "Clientes", ela se torna um cliente definitivo do sistema.
            </div>
          </div>

          {loadingExternal ? (
            <div className="text-center py-12 text-muted-foreground">Carregando solicitações de cadastro...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExternal.map((r: any) => (
                <div key={r.id} className="bg-card border rounded-xl p-5 shadow-sm space-y-4 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base">{r.name}</h3>
                      <p className="text-xs text-primary font-medium mt-0.5">Cadastrado via link de vendas</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                      Pendente Aprovação
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground pt-2 border-t border-white/5">
                    <div>
                      <span className="block text-[9px] uppercase font-bold tracking-wider opacity-50">Telefone</span>
                      <span className="font-semibold text-foreground">{r.phone}</span>
                    </div>
                    {r.cpf && (
                      <div>
                        <span className="block text-[9px] uppercase font-bold tracking-wider opacity-50">CPF</span>
                        <span className="font-semibold text-foreground">{r.cpf}</span>
                      </div>
                    )}
                    {r.email && (
                      <div className="col-span-2">
                        <span className="block text-[9px] uppercase font-bold tracking-wider opacity-50">E-mail</span>
                        <span className="font-semibold text-foreground truncate block">{r.email}</span>
                      </div>
                    )}
                    {r.address && (
                      <div className="col-span-2">
                        <span className="block text-[9px] uppercase font-bold tracking-wider opacity-50">Endereço Fornecido</span>
                        <span className="font-semibold text-foreground block">{r.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Audit/Digital Signature metadata */}
                  <div className="bg-background/50 border border-white/5 rounded-lg p-3 space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Laptop className="h-3 w-3 text-primary" />
                      Trilha de Segurança Digital (Auditoria)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground/80 font-mono">
                      <div>IP: <span className="text-foreground">{r.security_ip || '127.0.0.1'}</span></div>
                      <div className="truncate">OS: <span className="text-foreground" title={r.security_os}>{r.security_os || 'Desconhecido'}</span></div>
                      <div className="col-span-2 truncate">Navegador: <span className="text-foreground" title={r.security_browser}>{r.security_browser || 'Desconhecido'}</span></div>
                      {r.created_at && (
                        <div className="col-span-2">Data/Hora: <span className="text-foreground">{new Date(r.created_at).toLocaleString('pt-BR')}</span></div>
                      )}
                    </div>
                    {r.assinatura_base64 && (
                      <div className="border-t border-white/5 pt-2 mt-1">
                        <span className="block text-[9px] uppercase font-bold tracking-wider opacity-50 mb-1">Assinatura Digital</span>
                        <div className="bg-white/5 rounded p-1 flex justify-center border border-white/5">
                          <img src={r.assinatura_base64} alt="Assinatura" className="h-12 object-contain invert dark:invert-0" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredExternal.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-card border rounded-xl">
                  Nenhuma solicitação externa cadastrada ou encontrada.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete User confirmation */}
      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Usuário"
        message="Tem certeza que deseja remover este usuário do sistema? Ele não aparecerá mais nos relatórios de equipe."
        confirmText="Excluir"
      />
    </div>
  );
}
