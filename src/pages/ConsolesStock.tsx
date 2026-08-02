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

const parseCurrencyInput = (value: any): number => {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const str = String(value).trim();
  const normalized = str
    .replace(/[^0-9.,-]/g, '')
    .replace(/\.(?=[^,]*$)/g, '')
    .replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
};

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
      toast.success('Eletrônico adicionado ao estoque!');
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar eletrônico:', error);
      toast.error(`Erro ao adicionar eletrônico: ${error?.message || 'Erro desconhecido'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.consoles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consoles'] });
      setEditingConsole(null);
      toast.success('Eletrônico atualizado!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar eletrônico:', error);
      toast.error(`Erro ao atualizar eletrônico: ${error?.message || 'Erro desconhecido'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.consoles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consoles'] });
      setDeleteId(null);
      toast.success('Eletrônico removido!');
    }
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawPrice = formData.get('buy_price');
    const parsedPrice = parseCurrencyInput(rawPrice);

    const data = {
      model: (formData.get('model') as string)?.trim(),
      version: (formData.get('version') as string)?.trim(),
      ram: (formData.get('ram') as string)?.trim() || '',
      condition: formData.get('condition') as string,
      buy_price: parsedPrice,
      category: (formData.get('category') as string) || 'console',
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
          <h1 className="text-2xl font-bold tracking-tight">Estoque de Eletrônicos & Eletros</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie consoles, TVs, panelas elétricas e outros eletrônicos</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingConsole(null);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {isAdding ? 'Fechar' : 'Adicionar Eletrônico'}
        </button>
      </div>

      {(isAdding || editingConsole) && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingConsole ? 'Editar Eletrônico' : 'Novo Eletrônico'}</h2>
          <form key={editingConsole?.id || 'new'} onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <select name="category" defaultValue={editingConsole?.category || 'console'} required className="w-full p-2 border rounded-md bg-background">
                <option value="console">Videogame / Console</option>
                <option value="tv">Televisor / TV</option>
                <option value="rice_cooker">Panela Elétrica de Arroz</option>
                <option value="outro">Outro Eletrônico / Eletro</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo / Marca</label>
              <input name="model" defaultValue={editingConsole?.model} required className="w-full p-2 border rounded-md" placeholder="Ex: Samsung 55, PlayStation 5, Panela Mondial" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Versão / Detalhes</label>
              <input name="version" defaultValue={editingConsole?.version} required className="w-full p-2 border rounded-md" placeholder="Ex: 4K Smart, Slim 1TB, 5 Xícaras 110V" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Memória RAM</label>
              <input 
                name="ram" 
                defaultValue={editingConsole?.ram} 
                className="w-full p-2 border rounded-md" 
                placeholder="Ex: 8GB, 16GB..." 
                list="ram-options-console"
              />
              <datalist id="ram-options-console">
                <option value="4GB" />
                <option value="6GB" />
                <option value="8GB" />
                <option value="12GB" />
                <option value="16GB" />
                <option value="24GB" />
                <option value="32GB" />
                <option value="64GB" />
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Condição / Garantia</label>
              <select name="condition" defaultValue={editingConsole?.condition || 'seminovo_6m'} required className="w-full p-2 border rounded-md bg-background">
                <optgroup label="Lacrado / Novo">
                  <option value="lacrado_3m">Lacrado (3 Meses de Garantia)</option>
                  <option value="lacrado_6m">Lacrado (6 Meses de Garantia)</option>
                  <option value="lacrado_1ano">Lacrado (1 Ano de Garantia)</option>
                </optgroup>
                <optgroup label="Seminovo / Usado">
                  <option value="seminovo_3m">Seminovo (3 Meses de Garantia)</option>
                  <option value="seminovo_6m">Seminovo (6 Meses de Garantia)</option>
                  <option value="seminovo_1ano">Seminovo (1 Ano de Garantia)</option>
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preço de Compra (R$)</label>
              <input 
                name="buy_price" 
                defaultValue={editingConsole?.buy_price} 
                type="text" 
                inputMode="decimal"
                required 
                className="w-full p-2 border rounded-md" 
                placeholder="R$ 0,00" 
              />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex-1 cursor-pointer">
                {editingConsole ? 'Atualizar' : 'Salvar'}
              </button>
              <button type="button" onClick={() => { setIsAdding(false); setEditingConsole(null); }} className="bg-muted text-muted-foreground px-4 py-2 rounded-md font-medium cursor-pointer">
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
        title="Excluir Eletrônico"
        message="Tem certeza que deseja remover este eletrônico do estoque? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />
    </div>
  );
}
