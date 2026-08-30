
import React from 'react';
import InvoiceList from './InvoiceList';

export default function IssuedInvoices() {
  return (
    <div className="space-y-6">
      <div className="px-4 sm:px-6 pt-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Notas de Entrada Emitidas</h1>
        <p className="text-muted-foreground text-sm">Listagem completa de notas fiscais de entrada para regularização de estoque.</p>
      </div>
      <InvoiceList />
    </div>
  );
}
