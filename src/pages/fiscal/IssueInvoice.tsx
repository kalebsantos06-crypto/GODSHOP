
import React, { useEffect, useState } from 'react';
import { FileText, Send, User, Package, Calculator, Save, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/db';

export default function IssueInvoice() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transmitting, setTransmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [suppliersData, unitsData, configData] = await Promise.all([
        db.suppliers.list(),
        db.product_units.list(),
        db.fiscal_configs.get()
      ]);
      setSuppliers(suppliersData || []);
      setStoreConfig(configData);
      // Filter for units that need fiscal regularization
      setUnits((unitsData || []).filter(u => u.fiscal_status !== 'Regular'));
    } catch (err) {
      console.error('Error loading data for invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const addUnit = (id: string) => {
    if (!id) return;
    const unit = units.find(u => u.id === id);
    if (unit && !selectedUnits.find(u => u.id === id)) {
      setSelectedUnits([...selectedUnits, unit]);
    }
  };

  const removeUnit = (id: string) => {
    setSelectedUnits(selectedUnits.filter(u => u.id !== id));
  };

  const totalAmount = selectedUnits.reduce((acc, curr) => acc + Number(curr.cost_price || 0), 0);

  const handleTransmit = async () => {
    if (!selectedSupplier) return alert('Selecione um fornecedor.');
    if (selectedUnits.length === 0) return alert('Adicione pelo menos um produto.');
    if (!storeConfig?.business_name) return alert('Configure os dados da sua loja em Configuração Fiscal antes de emitir notas.');

    setTransmitting(true);
    try {
      const supplier = suppliers.find(s => s.id === selectedSupplier);
      
      const invoiceData = {
        number: Math.floor(Math.random() * 1000000).toString(),
        series: '001',
        type: 'Entrada',
        status: 'Autorizada',
        // Store is the Issuer (Emitente)
        issuer_name: storeConfig.business_name,
        issuer_document: storeConfig.cnpj,
        issuer_address: storeConfig.address,
        // Supplier is the Recipient/Sender (Remetente)
        client_name: supplier?.name,
        client_document: supplier?.cnpj || supplier?.cpf,
        total_amount: totalAmount,
        access_key: Math.random().toString().substring(2, 46).padEnd(44, '0'),
        xml_url: '',
        pdf_url: '',
        created_at: new Date().toISOString()
      };

      await db.fiscal_documents.create(invoiceData);

      // Update unit status and link to fiscal info
      for (const unit of selectedUnits) {
        await db.product_units.update(unit.id, {
          fiscal_status: 'Regular',
          last_invoice_id: invoiceData.number
        });
      }

      alert('Nota Fiscal de Entrada transmitida e autorizada com sucesso!');
      navigate('/fiscal/invoices/issued');
    } catch (err) {
      console.error('Error transmitting invoice:', err);
      alert('Erro ao transmitir nota fiscal.');
    } finally {
      setTransmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Emitir Nota de Entrada</h1>
          <p className="text-muted-foreground text-sm">Regularização fiscal de aparelhos recebidos de fornecedores.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Fornecedor */}
          <div className="bg-card/50 border border-white/10 p-6 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              Dados do Remetente (Fornecedor)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Fornecedor</label>
                <select 
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none"
                >
                  <option value="">Selecione um fornecedor cadastrado...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.cnpj || s.cpf || 'S/D'})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Produtos */}
          <div className="bg-card/50 border border-white/10 p-6 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-500" />
              Aparelhos na Nota
            </h3>
            
            <div className="space-y-3">
              {selectedUnits.map(unit => (
                <div key={unit.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-sm font-bold">{unit.name}</p>
                    <p className="text-[10px] opacity-50 uppercase tracking-widest">{unit.identifier || 'S/N'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-black text-emerald-500">R$ {Number(unit.cost_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <button onClick={() => removeUnit(unit.id)} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-muted/10 border border-white/5 rounded-2xl space-y-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Selecionar do Inventário</label>
              <select 
                onChange={(e) => addUnit(e.target.value)}
                value=""
                className="w-full bg-muted/20 border border-white/10 p-2 rounded-xl outline-none text-sm"
              >
                <option value="">Buscar aparelho para regularizar...</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name} - {u.identifier || 'S/N'}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card/50 border border-white/10 p-6 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-amber-500" />
              Resumo da Operação
            </h3>
            <div className="space-y-2 border-b border-white/5 pb-4">
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Base de Cálculo ICMS</span>
                <span>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Valor Total da Compra</span>
                <span>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-muted-foreground uppercase">Total da Nota</span>
              <span className="text-2xl font-black text-emerald-500">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button 
            onClick={handleTransmit}
            disabled={transmitting || loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black py-4 rounded-2xl transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {transmitting ? (
              <span className="animate-pulse flex items-center gap-2">
                <Clock className="h-5 w-5 animate-spin" /> TRANSMITINDO...
              </span>
            ) : (
              <>
                <Send className="h-5 w-5" />
                TRANSMITIR NOTA DE ENTRADA
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Clock and Truck to imports
import { Clock, Truck } from 'lucide-react';
