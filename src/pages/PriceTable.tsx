import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, Search, Smartphone, X, Gamepad2, Tag, DollarSign, Calculator, Sparkles, Upload, FileText, Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmationModal from '../components/ui/ConfirmationModal';

type Category = 'iphone' | 'console';

export default function PriceTable() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingPrice, setEditingPrice] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('iphone');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcHistory, setCalcHistory] = useState('');

  // IA Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessingIA, setIsProcessingIA] = useState(false);
  const [iaStep, setIaStep] = useState('');
  const [extractedItems, setExtractedItems] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ['prices'],
    queryFn: () => db.prices.list(),
  });

  const { data: dollarRate = 5.0, refetch: refetchDollar, isRefetching: isRefetchingDollar } = useQuery({
    queryKey: ['dollarRate'],
    queryFn: async () => {
      try {
        const res = await fetch(`https://economia.awesomeapi.com.br/last/USD-BRL?t=${Date.now()}`);
        if (!res.ok) return 5.0;
        const data = await res.json();
        return parseFloat(data?.USDBRL?.bid) || 5.0;
      } catch (e) {
        return 5.0; // Fallback
      }
    },
    refetchInterval: 1000 * 60, // Auto-refresh every 1 minute
    staleTime: 0, // Always consider stale to allow manual refresh
  });

  const handleManualRefresh = async () => {
    const { data } = await refetchDollar();
    if (data) {
      toast.success(`Cotação atualizada: ${formatBRL(data)}`);
    }
  };

  const addMutation = useMutation({
    mutationFn: (newPrice: any) => db.prices.create(newPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      setIsAdding(false);
      toast.success('Preço adicionado!');
    },
    onError: () => toast.error('Erro ao adicionar preço. Verifique se a coluna "category" existe no banco.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.prices.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      setEditingPrice(null);
      toast.success('Preço atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar preço.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.prices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      toast.success('Preço removido!');
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const items = [
        { category: 'iphone', model: 'iPhone 11', storage: '128GB', price: 1000.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11', storage: '256GB', price: 1000.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11', storage: '64GB', price: 900.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11 Pro', storage: '256GB', price: 1200.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11 Pro', storage: '512GB', price: 1250.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11 Pro Max', storage: '256GB', price: 1300.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11 Pro Max', storage: '512GB', price: 1350.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 11 Pro Max', storage: '64GB', price: 1200.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 12', storage: '128GB', price: 1200.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 12', storage: '64GB', price: 1200.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 12 Pro Max', storage: '128GB', price: 2000.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 13', storage: '128GB', price: 1650.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 14', storage: '256GB', price: 2150.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 14 Pro', storage: '256GB', price: 2500.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 14 Pro Max', storage: '128GB', price: 2500.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 14 Pro Max', storage: '256GB', price: 2800.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 15 Plus', storage: '128GB', price: 2500.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 15 Pro Max', storage: '256GB', price: 3500.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone 8 Plus', storage: '256GB', price: 500.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone XR', storage: '128GB', price: 850.00, condition: 'Seminovo Grade A' },
        { category: 'iphone', model: 'iPhone XR', storage: '64GB', price: 850.00, condition: 'Seminovo Grade A' }
      ];
      
      for (const item of items) {
        await db.prices.create(item as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      toast.success('Tabela demonstrativa importada!');
      setIsImportModalOpen(false);
    },
    onError: () => toast.error('Erro ao importar tabela.')
  });

  const updateExtractedItem = (index: number, field: string, value: any) => {
    setExtractedItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'price') {
        const num = parseFloat(String(value).replace(',', '.'));
        item.price = isNaN(num) ? 0 : num;
        if (dollarRate > 0 && item.price > 0) {
          item.price_usd = Number((item.price / dollarRate).toFixed(2));
        }
      } else if (field === 'price_usd') {
        const num = parseFloat(String(value).replace(',', '.'));
        item.price_usd = isNaN(num) ? 0 : num;
        if (dollarRate > 0 && item.price_usd > 0) {
          item.price = Number((item.price_usd * dollarRate).toFixed(2));
        }
      }
      updated[index] = item;
      return updated;
    });
  };

  const removeExtractedItem = (index: number) => {
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  };

  const importExtractedMutation = useMutation({
    mutationFn: async (itemsToImport: any[]) => {
      for (const item of itemsToImport) {
        let priceBrl = Number(item.price);
        let usdPrice = item.price_usd ? Number(item.price_usd) : 0;

        if ((isNaN(priceBrl) || priceBrl <= 0) && usdPrice > 0) {
          priceBrl = Number((usdPrice * (dollarRate || 5.0)).toFixed(2));
        }

        if ((isNaN(usdPrice) || usdPrice <= 0) && priceBrl > 0 && dollarRate > 0) {
          usdPrice = Number((priceBrl / dollarRate).toFixed(2));
        }

        await db.prices.create({
          category: item.category || 'iphone',
          model: item.model || 'Aparelho',
          version: item.version || '',
          storage: item.storage || '',
          color: item.color || '',
          condition: item.condition || 'Seminovo Grade A',
          price: priceBrl > 0 ? priceBrl : 0,
          price_usd: usdPrice > 0 ? usdPrice : 0
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      toast.success('Sua tabela foi importada com sucesso!');
      setIsImportModalOpen(false);
      setExtractedItems([]);
      setSelectedFile(null);
    },
    onError: (err: any) => {
      console.error(err);
      toast.error('Erro ao salvar os itens extraídos.');
    }
  });

  const handleFileProcess = async (file: File) => {
    setSelectedFile(file);
    setIsProcessingIA(true);
    setIaStep('Enviando arquivo e iniciando leitura...');
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Result = reader.result as string;
          const base64Data = base64Result.split(',')[1];
          const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png');
          
          setIaStep('O Gemini IA está lendo e interpretando a sua tabela de preços...');
          
          const response = await fetch('/api/process-price-table', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileData: base64Data,
              mimeType,
            }),
          });
          
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Erro ao processar arquivo no servidor.');
          }
          
          const data = await response.json();
          if (data && Array.isArray(data.items)) {
            setExtractedItems(data.items);
            toast.success(`Leitura completa! ${data.items.length} itens detectados.`);
          } else {
            throw new Error('Não foi possível identificar itens de preços nesta tabela.');
          }
        } catch (innerErr: any) {
          console.error(innerErr);
          toast.error(innerErr.message || 'Erro ao processar a tabela com IA.');
          setSelectedFile(null);
        } finally {
          setIsProcessingIA(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Falha ao carregar o arquivo local.');
        setIsProcessingIA(false);
        setSelectedFile(null);
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao ler arquivo.');
      setIsProcessingIA(false);
      setSelectedFile(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // Auto-convert existing prices that don't have price_usd
  React.useEffect(() => {
    if (prices.length > 0 && dollarRate > 0) {
      const unpeggedPrices = prices.filter(p => !p.price_usd && p.price > 0);
      if (unpeggedPrices.length > 0) {
        unpeggedPrices.forEach(async (item) => {
          const priceUsd = Number((item.price / dollarRate).toFixed(2));
          await db.prices.update(item.id, { price_usd: priceUsd });
        });
        queryClient.invalidateQueries({ queryKey: ['prices'] });
      }
    }
  }, [prices, dollarRate, queryClient]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const inputPriceBrl = Number(formData.get('price'));
    const calculatedUsd = Number((inputPriceBrl / dollarRate).toFixed(2));

    const data = {
      model: formData.get('model'),
      version: formData.get('version'),
      storage: formData.get('storage'),
      color: formData.get('color'),
      condition: formData.get('condition'),
      price: inputPriceBrl,
      price_usd: calculatedUsd,
      category: selectedCategory,
    };

    if (editingPrice) {
      updateMutation.mutate({ id: editingPrice.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const filteredPrices = useMemo(() => {
    return prices.filter(item => 
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.storage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.version?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.condition?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.model.localeCompare(b.model));
  }, [prices, searchTerm]);

  const uniqueModels = useMemo(() => {
    return Array.from(new Set(prices.filter(p => p.category === selectedCategory).map(p => p.model))).sort();
  }, [prices, selectedCategory]);

  const handleCalcClick = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcHistory('');
    } else if (val === '=') {
      try {
        // eslint-disable-next-line no-eval
        const result = eval(calcDisplay.replace('x', '*').replace('÷', '/'));
        setCalcHistory(calcDisplay + ' =');
        setCalcDisplay(String(Number(result.toFixed(2))));
      } catch (e) {
        setCalcDisplay('Erro');
      }
    } else if (val === '%') {
      try {
        const parts = calcDisplay.trim().split(' ');
        if (parts.length === 3) {
          const num1 = parseFloat(parts[0]);
          const operator = parts[1];
          const num2 = parseFloat(parts[2]);
          
          if (!isNaN(num1) && !isNaN(num2)) {
            let result;
            const percentageValue = (num1 * num2) / 100;
            
            if (operator === '+') result = num1 + percentageValue;
            else if (operator === '-') result = num1 - percentageValue;
            else if (operator === 'x') result = percentageValue;
            else if (operator === '÷') result = num1 / (num2 / 100);
            
            if (result !== undefined) {
              setCalcHistory(`${calcDisplay}% =`);
              setCalcDisplay(String(Number(result.toFixed(2))));
              return;
            }
          }
        }
        
        // Fallback para divisão simples por 100 se não houver operação composta
        // eslint-disable-next-line no-eval
        const currentVal = eval(calcDisplay.replace('x', '*').replace('÷', '/'));
        setCalcDisplay(String(Number((currentVal / 100).toFixed(4))));
      } catch (e) {
        setCalcDisplay('Erro');
      }
    } else if (['+', '-', 'x', '÷'].includes(val)) {
      setCalcDisplay(prev => prev + ' ' + val + ' ');
    } else {
      setCalcDisplay(prev => prev === '0' ? val : prev + val);
    }
  };

  const quickConvert = (type: 'toUsd' | 'toBrl') => {
    const currentVal = parseFloat(calcDisplay);
    if (isNaN(currentVal)) return;
    
    if (type === 'toUsd') {
      const result = currentVal / dollarRate;
      setCalcHistory(`${formatBRL(currentVal)} / ${formatBRL(dollarRate)} =`);
      setCalcDisplay(result.toFixed(2));
    } else {
      const result = currentVal * dollarRate;
      setCalcHistory(`${currentVal} * ${formatBRL(dollarRate)} =`);
      setCalcDisplay(result.toFixed(2));
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Tabela de Preços (Venda)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os preços de venda para iPhones e Consoles. 
          </p>
        </div>
        
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-4 animate-in zoom-in-95 duration-500">
          <div className="bg-white/20 p-2 rounded-lg">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Dólar Comercial Hoje</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-black tracking-tighter">{formatBRL(dollarRate)}</h2>
              <button 
                onClick={handleManualRefresh}
                disabled={isRefetchingDollar}
                className={`text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-all flex items-center gap-1 ${isRefetchingDollar ? 'animate-pulse opacity-50' : ''}`}
              >
                {isRefetchingDollar ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-xl border border-dashed">
        <p className="text-xs text-muted-foreground max-w-md">
          <span className="font-bold text-emerald-600">Dica:</span> Os valores em Reais são recalculados instantaneamente sempre que a cotação do dólar muda. Isso garante que sua margem de lucro seja preservada.
        </p>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link
            to="/offer-tags"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto justify-center shadow-sm"
            title="Gerar Arte / Encarte de Oferta"
          >
            <Sparkles className="h-4 w-4" />
            Gerar Encartes
          </Link>
          <button 
            onClick={() => setIsCalculatorOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center shadow-sm"
            title="Abrir Calculadora"
          >
            <Calculator className="h-4 w-4" />
            Calculadora
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-secondary/80 transition-colors w-full sm:w-auto justify-center shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Importar Tabela IA
          </button>
          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingPrice(null);
              if (!isAdding) setSelectedCategory('iphone');
            }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center shadow-sm"
          >
            {isAdding || editingPrice ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isAdding || editingPrice ? 'Fechar' : 'Novo Preço'}
          </button>
        </div>
      </div>

      {(isAdding || editingPrice) && (
        <div className="bg-card border rounded-xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{editingPrice ? 'Editar Preço' : 'Cadastrar Novo Preço'}</h2>
            </div>
            {!editingPrice && (
              <div className="flex bg-muted p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('iphone')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${selectedCategory === 'iphone' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  iPhone
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('console')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${selectedCategory === 'console' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  Console
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                Modelo {selectedCategory === 'iphone' ? <Smartphone className="h-3 w-3" /> : <Gamepad2 className="h-3 w-3" />}
              </label>
              <input 
                name="model" 
                list="models-list"
                defaultValue={editingPrice?.model} 
                required 
                className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder={selectedCategory === 'iphone' ? "Ex: iPhone 15" : "Ex: PlayStation 5"} 
              />
              <datalist id="models-list">
                {uniqueModels.map(model => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Versão</label>
              <input 
                name="version" 
                defaultValue={editingPrice?.version} 
                className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder={selectedCategory === 'iphone' ? "Ex: Pro Max, Plus" : "Ex: Slim, Digital Edition"} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {selectedCategory === 'iphone' ? 'Armazenamento' : 'Capacidade'}
              </label>
              {selectedCategory === 'iphone' ? (
                <select 
                  name="storage" 
                  defaultValue={editingPrice?.storage || '128GB'} 
                  required 
                  className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="64GB">64GB</option>
                  <option value="128GB">128GB</option>
                  <option value="256GB">256GB</option>
                  <option value="512GB">512GB</option>
                  <option value="1TB">1TB</option>
                </select>
              ) : (
                <input 
                  name="storage" 
                  defaultValue={editingPrice?.storage} 
                  required 
                  className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                  placeholder="Ex: 825GB, 1TB" 
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <input 
                name="color" 
                defaultValue={editingPrice?.color} 
                className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder="Ex: Titânio Natural, Branco" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Condição</label>
              <select 
                name="condition" 
                defaultValue={editingPrice?.condition || 'Novo Lacrado'} 
                required 
                className="w-full p-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="Novo Lacrado">Novo Lacrado</option>
                <option value="Seminovo Grade A">Seminovo Grade A</option>
                <option value="Seminovo Grade B">Seminovo Grade B</option>
                <option value="Usado">Usado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-600">Preço de Venda Sugerido (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium">R$</span>
                <input 
                  name="price" 
                  defaultValue={editingPrice ? (editingPrice.price_usd ? (editingPrice.price_usd * dollarRate).toFixed(2) : editingPrice.price) : ''} 
                  type="number" 
                  step="0.01" 
                  required
                  className="w-full p-2.5 pl-10 border border-emerald-200 rounded-lg bg-emerald-50/30 text-emerald-700 font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" 
                  placeholder="0,00" 
                />
              </div>
              <p className="text-[10px] text-muted-foreground">O valor será ajustado automaticamente com a variação do dólar.</p>
            </div>

            <div className="lg:col-span-3 flex justify-end gap-3 pt-2 border-t mt-2">
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setEditingPrice(null); }} 
                className="bg-muted text-muted-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-primary text-primary-foreground px-8 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-95"
              >
                {editingPrice ? 'Atualizar Preço' : 'Salvar na Tabela'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Pesquisar por modelo, armazenamento ou categoria..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> iPhone</span>
            <span className="flex items-center gap-1 ml-2"><Gamepad2 className="h-3 w-3" /> Console</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Categoria</th>
                <th className="px-6 py-4 font-semibold">Produto</th>
                <th className="px-6 py-4 font-semibold">Especificações</th>
                <th className="px-6 py-4 font-semibold">Condição</th>
                <th className="px-6 py-4 font-semibold">Preço Sugerido</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPrices.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors group">
                  <td className="px-6 py-4">
                    {item.category === 'console' ? (
                      <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                        <Gamepad2 className="h-4 w-4" />
                        Console
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-purple-600 font-medium">
                        <Smartphone className="h-4 w-4" />
                        iPhone
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{item.model}</div>
                    {item.version && <div className="text-xs text-muted-foreground">{item.version}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground border uppercase">
                        {item.storage}
                      </span>
                      {item.color && (
                        <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground border uppercase">
                          {item.color}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                      item.condition === 'Novo Lacrado' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {item.condition || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-emerald-600 font-bold text-base">
                      {formatBRL(
                        item.price_usd && Number(item.price_usd) > 0 && dollarRate > 0
                          ? Number(item.price_usd) * dollarRate
                          : Number(item.price || 0)
                      )}
                    </div>
                    {item.price_usd && Number(item.price_usd) > 0 && (
                      <span className="block text-[10px] text-muted-foreground font-normal">
                        ${Number(item.price_usd).toFixed(2)} USD
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingPrice(item);
                          setSelectedCategory(item.category || 'iphone');
                          setIsAdding(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-muted-foreground hover:text-primary p-2 rounded-md hover:bg-primary/10 transition-all"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteId(item.id)}
                        className="text-muted-foreground hover:text-destructive p-2 rounded-md hover:bg-destructive/10 transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPrices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="p-4 bg-muted rounded-full">
                        <Search className="h-10 w-10 opacity-20" />
                      </div>
                      <p className="text-base font-medium">Nenhum item encontrado na tabela.</p>
                      <button 
                        onClick={() => setIsAdding(true)}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Cadastrar o primeiro item agora
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculator Modal */}
      {isCalculatorOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-[280px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-primary p-3 flex items-center justify-between text-primary-foreground">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Calculator className="h-4 w-4" />
                Calculadora
              </div>
              <button 
                onClick={() => setIsCalculatorOpen(false)}
                className="hover:bg-white/20 p-1 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-3 bg-muted/30 text-right space-y-0.5">
              <div className="text-[10px] text-muted-foreground h-3 overflow-hidden">{calcHistory}</div>
              <div className="text-2xl font-bold tracking-tighter truncate">{calcDisplay}</div>
            </div>

            <div className="p-2 grid grid-cols-4 gap-1.5">
              <button onClick={() => handleCalcClick('C')} className="bg-destructive/10 text-destructive hover:bg-destructive/20 p-2 rounded-lg font-bold transition-all text-xs">C</button>
              <button onClick={() => handleCalcClick('%')} className="bg-muted hover:bg-muted/80 p-2 rounded-lg font-bold transition-all text-primary text-sm">%</button>
              <button onClick={() => handleCalcClick('÷')} className="bg-muted hover:bg-muted/80 p-2 rounded-lg font-bold transition-all text-primary text-sm">÷</button>
              <button onClick={() => handleCalcClick('x')} className="bg-muted hover:bg-muted/80 p-2 rounded-lg font-bold transition-all text-primary text-sm">x</button>
              
              {[7, 8, 9].map(n => (
                <button key={n} onClick={() => handleCalcClick(String(n))} className="bg-background border hover:bg-muted p-2 rounded-lg font-semibold transition-all text-sm">{n}</button>
              ))}
              <button onClick={() => handleCalcClick('-')} className="bg-muted hover:bg-muted/80 p-2 rounded-lg font-bold transition-all text-primary text-sm">-</button>
              
              {[4, 5, 6].map(n => (
                <button key={n} onClick={() => handleCalcClick(String(n))} className="bg-background border hover:bg-muted p-2 rounded-lg font-semibold transition-all text-sm">{n}</button>
              ))}
              <button onClick={() => handleCalcClick('+')} className="bg-muted hover:bg-muted/80 p-2 rounded-lg font-bold transition-all text-primary text-sm">+</button>
              
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => handleCalcClick(String(n))} className="bg-background border hover:bg-muted p-2 rounded-lg font-semibold transition-all text-sm">{n}</button>
              ))}
              <button onClick={() => handleCalcClick('=')} className="row-span-2 bg-primary text-primary-foreground hover:bg-primary/90 p-2 rounded-lg font-bold transition-all shadow-md text-sm">=</button>
              
              <button onClick={() => handleCalcClick('0')} className="col-span-2 bg-background border hover:bg-muted p-2 rounded-lg font-semibold transition-all text-sm">0</button>
              <button onClick={() => handleCalcClick('.')} className="bg-background border hover:bg-muted p-2 rounded-lg font-semibold transition-all text-sm">.</button>
            </div>

            <div className="px-2 pb-2 grid grid-cols-2 gap-1.5">
              <button 
                onClick={() => quickConvert('toUsd')}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 p-1.5 rounded-lg text-[9px] font-bold border border-emerald-200 flex flex-col items-center leading-tight"
              >
                CONVERTER PARA
                <span className="text-[10px]">DÓLAR ($)</span>
              </button>
              <button 
                onClick={() => quickConvert('toBrl')}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 p-1.5 rounded-lg text-[9px] font-bold border border-blue-200 flex flex-col items-center leading-tight"
              >
                CONVERTER PARA
                <span className="text-[10px]">REAL (R$)</span>
              </button>
            </div>
            
            <div className="bg-muted/50 p-1.5 text-center">
              <p className="text-[9px] text-muted-foreground">
                Cotação Atual: <span className="font-bold text-primary">{formatBRL(dollarRate)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Preço"
        message="Tem certeza que deseja remover este item da tabela de preços? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in scale-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Importar Tabela com Inteligência Artificial</h3>
                  <p className="text-xs text-muted-foreground">Envie uma foto, print ou PDF de preços para extração via Gemini</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setExtractedItems([]);
                  setSelectedFile(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {!selectedFile && !isProcessingIA && extractedItems.length === 0 && (
                <div className="space-y-6">
                  {/* Drag and Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[220px] ${
                      dragActive 
                        ? 'border-primary bg-primary/5 scale-[0.99]' 
                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/10'
                    }`}
                    onClick={() => document.getElementById('ia-file-upload')?.click()}
                  >
                    <input 
                      id="ia-file-upload"
                      type="file" 
                      accept="image/*,application/pdf" 
                      className="hidden" 
                      onChange={handleFileInputChange}
                    />
                    <div className="p-4 bg-muted rounded-full text-muted-foreground">
                      <Upload className="h-10 w-10 opacity-70" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Clique para buscar ou arraste o arquivo aqui</p>
                      <p className="text-xs text-muted-foreground mt-1">Suporta imagens (PNG, JPG, JPEG) ou arquivos PDF</p>
                    </div>
                  </div>

                  {/* Or load default demo */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Ou se preferir</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => importMutation.mutate()}
                      disabled={importMutation.isPending}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors w-full sm:w-auto justify-center"
                    >
                      <Database className="h-4 w-4" />
                      {importMutation.isPending ? 'Importando...' : 'Importar tabela padrão de exemplo'}
                    </button>
                    <p className="text-[10px] text-muted-foreground mt-1.5">Insere automaticamente uma lista de 20 modelos comuns de iPhone</p>
                  </div>
                </div>
              )}

              {/* Processing Loading state */}
              {isProcessingIA && (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <p className="font-semibold text-base text-foreground animate-pulse">{iaStep}</p>
                    <p className="text-xs text-muted-foreground">Isso geralmente leva de 5 a 15 segundos enquanto a IA analisa o layout, localiza preços e os formata em colunas.</p>
                  </div>
                </div>
              )}

              {/* Extracted items review */}
              {extractedItems.length > 0 && !isProcessingIA && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-emerald-600 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <span>A IA extraiu <strong>{extractedItems.length} aparelhos</strong>! Você pode ajustar os preços ou modelos abaixo antes de salvar:</span>
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold">Tipo</th>
                          <th className="px-3 py-2.5 font-semibold">Modelo</th>
                          <th className="px-3 py-2.5 font-semibold">Memória</th>
                          <th className="px-3 py-2.5 font-semibold">Condição</th>
                          <th className="px-3 py-2.5 font-semibold w-32">Preço (R$)</th>
                          <th className="px-2 py-2.5 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {extractedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <select
                                value={item.category || 'iphone'}
                                onChange={(e) => updateExtractedItem(idx, 'category', e.target.value)}
                                className="bg-background border rounded px-1.5 py-1 text-[11px] font-medium"
                              >
                                <option value="iphone">📱 iPhone</option>
                                <option value="console">🎮 Console</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.model || ''}
                                onChange={(e) => updateExtractedItem(idx, 'model', e.target.value)}
                                className="bg-background border rounded px-2 py-1 text-xs font-medium w-full min-w-[120px]"
                                placeholder="Modelo"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.storage || ''}
                                onChange={(e) => updateExtractedItem(idx, 'storage', e.target.value)}
                                className="bg-background border rounded px-2 py-1 text-xs text-muted-foreground w-20"
                                placeholder="128GB"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={item.condition || 'Seminovo Grade A'}
                                onChange={(e) => updateExtractedItem(idx, 'condition', e.target.value)}
                                className="bg-background border rounded px-1.5 py-1 text-[11px]"
                              >
                                <option value="Novo Lacrado">Novo Lacrado</option>
                                <option value="Seminovo Grade A">Seminovo Grade A</option>
                                <option value="Seminovo Grade B">Seminovo Grade B</option>
                                <option value="Com Detalhe">Com Detalhe</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px] font-medium">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.price || ''}
                                  onChange={(e) => updateExtractedItem(idx, 'price', e.target.value)}
                                  className={`bg-background border rounded pl-7 pr-2 py-1 text-xs font-bold w-28 text-foreground ${
                                    !item.price || item.price <= 0 ? 'border-amber-500 bg-amber-500/5' : 'border-emerald-500/50'
                                  }`}
                                  placeholder="0.00"
                                />
                              </div>
                              {item.price_usd && Number(item.price_usd) > 0 && (
                                <span className="text-[10px] text-muted-foreground block mt-0.5 font-normal">
                                  ${Number(item.price_usd).toFixed(2)} USD
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeExtractedItem(idx)}
                                className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-colors"
                                title="Remover item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-muted/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setExtractedItems([]);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-muted transition-colors"
              >
                Fechar
              </button>
              {extractedItems.length > 0 && !isProcessingIA && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setExtractedItems([]);
                      setSelectedFile(null);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Descartar / Novo Arquivo
                  </button>
                  <button
                    type="button"
                    disabled={importExtractedMutation.isPending}
                    onClick={() => importExtractedMutation.mutate(extractedItems)}
                    className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {importExtractedMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        Confirmar e Importar {extractedItems.length} Itens
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
