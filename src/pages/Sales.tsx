import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { Plus, FileText, Filter, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function Sales() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
  });

  const { data: iphones = [] } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
  });

  const addMutation = useMutation({
    mutationFn: (newSale: any) => db.sales.create(newSale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      setIsAdding(false);
      toast.success('Venda registrada com sucesso!');
    },
    onError: () => toast.error('Erro ao registrar venda.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.sales.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      setEditingSale(null);
      toast.success('Venda atualizada com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar venda.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.sales.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['iphones'] });
      toast.success('Venda excluída com sucesso!');
    },
    onError: () => toast.error('Erro ao excluir venda.')
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addMutation.mutate({
      iphone_id: formData.get('iphone_id'),
      client_id: formData.get('client_id'),
      sell_price: Number(formData.get('sell_price')),
      payment_method: formData.get('payment_method'),
      sale_date: new Date().toISOString(),
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSale) return;
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingSale.id,
      data: {
        iphone_id: formData.get('iphone_id'),
        client_id: formData.get('client_id'),
        sell_price: Number(formData.get('sell_price')),
        payment_method: formData.get('payment_method'),
      }
    });
  };

  const availableIphones = iphones.filter(i => i.status === 'disponivel');

  const filteredSales = sales.filter(sale => {
    if (!startDate || !endDate) return true;
    const date = new Date(sale.sale_date);
    return isWithinInterval(date, {
      start: startOfDay(new Date(startDate)),
      end: endOfDay(new Date(endDate))
    });
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground text-sm mt-1">Registre e acompanhe suas vendas</p>
        </div>
        <div className="flex gap-2">
          <Link 
            to="/invoices"
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-secondary/80"
          >
            <FileText className="h-4 w-4" />
            Emitir Notas
          </Link>
          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingSale(null);
            }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nova Venda
          </button>
        </div>
      </div>

      {(isAdding || editingSale) && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingSale ? 'Editar Venda' : 'Registrar Venda'}</h2>
          <form onSubmit={editingSale ? handleUpdate : handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Aparelho</label>
              <select name="iphone_id" defaultValue={editingSale?.iphone_id} required className="w-full p-2 border rounded-md bg-background">
                <option value="">Selecione...</option>
                {editingSale && iphones.find(i => i.id === editingSale.iphone_id) && (
                  <option value={editingSale.iphone_id}>
                    {iphones.find(i => i.id === editingSale.iphone_id)?.model} - {iphones.find(i => i.id === editingSale.iphone_id)?.storage} (Atual)
                  </option>
                )}
                {availableIphones.map(i => (
                  <option key={i.id} value={i.id}>{i.model} - {i.storage} ({i.color})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <select name="client_id" defaultValue={editingSale?.client_id} required className="w-full p-2 border rounded-md bg-background">
                <option value="">Selecione...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor da Venda</label>
              <input name="sell_price" defaultValue={editingSale?.sell_price} type="number" step="0.01" required className="w-full p-2 border rounded-md" placeholder="R$ 0,00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de Pagamento</label>
              <select name="payment_method" defaultValue={editingSale?.payment_method} required className="w-full p-2 border rounded-md bg-background">
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão">Cartão</option>
              </select>
            </div>
            <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => { setIsAdding(false); setEditingSale(null); }} className="bg-muted text-muted-foreground px-4 py-2 rounded-md font-medium">
                Cancelar
              </button>
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
                {editingSale ? 'Atualizar Venda' : 'Confirmar Venda'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="p-2 border rounded-md text-sm"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span className="text-muted-foreground">até</span>
            <input 
              type="date" 
              className="p-2 border rounded-md text-sm"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-sm text-destructive hover:underline ml-2"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Aparelho</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Lucro</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSales.map((sale) => {
                const iphone = iphones.find(i => i.id === sale.iphone_id);
                const client = clients.find(c => c.id === sale.client_id);
                const profit = iphone ? sale.sell_price - iphone.buy_price : 0;

                return (
                  <tr key={sale.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">{format(new Date(sale.sale_date), 'dd/MM/yyyy', { locale: ptBR })}</td>
                    <td className="px-4 py-3 font-medium">{iphone ? `${iphone.model} ${iphone.storage}` : 'N/A'}</td>
                    <td className="px-4 py-3">{client?.name || 'N/A'}</td>
                    <td className="px-4 py-3">{formatBRL(sale.sell_price)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">{formatBRL(profit)}</td>
                    <td className="px-4 py-3">{sale.payment_method}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingSale(sale);
                            setIsAdding(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Editar Venda"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if(confirm('Tem certeza que deseja excluir esta venda? O aparelho voltará para o estoque.')) deleteMutation.mutate(sale.id);
                          }}
                          className="text-destructive hover:bg-destructive/10 transition-colors p-1 rounded-md"
                          title="Excluir Venda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <Link 
                          to={`/guarantee/${sale.id}`}
                          className="text-primary hover:underline text-xs font-medium ml-2"
                        >
                          Gerar Nota
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma venda encontrada no período.
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
