import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '../lib/dateUtils';
import { Link } from 'react-router-dom';
import { Receipt, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Invoices() {
  const { data: sales = [], isLoading: isLoadingSales, refetch: refetchSales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
    refetchInterval: 30000,
  });

  const { data: iphones = [], isLoading: isLoadingIphones } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  const { data: consoles = [], isLoading: isLoadingConsoles } = useQuery({
    queryKey: ['consoles'],
    queryFn: () => db.consoles.list(),
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
  });

  if (isLoadingSales || isLoadingIphones || isLoadingConsoles || isLoadingClients) {
    return <div>Carregando...</div>;
  }

  const handleSyncAll = async () => {
    const toastId = toast.loading('Sincronizando assinaturas...');
    try {
      await refetchSales();
      toast.success('Assinaturas sincronizadas!', { id: toastId });
    } catch (e) {
      toast.error('Erro ao sincronizar.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notas Fiscais / Garantias</h1>
          <p className="text-muted-foreground text-sm mt-1">Gere notas e termos de garantia para todas as vendas</p>
        </div>
        <button 
          onClick={handleSyncAll}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all active:scale-95 text-sm font-medium shadow-sm"
        >
          <RefreshCw className={cn("h-4 w-4", isLoadingSales && "animate-spin")} />
          Sincronizar Assinaturas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sales.map(sale => {
          const iphone = iphones.find(i => i.id === sale.iphone_id);
          const consoleItem = consoles.find(c => c.id === sale.console_id);
          const client = clients.find(c => c.id === sale.client_id);
          const isSigned = !!sale.signature_data || !!sale.signed_at;

          return (
            <div key={sale.id} className="bg-card border rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{client?.name || 'Cliente Desconhecido'}</h3>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <p>{format(parseLocalDate(sale.sale_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    <span>•</span>
                    <p className="font-mono">#{sale.id.split('-')[0].toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Receipt className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 mb-6 text-sm">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                  {isSigned ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Assinado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                      <Clock className="h-3.5 w-3.5" /> Assinatura Pendente
                    </span>
                  )}
                </div>
                <p>
                  <span className="font-medium">Item:</span> {iphone ? `${iphone.model} ${iphone.storage}` : (consoleItem ? `${consoleItem.model} ${consoleItem.version}` : 'N/A')}
                </p>
                <p><span className="font-medium">Valor:</span> {formatBRL(sale.sell_price)}</p>
                <p>
                  <span className="font-medium">Pagamento:</span> {sale.payment_method}
                  {sale.installments && sale.installments > 1 && (
                    ` (${sale.installments}x ${sale.installment_frequency === 'Semanal' ? 'Semanal' : (sale.installment_frequency === 'Quinzenal' ? 'Quinzenal' : 'Mensal')})`
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
