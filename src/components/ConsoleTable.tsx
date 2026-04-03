import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { Console } from '../types';
import { formatBRL } from '../lib/formatCurrency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConsoleTableProps {
  consoles: Console[];
  onEdit: (console: Console) => void;
  onDelete: (id: string) => void;
}

export default function ConsoleTable({ consoles, onEdit, onDelete }: ConsoleTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th className="px-6 py-3">Modelo</th>
            <th className="px-6 py-3">Versão</th>
            <th className="px-6 py-3">Condição</th>
            <th className="px-6 py-3">Preço Compra</th>
            <th className="px-6 py-3">Data Compra</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {consoles.map((console) => (
            <tr key={console.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900">{console.model}</td>
              <td className="px-6 py-4">{console.version}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  console.condition === 'lacrado' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {console.condition === 'lacrado' ? 'Lacrado' : 'Seminovo'}
                </span>
              </td>
              <td className="px-6 py-4">{formatBRL(console.buy_price)}</td>
              <td className="px-6 py-4">{format(new Date(console.buy_date), 'dd/MM/yyyy', { locale: ptBR })}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs ${console.status === 'disponivel' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {console.status === 'disponivel' ? 'Disponível' : 'Vendido'}
                </span>
              </td>
              <td className="px-6 py-4 text-right flex justify-end gap-2">
                <button onClick={() => onEdit(console)} className="text-blue-600 hover:text-blue-800"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => onDelete(console.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
