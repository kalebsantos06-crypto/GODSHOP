import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { Console } from '../types';
import { formatBRL } from '../lib/formatCurrency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getConditionLabel } from '../lib/utils';

interface ConsoleTableProps {
  consoles: Console[];
  onEdit: (console: Console) => void;
  onDelete: (id: string) => void;
}

export default function ConsoleTable({ consoles, onEdit, onDelete }: ConsoleTableProps) {
  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'console': return 'Videogame';
      case 'tv': return 'TV / Smart TV';
      case 'rice_cooker': return 'Panela Elétrica';
      case 'outro': return 'Outro';
      default: return 'Videogame'; // Fallback for old seed data
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium">Modelo / Marca</th>
            <th className="px-4 py-3 font-medium">Versão / Detalhes</th>
            <th className="px-4 py-3 font-medium">RAM</th>
            <th className="px-4 py-3 font-medium">Condição</th>
            <th className="px-4 py-3 font-medium">Preço (Compra)</th>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {consoles.map((console) => (
            <tr key={console.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  {getCategoryLabel(console.category)}
                </span>
              </td>
              <td className="px-4 py-3 font-medium">{console.model}</td>
              <td className="px-4 py-3">{console.version}</td>
              <td className="px-4 py-3">{console.ram || '-'}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  String(console.condition || '').startsWith('lacrado') ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {getConditionLabel(console.condition)}
                </span>
              </td>
              <td className="px-4 py-3">{formatBRL(console.buy_price)}</td>
              <td className="px-4 py-3">{format(new Date(console.buy_date), 'dd/MM/yyyy', { locale: ptBR })}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  console.status === 'disponivel' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {console.status === 'disponivel' ? 'Disponível' : 'Vendido'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => onEdit(console)} 
                    className="text-muted-foreground hover:text-foreground p-2 rounded-md transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => onDelete(console.id)} 
                    className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {consoles.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                Nenhum eletrônico no estoque.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
