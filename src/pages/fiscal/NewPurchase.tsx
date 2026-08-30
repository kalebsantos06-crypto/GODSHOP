
import React, { useState, useEffect } from 'react';
import { Truck, FileText, Upload, Plus, Trash2, Smartphone, Gamepad2, Package, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/db';

export default function NewPurchase() {
  const navigate = useNavigate();
  const [hasInvoice, setHasInvoice] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Supplier Info
  const [supplierType, setSupplierType] = useState('PJ');
  const [supplierName, setSupplierName] = useState('');
  const [supplierDocument, setSupplierDocument] = useState('');
  const [supplierIE, setSupplierIE] = useState('');

  // Invoice Info
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [series, setSeries] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [accessKey, setAccessKey] = useState('');

  // Items
  const [items, setItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('iPhone');
  const [newItemIdentifier, setNewItemIdentifier] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemSellPrice, setNewItemSellPrice] = useState('');
  const [newItemSpecs, setNewItemSpecs] = useState({
    storage: '',
    color: '',
    battery_health: '',
    condition: 'Excelente'
  });

  const addItem = () => {
    if (!newItemName) return alert('Informe o nome do produto.');
    const item = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName,
      category: newItemCategory,
      identifier: newItemIdentifier,
      cost_price: Number(newItemCost),
      sell_price: Number(newItemSellPrice),
      specs: { ...newItemSpecs }
    };
    setItems([...items, item]);
    setNewItemName('');
    setNewItemIdentifier('');
    setNewItemCost('');
    setNewItemSellPrice('');
    setNewItemSpecs({
      storage: '',
      color: '',
      battery_health: '',
      condition: 'Excelente'
    });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const totalAmount = items.reduce((acc, curr) => acc + curr.cost_price, 0);

  const handleSave = async () => {
    if (!supplierName) return alert('Informe o nome do fornecedor.');
    if (items.length === 0) return alert('Adicione pelo menos um produto.');

    setLoading(true);
    try {
      // 1. Create Purchase record
      const purchase = await db.purchases.create({
        supplier_name: supplierName,
        supplier_document: supplierDocument,
        supplier_type: supplierType,
        has_invoice: hasInvoice,
        invoice_number: invoiceNumber,
        series: series,
        access_key: accessKey,
        purchase_date: purchaseDate,
        total_amount: totalAmount,
        status: 'Concluída',
        created_at: new Date().toISOString()
      });

      // 2. Create Product Units in Inventory
      for (const item of items) {
        await db.product_units.create({
          name: item.name,
          category: item.category,
          identifier: item.identifier,
          cost_price: item.cost_price,
          sell_price: item.sell_price,
          status: 'Disponível',
          fiscal_status: hasInvoice ? 'Regular' : 'Sem Nota',
          supplier_name: supplierName,
          purchase_id: purchase.id,
          // Store technical specs in a structured way
          color: item.specs.color,
          storage: item.specs.storage,
          battery_health: item.specs.battery_health,
          condition: item.specs.condition,
          created_at: new Date().toISOString()
        });
      }

      alert('Compra e entrada de estoque registradas com sucesso!');
      navigate('/fiscal/stock');
    } catch (err) {
      console.error('Error saving purchase:', err);
      alert('Erro ao registrar compra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Nova Entrada de Mercadoria</h1>
          <p className="text-muted-foreground text-sm">Registro de compras e detalhamento técnico dos aparelhos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Fornecedor */}
          <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-500" />
              Origem / Fornecedor
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Tipo de Pessoa</label>
                <select 
                  value={supplierType}
                  onChange={(e) => setSupplierType(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none"
                >
                  <option value="PJ">Pessoa Jurídica (Empresa)</option>
                  <option value="PF">Pessoa Física (Particular)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Nome / Razão Social</label>
                <input 
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  placeholder="Nome do fornecedor" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">CPF / CNPJ</label>
                <input 
                  value={supplierDocument}
                  onChange={(e) => setSupplierDocument(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  placeholder="Documento" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">I.E. / RG</label>
                <input 
                  value={supplierIE}
                  onChange={(e) => setSupplierIE(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                />
              </div>
            </div>
          </div>

          {/* Documento da Compra */}
          <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Documento Fiscal de Origem
            </h3>
            
            <div className="flex items-center gap-4 p-3 bg-muted/10 rounded-2xl border border-white/5">
              <span className="text-sm font-medium">A compra possui nota fiscal?</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setHasInvoice(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${hasInvoice ? 'bg-emerald-500 text-black' : 'bg-muted/20 text-muted-foreground'}`}
                >
                  Sim
                </button>
                <button 
                  onClick={() => setHasInvoice(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${!hasInvoice ? 'bg-emerald-500 text-black' : 'bg-muted/20 text-muted-foreground'}`}
                >
                  Não
                </button>
              </div>
            </div>

            {hasInvoice ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Número da NF</label>
                  <input 
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Série</label>
                  <input 
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Data da Compra</label>
                  <input 
                    type="date" 
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <p className="text-sm text-amber-500 font-bold">Compra sem documento fiscal de origem.</p>
                <p className="text-xs text-muted-foreground mt-1">Será necessária a emissão de Nota de Entrada para regularização.</p>
              </div>
            )}
          </div>

          {/* Produtos/Itens */}
          <div className="bg-card/50 border border-white/10 p-6 rounded-3xl space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" />
              Configurações do Aparelho / Game
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Produto / Modelo</label>
                <input 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 p-2 rounded-xl text-sm outline-none" 
                  placeholder="Ex: iPhone 15 Pro Max" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Categoria</label>
                <select 
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 p-2 rounded-xl text-sm outline-none"
                >
                  <option>iPhone</option>
                  <option>Console / Game</option>
                  <option>Watch / Tablet</option>
                  <option>Acessório</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Capacidade / HD</label>
                <input 
                  value={newItemSpecs.storage}
                  onChange={(e) => setNewItemSpecs({ ...newItemSpecs, storage: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-2 rounded-xl text-sm outline-none" 
                  placeholder="Ex: 128GB / 1TB" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Cor</label>
                <input 
                  value={newItemSpecs.color}
                  onChange={(e) => setNewItemSpecs({ ...newItemSpecs, color: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-2 rounded-xl text-sm outline-none" 
                  placeholder="Ex: Titânio Natural" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Saúde Bateria (%)</label>
                <input 
                  value={newItemSpecs.battery_health}
                  onChange={(e) => setNewItemSpecs({ ...newItemSpecs, battery_health: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-2 rounded-xl text-sm outline-none" 
                  placeholder="Ex: 100%" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Estado / Condição</label>
                <select 
                  value={newItemSpecs.condition}
                  onChange={(e) => setNewItemSpecs({ ...newItemSpecs, condition: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-2 rounded-xl text-sm outline-none"
                >
                  <option>Novo / Lacrado</option>
                  <option>Excelente / Vitrine</option>
                  <option>Bom</option>
                  <option>Regular</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">IMEI / Serial</label>
                <input 
                  value={newItemIdentifier}
                  onChange={(e) => setNewItemIdentifier(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 p-2 rounded-xl text-sm outline-none" 
                  placeholder="Número de identificação" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Custo Unitário</label>
                <input 
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 p-2 rounded-xl text-sm outline-none" 
                  placeholder="0.00" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Preço Venda</label>
                <input 
                  value={newItemSellPrice}
                  onChange={(e) => setNewItemSellPrice(e.target.value)}
                  className="w-full bg-muted/20 border border-white/10 p-2 rounded-xl text-sm outline-none" 
                  placeholder="0.00" 
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <button 
                  onClick={addItem}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 py-3 rounded-xl text-xs font-bold text-emerald-500 transition flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> ADICIONAR APARELHO À LISTA
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/10 rounded-xl border border-white/5 group">
                  <div>
                    <p className="text-sm font-bold">{item.name} {item.specs.storage} {item.specs.color}</p>
                    <div className="flex items-center gap-2 text-[9px] opacity-50 uppercase">
                      <span>{item.identifier || 'S/N'}</span>
                      <span>•</span>
                      <span>Bateria: {item.specs.battery_health || 'N/A'}</span>
                      <span>•</span>
                      <span className="text-emerald-500 font-bold">{item.specs.condition}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xs font-bold">R$ {item.cost_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg transition opacity-0 group-hover:opacity-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Resumo Financeiro</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Total de Itens</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <span className="text-xs font-bold text-muted-foreground uppercase">Valor Total</span>
                <span className="text-2xl font-black text-emerald-500">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Anexos</h3>
            <div className="space-y-3">
              <button className="w-full p-4 border-2 border-dashed border-white/10 rounded-2xl hover:bg-white/5 transition flex flex-col items-center gap-2">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest">XML da Nota</span>
              </button>
              <button className="w-full p-4 border-2 border-dashed border-white/10 rounded-2xl hover:bg-white/5 transition flex flex-col items-center gap-2">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest">DANFE / PDF</span>
              </button>
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black py-4 rounded-2xl transition shadow-xl shadow-emerald-500/20"
          >
            {loading ? 'PROCESSANDO...' : 'CONFIRMAR COMPRA & ENTRADA'}
          </button>
        </div>
      </div>
    </div>
  );
}
