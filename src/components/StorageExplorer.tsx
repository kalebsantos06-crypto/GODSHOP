import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { X, Trash2, Database, AlertCircle, HardDrive, FileUp, Loader2, FileCheck, Search, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface StorageExplorerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StorageExplorer({ isOpen, onClose }: StorageExplorerProps) {
  const [storageInfo, setStorageInfo] = useState<{ name: string; count: number; size: number }[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'upload'>('view');
  const [noteText, setNoteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      refreshInfo();
    }
  }, [isOpen]);

  const refreshInfo = () => {
    setStorageInfo(db.storageHelper.getAllStorageInfo());
  };

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setTableData(db.storageHelper.getTableData(tableName));
  };

  const handleClearTable = (tableName: string) => {
    if (!confirm(`Tem certeza que deseja limpar todos os dados da tabela "${tableName}" do armazenamento local?`)) return;
    
    db.storageHelper.clearTable(tableName);
    toast.success(`Tabela ${tableName} limpa com sucesso!`);
    refreshInfo();
    if (selectedTable === tableName) {
      setTableData([]);
    }
  };

  const handleTextUpload = async () => {
    if (!noteText.trim()) return;

    setIsProcessing(true);
    try {
      const result = await db.processWarrantyText(noteText);
      if (result.success) {
        toast.success('Dados do texto processados com sucesso!');
        setNoteText('');
        refreshInfo();
      } else {
        toast.error(result.message, {
          description: "Você pode tentar inserir os dados manualmente na aba correspondente."
        });
      }
    } catch (err: any) {
      toast.error('Erro ao processar texto', {
        description: err.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const totalFiles = files.length;
    let successCount = 0;
    let quotaHit = false;

    toast.info(`Processando ${totalFiles} arquivo(s)...`);

    for (let i = 0; i < totalFiles; i++) {
      if (quotaHit) break;

      try {
        const result = await db.processWarrantyFile(files[i]);
        if (result.success) {
          successCount++;
        } else {
          // If the message contains quota-related keywords, we stop further processing
          if (result.message.includes('limite') || result.message.includes('Quota') || result.message.includes('429')) {
            quotaHit = true;
            toast.error(result.message);
          } else {
            toast.error(`Erro no arquivo ${files[i].name}: ${result.message}`);
          }
        }
      } catch (err: any) {
        toast.error(`Falha ao processar ${files[i].name}`);
      }
    }

    setIsProcessing(false);
    if (successCount > 0) {
      toast.success(`${successCount} arquivos processados e dados restaurados com sucesso!`);
      refreshInfo();
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-white/10 w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-xl">
                <HardDrive className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Sistema de Recuperação</h2>
                <p className="text-xs text-muted-foreground">Recupere dados através de notas fiscais ou backup local.</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 border-b border-white/10 flex gap-6 bg-muted/10">
            <button
              onClick={() => setActiveTab('view')}
              className={`py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                activeTab === 'view' ? 'border-blue-500 text-blue-500' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Armazenamento Local
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                activeTab === 'upload' ? 'border-blue-500 text-blue-500' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Processar Notas Fiscais
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {activeTab === 'view' ? (
              <>
                {/* Sidebar - Tables List */}
                <div className="w-1/3 border-r border-white/10 overflow-y-auto bg-muted/10 p-4 space-y-2">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">Tabelas Locais</h3>
                  {storageInfo.map((table) => (
                    <button
                      key={table.name}
                      onClick={() => handleSelectTable(table.name)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${
                        selectedTable === table.name 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                          : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Database className={`h-4 w-4 ${selectedTable === table.name ? 'text-white' : 'text-blue-500'}`} />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold capitalize">{table.name}</span>
                          <span className="text-[9px] opacity-70">{table.count} registros • {formatSize(table.size)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  <div className="mt-8 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-bold text-amber-500">Atenção</span>
                    </div>
                    <p className="text-[10px] text-amber-200/70 leading-relaxed">
                      Limpá-los não afetará os dados salvos na nuvem, mas removerá o acesso offline.
                    </p>
                  </div>
                </div>

                {/* Content - Data Table */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {selectedTable ? (
                    <>
                      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-muted/5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-foreground capitalize">{selectedTable}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full font-bold">
                            {tableData.length} registros
                          </span>
                        </div>
                        <button
                          onClick={() => handleClearTable(selectedTable)}
                          className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1.5 font-bold transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Limpar Tabela
                        </button>
                      </div>
                      <div className="flex-1 overflow-auto p-4">
                        {tableData.length > 0 ? (
                          <div className="space-y-3">
                            {tableData.slice(0, 50).map((item, idx) => (
                              <div key={item.id || idx} className="p-3 bg-muted/30 border border-white/5 rounded-lg font-mono text-[10px] overflow-x-auto whitespace-pre">
                                {JSON.stringify(item, null, 2)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <Database className="h-12 w-12 opacity-10 mb-2" />
                            <p className="text-sm">Nenhum dado encontrado nesta tabela.</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
                      <HardDrive className="h-20 w-20 opacity-10 mb-6" />
                      <h3 className="text-lg font-bold text-foreground mb-2">Selecione uma tabela</h3>
                      <p className="text-sm max-w-xs mx-auto leading-relaxed text-muted-foreground">
                        Visualize os dados brutos armazenados localmente para recuperação manual se necessário.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                <div className="max-w-2xl mx-auto w-full space-y-8">
                  <div className="text-center space-y-4">
                    <div className="bg-blue-600/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border border-blue-600/20">
                      <FileUp className="h-10 w-10 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-foreground">Importação Inteligente</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Selecione fotos ou PDFs de notas fiscais e garantias. Nossa IA irá extrair automaticamente os dados dos clientes e vendas.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-muted/30 rounded-2xl border border-white/5 space-y-3">
                      <div className="bg-green-500/10 w-10 h-10 rounded-xl flex items-center justify-center">
                        <FileCheck className="h-5 w-5 text-green-500" />
                      </div>
                      <h4 className="font-bold text-sm">O que podemos restaurar:</h4>
                      <ul className="text-xs text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">• Dados completos dos clientes</li>
                        <li className="flex items-center gap-2">• Histórico de vendas e datas</li>
                        <li className="flex items-center gap-2">• Detalhes de produtos e valores</li>
                        <li className="flex items-center gap-2">• Métodos de pagamento</li>
                      </ul>
                    </div>
                    <div className="p-6 bg-muted/30 rounded-2xl border border-white/5 space-y-3">
                      <div className="bg-purple-500/10 w-10 h-10 rounded-xl flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-purple-500" />
                      </div>
                      <h4 className="font-bold text-sm">Formatos aceitos:</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Fotos de celular (JPEG, PNG), capturas de tela ou arquivos PDF de garantias e recibos.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      disabled={isProcessing}
                    />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className={`w-full py-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all ${
                        isProcessing 
                          ? 'border-blue-500/50 bg-blue-500/5' 
                          : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 group'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                          <div className="text-center">
                            <p className="text-sm font-bold text-foreground">Analisando documentos...</p>
                            <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos por arquivo</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-blue-500/10 p-4 rounded-full group-hover:scale-110 transition-transform">
                            <Search className="h-8 w-8 text-blue-500" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-foreground">Clique para importar do armazenamento</p>
                            <p className="text-xs text-muted-foreground">Selecione uma ou mais fotos de notas fiscais</p>
                          </div>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-4 space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ou insira o texto manualmente</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="space-y-3">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Cole aqui o texto da nota fiscal ou garantia..."
                        className="w-full h-32 bg-muted/20 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                        disabled={isProcessing}
                      />
                      <button
                        onClick={handleTextUpload}
                        disabled={isProcessing || !noteText.trim()}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <FileUp className="h-4 w-4" />
                            Processar Texto
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-muted/50 border-t border-white/10 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-foreground text-xs font-bold rounded-xl transition-colors border border-white/10"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
