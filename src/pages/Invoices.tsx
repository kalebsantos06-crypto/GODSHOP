import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';

export default function Invoices() {
  const { data: sales = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
  });

  const { data: iphones = [], isLoading: isLoadingIphones } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
  });

  if (isLoadingSales || isLoadingIphones || isLoadingClients) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notas Fiscais / Garantias</h1>
        <p className="text-muted-foreground text-sm mt-1">Gere notas e termos de garantia para todas as vendas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sales.map(sale => {
          const iphone = iphones.find(i => i.id === sale.iphone_id);
          const client = clients.find(c => c.id === sale.client_id);

          return (
            <div key={sale.id} className="bg-card border rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{client?.name || 'Cliente Desconhecido'}</h3>
                  <p className="text-sm text-muted-foreground">{format(new Date(sale.sale_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1 mb-6 text-sm">
                <p><span className="font-medium">Aparelho:</span> {iphone?.model} {iphone?.storage}</p>
                <p><span className="font-medium">Valor:</span> {formatBRL(sale.sell_price)}</p>
                <p>
                  <span className="font-medium">Pagamento:</span> {sale.payment_method}
                  {sale.installments && sale.installments > 1 && (
                    ` (${sale.installments}x ${sale.installment_frequency === 'Semanal' ? 'Semanal' : 'Mensal'})`
                  )}
                </p>
              </div>
              <div className="mt-auto pt-4 border-t">
                <Link 
                  to={`/guarantee/${sale.id}`}
                  className="w-full bg-secondary text-secondary-foreground py-2 rounded-md font-medium text-sm flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  Gerar Nota / Termo
                </Link>
              </div>
            </div>
          );
        })}
        {sales.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border rounded-xl">
            Nenhuma venda registrada para emitir nota.
          </div>
        )}
      </div>
    </div>
  );
}
