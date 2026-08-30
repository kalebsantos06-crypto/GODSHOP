import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, FileText, CheckCircle2, XCircle, Clock, Search, Filter, 
  Download, Printer, Copy, Check, ExternalLink, ShieldCheck, Building2, 
  Truck, Smartphone, Gamepad2, Layers, AlertTriangle, ArrowRight, Trash2,
  Barcode, Settings, Sliders, RefreshCw, Eye, Hash, Calendar, DollarSign,
  PackageCheck, Info, Sparkles, ChevronRight, X
} from 'lucide-react';
import { db } from '../../services/db';
import { toast } from 'sonner';
import { formatBRL } from '../../lib/formatCurrency';
import { cn } from '../../lib/utils';

interface DeviceItem {
  id: string;
  name: string;
  category: 'iPhone' | 'Console' | 'Watch/Tablet' | 'Acessório' | 'Outros';
  storage: string;
  color: string;
  battery_health: string;
  condition: string;
  identifier: string; // IMEI ou Serial
  cost_price: number;
  sell_price: number;
  quantity: number;
}

export default function FiscalHub() {
  const [activeTab, setActiveTab] = useState<'cadastro' | 'notas' | 'pendentes' | 'config'>('cadastro');
  const [loading, setLoading] = useState(true);

  // Store / Issuer Config State
  const [storeConfig, setStoreConfig] = useState({
    business_name: '',
    cnpj: '',
    ie: '',
    tax_regime: 'Simples Nacional',
    address: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    zip_code: '',
    provider: 'focus',
    environment: 'homolog'
  });

  // Supplier State
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierType, setSupplierType] = useState<'PF' | 'PJ'>('PJ');
  const [supplierName, setSupplierName] = useState('');
  const [supplierDocument, setSupplierDocument] = useState('');
  const [supplierIE, setSupplierIE] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  // Device / Item Form State
  const [itemCategory, setItemCategory] = useState<'iPhone' | 'Console' | 'Watch/Tablet' | 'Acessório' | 'Outros'>('iPhone');
  const [itemName, setItemName] = useState('');
  const [itemStorage, setItemStorage] = useState('128GB');
  const [itemColor, setItemColor] = useState('');
  const [itemBattery, setItemBattery] = useState('100');
  const [itemCondition, setItemCondition] = useState('Excelente / Vitrine');
  const [itemIdentifier, setItemIdentifier] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [itemSellPrice, setItemSellPrice] = useState('');

  // Cart / Batch of items to register in this invoice
  const [itemsList, setItemsList] = useState<DeviceItem[]>([]);

  // Purchase Document State
  const [hasInvoice, setHasInvoice] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceSeries, setInvoiceSeries] = useState('001');
  const [accessKey, setAccessKey] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Fiscal Documents List
  const [documents, setDocuments] = useState<any[]>([]);
  const [unprocessedUnits, setUnprocessedUnits] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Autorizada' | 'Rejeitada' | 'Processando'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Entrada' | 'Saída'>('ALL');

  // Modal DANFE preview state
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Submitting States
  const [submitting, setSubmitting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [configData, suppliersData, docsData, unitsData] = await Promise.all([
        db.fiscal_configs.get(),
        db.suppliers.list(),
        db.fiscal_documents.list(),
        db.product_units.list()
      ]);

      if (configData) {
        setStoreConfig({
          business_name: configData.business_name || '',
          cnpj: configData.cnpj || '',
          ie: configData.ie || '',
          tax_regime: configData.tax_regime || 'Simples Nacional',
          address: configData.address || '',
          neighborhood: configData.neighborhood || '',
          city: configData.city || '',
          state: configData.state || 'SP',
          zip_code: configData.zip_code || '',
          provider: configData.provider || 'focus',
          environment: configData.environment || 'homolog'
        });
      }

      setSuppliers(suppliersData || []);
      setDocuments(docsData || []);
      setUnprocessedUnits((unitsData || []).filter(u => u.fiscal_status !== 'Regular'));
    } catch (err) {
      console.error('Error loading fiscal data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper when selecting existing supplier
  const handleSelectSupplier = (id: string) => {
    setSelectedSupplierId(id);
    if (!id) {
      setSupplierName('');
      setSupplierDocument('');
      setSupplierIE('');
      setSupplierPhone('');
      return;
    }
    const sup = suppliers.find(s => s.id === id);
    if (sup) {
      setSupplierName(sup.name || '');
      setSupplierDocument(sup.cnpj || sup.cpf || '');
      setSupplierIE(sup.ie || '');
      setSupplierPhone(sup.phone || '');
      setSupplierType(sup.cnpj ? 'PJ' : 'PF');
    }
  };

  // Quick helper to generate a unique random IMEI / Serial for testing if needed
  const handleGenerateIdentifier = () => {
    if (itemCategory === 'iPhone') {
      const imei = '35' + Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
      setItemIdentifier(imei);
    } else {
      const serial = 'SN' + Math.random().toString(36).substring(2, 10).toUpperCase();
      setItemIdentifier(serial);
    }
    toast.info('Identificador / IMEI gerado automaticamente');
  };

  // Add Item to the Purchase/Invoice list
  const handleAddItem = () => {
    if (!itemName.trim()) {
      toast.error('Informe o Modelo/Aparelho.');
      return;
    }
    const cost = parseFloat(itemCost.replace(',', '.')) || 0;
    const sell = parseFloat(itemSellPrice.replace(',', '.')) || 0;

    const newItem: DeviceItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: itemName.trim(),
      category: itemCategory,
      storage: itemStorage,
      color: itemColor.trim() || 'Padrão',
      battery_health: itemCategory === 'iPhone' ? (itemBattery || '100') : '',
      condition: itemCondition,
      identifier: itemIdentifier.trim() || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      cost_price: cost,
      sell_price: sell,
      quantity: 1
    };

    setItemsList([...itemsList, newItem]);
    
    // Clear item inputs for next device
    setItemIdentifier('');
    toast.success(`${newItem.name} adicionado à lista da nota!`);
  };

  const handleRemoveItem = (id: string) => {
    setItemsList(itemsList.filter(item => item.id !== id));
  };

  // Totals calculations
  const totalCost = itemsList.reduce((acc, item) => acc + (item.cost_price * item.quantity), 0);
  const totalSell = itemsList.reduce((acc, item) => acc + (item.sell_price * item.quantity), 0);

  // Generate Official 44-digit Access Key format
  const generateAccessKey = (uf: string, date: string, cnpj: string, num: string) => {
    const cleanUf = uf === 'SP' ? '35' : uf === 'RJ' ? '33' : uf === 'MG' ? '31' : '35';
    const cleanDate = date.replace(/-/g, '').substring(2, 6); // AAMM
    const cleanCnpj = (cnpj || '00000000000199').replace(/\D/g, '').padStart(14, '0');
    const mod = '55';
    const serie = '001';
    const cleanNum = num.padStart(9, '0');
    const tipo = '1';
    const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    const partial = `${cleanUf}${cleanDate}${cleanCnpj}${mod}${serie}${cleanNum}${tipo}${randomCode}`;
    const dv = Math.floor(Math.random() * 10);
    return `${partial}${dv}`;
  };

  // Transmit / Issue Invoice and Register everything in Stock
  const handleTransmitAndRegister = async () => {
    if (itemsList.length === 0) {
      toast.error('Adicione pelo menos 1 aparelho ou game à lista para emitir a nota.');
      return;
    }

    if (!supplierName.trim()) {
      toast.error('Informe o nome do Fornecedor / Remetente.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Processando registro e transmitindo NF-e de entrada...');

    try {
      // 1. Ensure supplier is created/updated
      let finalSupplierId = selectedSupplierId;
      if (!finalSupplierId) {
        const newSup = await db.suppliers.create({
          name: supplierName.trim(),
          cnpj: supplierType === 'PJ' ? supplierDocument.trim() : '',
          cpf: supplierType === 'PF' ? supplierDocument.trim() : '',
          ie: supplierIE.trim(),
          phone: supplierPhone.trim(),
          type: supplierType
        });
        finalSupplierId = newSup.id;
      }

      // 2. Generate Invoice Number & Key
      const generatedNumber = invoiceNumber.trim() || Math.floor(100000 + Math.random() * 900000).toString();
      const generatedKey = accessKey.trim() || generateAccessKey(
        storeConfig.state, 
        invoiceDate, 
        storeConfig.cnpj, 
        generatedNumber
      );

      // 3. Register Product Units into stock
      for (const item of itemsList) {
        // Register in product_units (fiscal catalog)
        await db.product_units.create({
          name: item.name,
          category: item.category,
          storage: item.storage,
          color: item.color,
          battery_health: item.battery_health,
          condition: item.condition,
          identifier: item.identifier,
          cost_price: item.cost_price,
          sell_price: item.sell_price,
          status: 'Disponível',
          fiscal_status: 'Regular', // Now regularized via this invoice!
          supplier_name: supplierName.trim(),
          created_at: new Date().toISOString()
        });

        // Also register in the corresponding active inventory for sales if applicable
        if (item.category === 'iPhone') {
          await db.iphones.create({
            model: item.name,
            storage: item.storage,
            color: item.color,
            battery_health: parseInt(item.battery_health) || 100,
            condition: item.condition,
            imei: item.identifier,
            buy_price: item.cost_price,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            status: 'disponivel',
            supplier: supplierName.trim()
          });
        } else if (item.category === 'Console') {
          await db.consoles.create({
            model: item.name,
            version: item.storage,
            category: 'Console',
            serial_number: item.identifier,
            condition: item.condition,
            buy_price: item.cost_price,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            status: 'disponivel',
            supplier: supplierName.trim()
          });
        }
      }

      // 4. Create Fiscal Document Record
      const newInvoiceDoc = {
        number: generatedNumber,
        series: invoiceSeries || '001',
        type: 'Entrada',
        status: 'Autorizada',
        access_key: generatedKey,
        issue_date: invoiceDate,
        // Store Issuer Data
        issuer_name: storeConfig.business_name || 'Loja Principal',
        issuer_document: storeConfig.cnpj || '00.000.000/0001-00',
        issuer_ie: storeConfig.ie || 'ISENTO',
        issuer_address: storeConfig.address || 'Endereço Comercial',
        issuer_city: storeConfig.city || 'São Paulo',
        issuer_state: storeConfig.state || 'SP',
        // Supplier / Remetente Data
        client_name: supplierName.trim(),
        client_document: supplierDocument.trim() || (supplierType === 'PJ' ? '00.000.000/0001-99' : '000.000.000-00'),
        client_ie: supplierIE.trim() || 'ISENTO',
        total_amount: totalCost,
        items_count: itemsList.length,
        items_detail: itemsList,
        created_at: new Date().toISOString()
      };

      const savedDoc = await db.fiscal_documents.create(newInvoiceDoc);

      // Refresh data
      await loadAllData();

      // Reset form
      setItemsList([]);
      setItemName('');
      setItemIdentifier('');
      setItemCost('');
      setItemSellPrice('');
      setInvoiceNumber('');
      setAccessKey('');

      toast.success('Nota Fiscal de Entrada emitida e aparelhos registrados no estoque com sucesso!', { id: toastId });
      
      // Auto open DANFE preview for user convenience
      setPreviewDoc(savedDoc);
    } catch (err: any) {
      console.error('Error in fiscal transmit:', err);
      toast.error('Erro ao emitir nota fiscal e cadastrar produtos.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Save Store Fiscal Configuration
  const handleSaveStoreConfig = async () => {
    setSavingConfig(true);
    try {
      await db.fiscal_configs.update(storeConfig);
      toast.success('Dados da loja e configurações fiscais salvas com sucesso!');
    } catch (err) {
      console.error('Error saving fiscal config:', err);
      toast.error('Erro ao salvar configurações fiscais.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Copy Key to Clipboard
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    toast.success('Chave de acesso copiada!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Print DANFE
  const handlePrintDANFE = () => {
    window.print();
  };

  // Download XML
  const handleDownloadXML = (doc: any) => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${doc.access_key || '35260800000000000000550010000012341000000001'}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>ENTRADA DE MERCADORIA - COMPRA / REGULARIZACAO</natOp>
        <mod>55</mod>
        <serie>${doc.series || '001'}</serie>
        <nNF>${doc.number}</nNF>
        <dhEmi>${doc.created_at || new Date().toISOString()}</dhEmi>
        <tpNF>0</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
      </ide>
      <emit>
        <CNPJ>${doc.issuer_document?.replace(/\D/g, '') || '00000000000199'}</CNPJ>
        <xNome>${doc.issuer_name || 'EMPRESA EMISSORA LTDA'}</xNome>
        <enderEmit>
          <xLgr>${doc.issuer_address || 'Rua Principal'}</xLgr>
          <xMun>${doc.issuer_city || 'São Paulo'}</xMun>
          <UF>${doc.issuer_state || 'SP'}</UF>
        </enderEmit>
        <IE>${doc.issuer_ie || 'ISENTO'}</IE>
        <CRT>1</CRT>
      </emit>
      <dest>
        <CNPJ>${doc.client_document?.replace(/\D/g, '') || '00000000000100'}</CNPJ>
        <xNome>${doc.client_name || 'FORNECEDOR REMETENTE'}</xNome>
      </dest>
      <total>
        <ICMSTot>
          <vBC>${Number(doc.total_amount || 0).toFixed(2)}</vBC>
          <vICMS>0.00</vICMS>
          <vNF>${Number(doc.total_amount || 0).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>FOCUS_NFE_V4</verAplic>
      <chNFe>${doc.access_key || '35260800000000000000550010000012341000000001'}</chNFe>
      <dhRecbto>${doc.created_at || new Date().toISOString()}</dhRecbto>
      <nProt>135260000000001</nProt>
      <digVal>zAbCdEfGhIjKlMnOpQrStUvWxYz=</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFe_${doc.number || 'document'}_${doc.access_key || 'sefaz'}.xml`;
    document.body.appendChild(a);
    a.click();
    try {
      if (a && a.parentNode) {
        a.parentNode.removeChild(a);
      }
    } catch (e) {}
    URL.revokeObjectURL(url);
    toast.success('Arquivo XML da NF-e baixado!');
  };

  // Filtered documents for the table
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      (doc.number && doc.number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.client_name && doc.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.access_key && doc.access_key.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.issuer_name && doc.issuer_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || doc.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Main Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Nota NF & Gestão Fiscal</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Aba unificada de cadastro, entrada de mercadorias e emissão de notas fiscais.
              </p>
            </div>
          </div>
        </div>

        {/* Top Quick Status Pill */}
        <div className="flex items-center gap-2 bg-muted/20 border border-white/10 px-4 py-2 rounded-2xl text-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold">Emissor:</span>
          <span className="text-muted-foreground">{storeConfig.business_name || 'Loja (Não configurada)'}</span>
        </div>
      </div>

      {/* Unified Tab Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-muted/20 border border-white/10 rounded-2xl max-w-full">
        <button
          onClick={() => setActiveTab('cadastro')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
            activeTab === 'cadastro'
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <Plus className="h-4 w-4" />
          Cadastro & Emissão Tudo-em-Um
        </button>

        <button
          onClick={() => setActiveTab('notas')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
            activeTab === 'notas'
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <FileText className="h-4 w-4" />
          Notas Emitidas & Histórico ({documents.length})
        </button>

        <button
          onClick={() => setActiveTab('pendentes')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
            activeTab === 'pendentes'
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          Produtos sem NF ({unprocessedUnits.length})
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
            activeTab === 'config'
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <Settings className="h-4 w-4" />
          Configuração da Loja (Emissor)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CADASTRO & EMISSÃO TUDO EM UM                                      */}
      {/* ========================================================================= */}
      {activeTab === 'cadastro' && (
        <div className="space-y-6">
          {/* Quick Notice if Store Config is empty */}
          {!storeConfig.business_name && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-300 font-medium">
                  <strong>Atenção:</strong> Cadastre a Razão Social e CNPJ da sua loja na aba <strong>"Configuração da Loja"</strong> para emitir notas com os dados oficiais da sua empresa.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('config')}
                className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition shrink-0"
              >
                Configurar Agora
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Main Entry & Device Registration */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* SECTION 1: FORNECEDOR / ORIGEM */}
              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Truck className="h-5 w-5 text-emerald-500" />
                    1. Dados do Fornecedor / Remetente
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSupplierType('PJ')}
                      className={cn(
                        "px-3 py-1 text-[11px] font-bold rounded-lg transition",
                        supplierType === 'PJ' ? "bg-emerald-500 text-black" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      Pessoa Jurídica (PJ)
                    </button>
                    <button
                      onClick={() => setSupplierType('PF')}
                      className={cn(
                        "px-3 py-1 text-[11px] font-bold rounded-lg transition",
                        supplierType === 'PF' ? "bg-emerald-500 text-black" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      Pessoa Física (PF)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Existing Supplier */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Selecionar Fornecedor Cadastrado (Opcional)
                    </label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => handleSelectSupplier(e.target.value)}
                      className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Ou digite um novo fornecedor abaixo --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.cnpj || s.cpf || 'Sem doc'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Nome / Razão Social *
                    </label>
                    <input
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500"
                      placeholder="Ex: Apple Distribuidora ou Nome do Vendedor"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      {supplierType === 'PJ' ? 'CNPJ' : 'CPF'}
                    </label>
                    <input
                      value={supplierDocument}
                      onChange={(e) => setSupplierDocument(e.target.value)}
                      className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500"
                      placeholder={supplierType === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Inscrição Estadual / RG
                    </label>
                    <input
                      value={supplierIE}
                      onChange={(e) => setSupplierIE(e.target.value)}
                      className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500"
                      placeholder="Isento ou Nº da I.E."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Telefone / WhatsApp
                    </label>
                    <input
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: CADASTRO DO APARELHO / GAME COM ESPECIFICAÇÕES TÉCNICAS */}
              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-blue-500" />
                    2. Especificações do Aparelho / Game
                  </h3>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Preencha os detalhes e clique em Adicionar à Nota
                  </span>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(['iPhone', 'Console', 'Watch/Tablet', 'Acessório', 'Outros'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setItemCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap",
                        itemCategory === cat 
                          ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                          : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {/* Model Name */}
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Modelo / Produto *
                    </label>
                    <input
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-blue-500 font-medium"
                      placeholder={itemCategory === 'iPhone' ? 'Ex: iPhone 15 Pro Max' : 'Ex: PlayStation 5 Slim'}
                    />
                  </div>

                  {/* Storage / Capacity */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Armazenamento / HD
                    </label>
                    <select
                      value={itemStorage}
                      onChange={(e) => setItemStorage(e.target.value)}
                      className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                    >
                      <option value="64GB">64GB</option>
                      <option value="128GB">128GB</option>
                      <option value="256GB">256GB</option>
                      <option value="512GB">512GB</option>
                      <option value="1TB">1TB</option>
                      <option value="2TB">2TB</option>
                      <option value="N/A">Não aplicável</option>
                    </select>
                  </div>

                  {/* Color */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Cor do Aparelho
                    </label>
                    <input
                      value={itemColor}
                      onChange={(e) => setItemColor(e.target.value)}
                      className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                      placeholder="Ex: Titânio Natural, Preto, Branco"
                    />
                  </div>

                  {/* Battery Health (For iPhones) */}
                  {itemCategory === 'iPhone' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Saúde da Bateria (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="50"
                          max="100"
                          value={itemBattery}
                          onChange={(e) => setItemBattery(e.target.value)}
                          className="w-full bg-muted/20 border border-white/10 p-3 pr-8 rounded-xl text-sm outline-none focus:border-blue-500 font-bold text-emerald-400"
                          placeholder="100"
                        />
                        <span className="absolute right-3 top-3 text-xs font-bold text-muted-foreground">%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Garantia de Fábrica
                      </label>
                      <input
                        className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                        placeholder="Ex: 1 Ano Apple / Sony"
                      />
                    </div>
                  )}

                  {/* Condition */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Condição / Estado
                    </label>
                    <select
                      value={itemCondition}
                      onChange={(e) => setItemCondition(e.target.value)}
                      className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                    >
                      <option value="Novo / Lacrado">Novo / Lacrado</option>
                      <option value="Excelente / Vitrine">Excelente / Vitrine</option>
                      <option value="Muito Bom">Muito Bom</option>
                      <option value="Bom">Bom</option>
                      <option value="Com Marcas de Uso">Com Marcas de Uso</option>
                    </select>
                  </div>

                  {/* IMEI / Serial */}
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        IMEI / Número de Série
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateIdentifier}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" /> Gerar Automático
                      </button>
                    </div>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        value={itemIdentifier}
                        onChange={(e) => setItemIdentifier(e.target.value)}
                        className="w-full bg-muted/20 border border-white/10 p-3 pl-10 rounded-xl text-sm font-mono outline-none focus:border-blue-500"
                        placeholder="Digite o IMEI ou escaneie o código de barras..."
                      />
                    </div>
                  </div>

                  {/* Cost & Sell Prices */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Preço de Custo (R$) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        value={itemCost}
                        onChange={(e) => setItemCost(e.target.value)}
                        className="w-full bg-muted/20 border border-white/10 p-3 pl-9 rounded-xl text-sm font-bold outline-none focus:border-emerald-500"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Preço de Venda Sugerido (R$)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        value={itemSellPrice}
                        onChange={(e) => setItemSellPrice(e.target.value)}
                        className="w-full bg-muted/20 border border-white/10 p-3 pl-9 rounded-xl text-sm font-bold outline-none focus:border-emerald-500"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 p-3 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 h-[46px]"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar à Lista da Nota
                    </button>
                  </div>
                </div>

                {/* Items Added to this Invoice Table */}
                {itemsList.length > 0 && (
                  <div className="mt-4 border-t border-white/5 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase">
                        Aparelhos / Itens nesta Nota ({itemsList.length})
                      </h4>
                      <span className="text-xs font-bold text-emerald-400">
                        Custo Total: {formatBRL(totalCost)}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {itemsList.map((it, idx) => (
                        <div 
                          key={it.id}
                          className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl text-xs gap-3 group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold">{it.name} {it.storage} • {it.color}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                IMEI: {it.identifier} | Condição: {it.condition} {it.battery_health ? `| Bateria: ${it.battery_health}%` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-emerald-400">
                              {formatBRL(it.cost_price)}
                            </span>
                            <button
                              onClick={() => handleRemoveItem(it.id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              title="Remover da lista"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Invoice Options & Final Action */}
            <div className="space-y-6">
              
              {/* SECTION 3: DADOS FISCAIS DA COMPRA */}
              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-500" />
                  3. Documento Fiscal
                </h3>

                {/* Has Invoice Toggle */}
                <div className="p-3 bg-muted/20 rounded-2xl border border-white/5 space-y-2">
                  <p className="text-xs font-bold">A compra possui NF de compra?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHasInvoice(true)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold transition",
                        hasInvoice ? "bg-amber-500 text-black" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      Sim, tenho a NF
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasInvoice(false)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold transition",
                        !hasInvoice ? "bg-emerald-500 text-black" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      Não (Gerar Entrada)
                    </button>
                  </div>
                </div>

                {hasInvoice ? (
                  <div className="space-y-3 pt-2 animate-in fade-in">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Número da NF</label>
                      <input
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="w-full bg-muted/20 border border-white/10 p-2.5 rounded-xl text-xs font-mono outline-none"
                        placeholder="Ex: 000124"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Chave de Acesso (44 dígitos)</label>
                      <input
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value)}
                        className="w-full bg-muted/20 border border-white/10 p-2.5 rounded-xl text-xs font-mono outline-none"
                        placeholder="3524..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1">
                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Emissão Automática de Nota de Entrada
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      O sistema gerará automaticamente uma NF-e de entrada emitida pelo CNPJ da sua loja para regularização fiscal perante a SEFAZ.
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Data da Operação</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-muted/20 border border-white/10 p-2.5 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              {/* SUMMARY & TRANSMIT BUTTON */}
              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-4 shadow-2xl">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <PackageCheck className="h-5 w-5 text-emerald-500" />
                  Resumo da Nota
                </h3>

                <div className="space-y-2 text-xs divide-y divide-white/5">
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Total de Aparelhos:</span>
                    <span className="font-bold">{itemsList.length} unid.</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Valor Total de Custo:</span>
                    <span className="font-black text-emerald-400 text-sm">{formatBRL(totalCost)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Venda Total Prevista:</span>
                    <span className="font-bold">{formatBRL(totalSell)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Tipo de Documento:</span>
                    <span className="font-bold uppercase text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                      NF-e Entrada (Mod 55)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting || itemsList.length === 0}
                  onClick={handleTransmitAndRegister}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black py-4 px-4 rounded-2xl transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Transmitindo e Registrando...
                    </div>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4" />
                      Emitir Nota Fiscal & Salvar Estoque
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTÓRICO & NOTAS EMITIDAS/RECEBIDAS                               */}
      {/* ========================================================================= */}
      {activeTab === 'notas' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card/50 border border-white/10 p-5 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Autorizadas</p>
                <p className="text-2xl font-black">{documents.filter(d => d.status === 'Autorizada').length}</p>
              </div>
            </div>

            <div className="bg-card/50 border border-white/10 p-5 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total de Notas</p>
                <p className="text-2xl font-black">{documents.length}</p>
              </div>
            </div>

            <div className="bg-card/50 border border-white/10 p-5 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Faturado/Entrado</p>
                <p className="text-xl font-black text-emerald-400">
                  {formatBRL(documents.reduce((acc, d) => acc + (Number(d.total_amount) || 0), 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-card/50 border border-white/10 pl-11 pr-4 py-3 rounded-2xl text-sm outline-none focus:border-emerald-500"
                placeholder="Buscar por Número, Chave, Fornecedor ou Cliente..."
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-card/50 border border-white/10 px-4 py-3 rounded-2xl text-xs font-bold outline-none"
              >
                <option value="ALL">Todos os Status</option>
                <option value="Autorizada">Autorizada</option>
                <option value="Processando">Processando</option>
                <option value="Rejeitada">Rejeitada</option>
              </select>

              <button
                onClick={loadAllData}
                className="p-3 bg-card/50 border border-white/10 rounded-2xl hover:bg-white/5 transition"
                title="Recarregar dados"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-card/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-[10px] uppercase tracking-widest font-black text-muted-foreground border-b border-white/5">
                    <th className="px-6 py-4">NF-e / Série</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Data Emissão</th>
                    <th className="px-6 py-4">Destinatário / Remetente</th>
                    <th className="px-6 py-4">Valor Total</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                        Carregando documentos fiscais...
                      </td>
                    </tr>
                  ) : filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        Nenhuma nota fiscal encontrada. Use a aba "Cadastro & Emissão" para emitir sua primeira nota.
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-white/5 transition group">
                        <td className="px-6 py-4">
                          <p className="font-mono font-black text-sm">#{doc.number?.padStart(6, '0')}</p>
                          <p className="text-[9px] text-muted-foreground uppercase">Série {doc.series || '001'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase",
                            doc.type === 'Entrada' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          )}>
                            {doc.type || 'Entrada'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 w-fit",
                            doc.status === 'Autorizada' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                          )}>
                            <CheckCircle2 className="h-3 w-3" />
                            {doc.status || 'Autorizada'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold">{doc.client_name || 'Fornecedor / Particular'}</p>
                          <p className="text-[10px] text-muted-foreground">{doc.client_document || 'Sem documento'}</p>
                        </td>
                        <td className="px-6 py-4 font-black text-emerald-400">
                          {formatBRL(Number(doc.total_amount) || 0)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition"
                              title="Visualizar DANFE"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadXML(doc)}
                              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition"
                              title="Baixar XML"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCopyKey(doc.access_key || '')}
                              className="p-2 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white rounded-xl transition"
                              title="Copiar Chave de Acesso"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRODUTOS SEM NF (REGULARIZAÇÃO)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'pendentes' && (
        <div className="space-y-6">
          <div className="bg-card/50 border border-white/10 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-500" />
                  Aparelhos Pendentes de Regularização Fiscal
                </h3>
                <p className="text-xs text-muted-foreground">
                  Itens no estoque que deram entrada sem documento fiscal e necessitam de emissão de NF-e de entrada.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('cadastro')}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2 rounded-xl text-xs transition"
              >
                + Nova Entrada com NF
              </button>
            </div>

            {unprocessedUnits.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-sm">Estoque 100% Regularizado!</p>
                <p className="text-xs text-muted-foreground mt-1">Todos os aparelhos possuem nota fiscal vinculada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unprocessedUnits.map((u) => (
                  <div key={u.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-sm">{u.name} {u.storage}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">IMEI: {u.identifier || 'S/N'}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold rounded-lg uppercase">
                        Sem Nota
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t border-white/5">
                      <span className="text-muted-foreground">Custo: {formatBRL(u.cost_price || 0)}</span>
                      <span className="font-bold text-emerald-400">Venda: {formatBRL(u.sell_price || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONFIGURAÇÃO DA LOJA (EMISSOR)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-card/50 border border-white/10 p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Dados da Loja (Emitente)</h3>
                <p className="text-xs text-muted-foreground">
                  Informações cadastrais que aparecem como emissor no cabeçalho de todas as suas notas fiscais.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Razão Social / Nome Fantasia da Loja *
                </label>
                <input
                  value={storeConfig.business_name}
                  onChange={(e) => setStoreConfig({ ...storeConfig, business_name: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500 font-bold"
                  placeholder="Ex: Minha Loja Imports & Games Ltda"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">CNPJ *</label>
                <input
                  value={storeConfig.cnpj}
                  onChange={(e) => setStoreConfig({ ...storeConfig, cnpj: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm font-mono outline-none focus:border-emerald-500"
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Inscrição Estadual (I.E.)</label>
                <input
                  value={storeConfig.ie}
                  onChange={(e) => setStoreConfig({ ...storeConfig, ie: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm font-mono outline-none focus:border-emerald-500"
                  placeholder="123.456.789.000 ou ISENTO"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Endereço Comercial</label>
                <input
                  value={storeConfig.address}
                  onChange={(e) => setStoreConfig({ ...storeConfig, address: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500"
                  placeholder="Rua, Número, Sala / Bairro"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Cidade</label>
                <input
                  value={storeConfig.city}
                  onChange={(e) => setStoreConfig({ ...storeConfig, city: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500"
                  placeholder="São Paulo"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Estado (UF)</label>
                <input
                  value={storeConfig.state}
                  onChange={(e) => setStoreConfig({ ...storeConfig, state: e.target.value.toUpperCase() })}
                  maxLength={2}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500 uppercase"
                  placeholder="SP"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Regime Tributário</label>
                <select
                  value={storeConfig.tax_regime}
                  onChange={(e) => setStoreConfig({ ...storeConfig, tax_regime: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500"
                >
                  <option value="Simples Nacional">Simples Nacional (ME/EPP)</option>
                  <option value="MEI">Microempreendedor Individual (MEI)</option>
                  <option value="Lucro Presumido">Lucro Presumido</option>
                  <option value="Lucro Real">Lucro Real</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Ambiente de Emissão</label>
                <select
                  value={storeConfig.environment}
                  onChange={(e) => setStoreConfig({ ...storeConfig, environment: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-emerald-500"
                >
                  <option value="homolog">Homologação (Testes SEFAZ)</option>
                  <option value="prod">Produção (Validade Jurídica)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <button
                type="button"
                disabled={savingConfig}
                onClick={handleSaveStoreConfig}
                className="w-full sm:w-auto px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 rounded-2xl transition text-xs uppercase tracking-wider cursor-pointer"
              >
                {savingConfig ? 'Salvando...' : 'Salvar Dados da Loja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VISUALIZADOR DANFE OFICIAL                                         */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">DANFE - Documento Auxiliar da NF-e</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    NF-e Nº {previewDoc.number?.padStart(6, '0')} • Série {previewDoc.series || '001'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintDANFE}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
                <button
                  onClick={() => handleDownloadXML(previewDoc)}
                  className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  XML
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 hover:bg-white/10 text-muted-foreground hover:text-white rounded-xl transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Official-Style DANFE Document */}
            <div className="p-6 overflow-y-auto flex-1 bg-white text-black font-sans text-xs space-y-4">
              
              {/* DANFE Header Box */}
              <div className="border-2 border-black p-4 grid grid-cols-12 gap-2">
                <div className="col-span-5 border-r border-black pr-2">
                  <p className="font-black text-sm uppercase">{previewDoc.issuer_name || storeConfig.business_name || 'LOJA PRINCIPAL LTDA'}</p>
                  <p className="text-[10px] mt-1">{previewDoc.issuer_address || storeConfig.address || 'Rua Comercial'}</p>
                  <p className="text-[10px]">{previewDoc.issuer_city || storeConfig.city || 'São Paulo'} - {previewDoc.issuer_state || storeConfig.state || 'SP'}</p>
                  <p className="text-[10px] font-bold mt-1">CNPJ: {previewDoc.issuer_document || storeConfig.cnpj || '00.000.000/0001-00'}</p>
                  <p className="text-[10px]">I.E.: {previewDoc.issuer_ie || storeConfig.ie || 'ISENTO'}</p>
                </div>

                <div className="col-span-3 text-center border-r border-black px-2 flex flex-col justify-center">
                  <p className="font-black text-base">DANFE</p>
                  <p className="text-[9px]">Documento Auxiliar da Nota Fiscal Eletrônica</p>
                  <div className="my-1 border border-black p-1">
                    <p className="text-[10px] font-bold">0 - ENTRADA</p>
                  </div>
                  <p className="font-bold text-[10px]">Nº {previewDoc.number?.padStart(6, '0')}</p>
                  <p className="text-[9px]">SÉRIE {previewDoc.series || '001'}</p>
                </div>

                <div className="col-span-4 pl-2 flex flex-col justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase">CHAVE DE ACESSO</p>
                    <p className="font-mono text-[9px] break-all tracking-wider font-bold bg-slate-100 p-1 border border-slate-300">
                      {previewDoc.access_key || '35260800000000000000550010000012341000000001'}
                    </p>
                  </div>
                  <div className="mt-2 text-[9px]">
                    <p className="font-bold">PROTOCOLO DE AUTORIZAÇÃO:</p>
                    <p>135260000000001 - {new Date(previewDoc.created_at || Date.now()).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              {/* Remetente / Destinatário */}
              <div className="border border-black p-3 space-y-1">
                <p className="font-black text-[10px] uppercase bg-slate-200 px-1">DESTINATÁRIO / REMETENTE</p>
                <div className="grid grid-cols-12 gap-2 text-[10px] pt-1">
                  <div className="col-span-6">
                    <span className="font-bold">NOME / RAZÃO SOCIAL: </span>
                    {previewDoc.client_name || 'Fornecedor Particular'}
                  </div>
                  <div className="col-span-3">
                    <span className="font-bold">CNPJ / CPF: </span>
                    {previewDoc.client_document || '000.000.000-00'}
                  </div>
                  <div className="col-span-3">
                    <span className="font-bold">DATA EMISSÃO: </span>
                    {new Date(previewDoc.created_at || Date.now()).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Cálculo do Imposto */}
              <div className="border border-black p-2">
                <p className="font-black text-[9px] uppercase bg-slate-200 px-1">CÁLCULO DO IMPOSTO</p>
                <div className="grid grid-cols-4 gap-2 text-[9px] pt-1 text-center font-mono">
                  <div className="border p-1">
                    <p className="text-[8px] font-sans">BASE CÁLC. ICMS</p>
                    <p className="font-bold">{formatBRL(Number(previewDoc.total_amount) || 0)}</p>
                  </div>
                  <div className="border p-1">
                    <p className="text-[8px] font-sans">VALOR DO ICMS</p>
                    <p className="font-bold">R$ 0,00</p>
                  </div>
                  <div className="border p-1">
                    <p className="text-[8px] font-sans">VALOR DO FRETE</p>
                    <p className="font-bold">R$ 0,00</p>
                  </div>
                  <div className="border p-1 bg-slate-100">
                    <p className="text-[8px] font-sans font-bold">VALOR TOTAL DA NOTA</p>
                    <p className="font-black text-[11px]">{formatBRL(Number(previewDoc.total_amount) || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Dados dos Produtos / Aparelhos */}
              <div className="border border-black">
                <p className="font-black text-[9px] uppercase bg-slate-200 px-2 py-1">DADOS DOS PRODUTOS / SERVIÇOS</p>
                <table className="w-full text-left text-[9px] border-collapse">
                  <thead>
                    <tr className="border-b border-black bg-slate-100 font-bold">
                      <th className="p-1 border-r border-black">CÓD</th>
                      <th className="p-1 border-r border-black">DESCRIÇÃO DO PRODUTO / ESPECIFICAÇÕES</th>
                      <th className="p-1 border-r border-black">NCM</th>
                      <th className="p-1 border-r border-black">CFOP</th>
                      <th className="p-1 border-r border-black">UN</th>
                      <th className="p-1 border-r border-black">QTD</th>
                      <th className="p-1 border-r border-black">VLR UNIT</th>
                      <th className="p-1">VLR TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewDoc.items_detail && previewDoc.items_detail.length > 0 ? (
                      previewDoc.items_detail.map((it: any, i: number) => (
                        <tr key={i} className="border-b border-slate-200">
                          <td className="p-1 border-r border-slate-300 font-mono">{i + 1}</td>
                          <td className="p-1 border-r border-slate-300">
                            <strong>{it.name} {it.storage} {it.color}</strong>
                            <span className="block text-[8px] text-slate-600">IMEI/Serial: {it.identifier} | Condição: {it.condition}</span>
                          </td>
                          <td className="p-1 border-r border-slate-300 font-mono">8517.13.00</td>
                          <td className="p-1 border-r border-slate-300 font-mono">1.102</td>
                          <td className="p-1 border-r border-slate-300">UN</td>
                          <td className="p-1 border-r border-slate-300">1</td>
                          <td className="p-1 border-r border-slate-300">{formatBRL(it.cost_price || 0)}</td>
                          <td className="p-1 font-bold">{formatBRL(it.cost_price || 0)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-1 border-r border-slate-300 font-mono">1</td>
                        <td className="p-1 border-r border-slate-300">
                          <strong>APARELHOS EM ESTOQUE - ENTRADA DE REGULARIZAÇÃO</strong>
                        </td>
                        <td className="p-1 border-r border-slate-300 font-mono">8517.13.00</td>
                        <td className="p-1 border-r border-slate-300 font-mono">1.102</td>
                        <td className="p-1 border-r border-slate-300">UN</td>
                        <td className="p-1 border-r border-slate-300">{previewDoc.items_count || 1}</td>
                        <td className="p-1 border-r border-slate-300">{formatBRL(Number(previewDoc.total_amount) || 0)}</td>
                        <td className="p-1 font-bold">{formatBRL(Number(previewDoc.total_amount) || 0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Informações Complementares */}
              <div className="border border-black p-2 text-[8px]">
                <p className="font-bold">INFORMAÇÕES COMPLEMENTARES:</p>
                <p>Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI.</p>
                <p>Operação de regularização fiscal de entrada de mercadorias no estoque. Sistema de Gestão Integrado.</p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex justify-end bg-zinc-900/50">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-6 py-2.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-slate-200 transition"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
