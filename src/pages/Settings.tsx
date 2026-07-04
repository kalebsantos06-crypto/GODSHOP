import React, { useState, useEffect } from 'react';
import { Upload, LogOut, Image as ImageIcon, Smartphone, Database, Download, FileJson, Search, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../types/AuthContext';
import { toast } from 'sonner';
import { backupService } from '../services/backupService';
import { useQueryClient } from '@tanstack/react-query';

import { db } from '../services/db';
import StorageExplorer from '../components/StorageExplorer';

export default function Settings() {
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isStorageExplorerOpen, setIsStorageExplorerOpen] = useState(false);

  useEffect(() => {
    setBgPreview(localStorage.getItem('app_background') || '/background.jpg');
    setLogoPreview(localStorage.getItem('app_logo') || null);
  }, []);

  const handleExport = async () => {
    try {
      const data = await backupService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_sistema_godshop_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Cópia de segurança exportada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao exportar backup: ' + err.message);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = await backupService.importData(json);
        if (result.success) {
          toast.success(result.message);
          queryClient.invalidateQueries();
        } else {
          toast.error(result.message);
        }
      } catch (err: any) {
        toast.error('Arquivo de backup corrompido ou inválido: ' + err.message);
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          localStorage.setItem(key, base64String);
          setPreview(base64String);
          window.dispatchEvent(new Event('settings_updated'));
          
          if (user?.id) {
            await fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                settings: {
                  [key]: base64String
                }
              })
            });
          }
          
          toast.success('Imagem atualizada com sucesso!');
        } catch (err) {
          toast.error('Erro ao salvar imagem. O arquivo pode ser muito grande.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async (key: string, setPreview: React.Dispatch<React.SetStateAction<string | null>>, defaultVal: string | null) => {
    localStorage.removeItem(key);
    setPreview(defaultVal);
    window.dispatchEvent(new Event('settings_updated'));
    
    if (user?.id) {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          settings: {
            [key]: defaultVal
          }
        })
      });
    }
    
    toast.success('Imagem removida com sucesso!');
  };

  const handleRestoreData = async () => {
    if (!confirm('Isso irá restaurar os dados originais dos clientes das notas fiscais. Deseja continuar?')) return;
    
    setIsRestoring(true);
    try {
      const result = await db.restoreFromWarranties();
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao restaurar dados');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSearchStorage = async () => {
    setIsStorageExplorerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Settings */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Smartphone className="h-5 w-5 text-primary" />
            Logo do Aplicativo
          </h2>
          <div className="flex flex-col items-center gap-4">
            <div className="h-32 w-32 rounded-2xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden shadow-inner">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-cover" />
              ) : (
                <Smartphone className="h-10 w-10 text-muted-foreground opacity-50" />
              )}
            </div>
            <div className="flex gap-2 w-full">
              <label className="flex-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium text-center transition-colors">
                <Upload className="h-4 w-4 inline-block mr-2" />
                Alterar Logo
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleImageUpload(e, 'app_logo', setLogoPreview)}
                />
              </label>
              {logoPreview && (
                <button 
                  onClick={() => handleRemoveImage('app_logo', setLogoPreview, null)}
                  className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors"
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Recomendado: Imagem quadrada (PNG/JPG) de até 2MB.
            </p>
          </div>
        </div>

        {/* Background Settings */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-primary" />
            Plano de Fundo
          </h2>
          <div className="flex flex-col items-center gap-4">
            <div className="h-24 w-full rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden relative">
              {bgPreview ? (
                <img src={bgPreview} alt="Background Preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2 w-full">
              <label className="flex-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium text-center transition-colors">
                <Upload className="h-4 w-4 inline-block mr-2" />
                Alterar Fundo
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleImageUpload(e, 'app_background', setBgPreview)}
                />
              </label>
              {bgPreview !== '/background.jpg' && (
                <button 
                  onClick={() => handleRemoveImage('app_background', setBgPreview, '/background.jpg')}
                  className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors"
                >
                  Restaurar
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Recomendado: Imagem vertical (PNG/JPG) de até 2MB.
            </p>
          </div>
        </div>
      </div>

      {/* Cópia de Segurança e Backup */}
      <div className="bg-card border rounded-xl p-6 shadow-sm mt-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-2 text-foreground">
          <Database className="h-5 w-5 text-amber-500" />
          Cópia de Segurança & Restauração
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Exporte todos os seus dados (clientes, estoque, fornecedores e notas fiscais) para um arquivo de segurança local, ou restaure um arquivo de backup que você salvou anteriormente.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Export card */}
          <div className="border border-border rounded-xl p-4 bg-muted/10 hover:bg-muted/25 transition flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground mb-1">
                <Download className="h-4 w-4 text-primary" />
                Criar Cópia de Segurança (Exportar)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Baixa um arquivo JSON seguro com todos os registros atuais para o seu computador ou celular.
              </p>
            </div>
            <button
              onClick={handleExport}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="h-4 w-4" />
              Exportar Arquivo de Backup
            </button>
          </div>

          {/* Import card */}
          <div className="border border-border rounded-xl p-4 bg-muted/10 hover:bg-muted/25 transition flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground mb-1">
                <FileJson className="h-4 w-4 text-amber-500" />
                Carregar Backup Existente (Importar)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Selecione o arquivo de backup <code>.json</code> salvo anteriormente para restabelecer todo o seu banco de dados.
              </p>
            </div>
            <label className="w-full bg-amber-500 text-black hover:bg-amber-600 py-2.5 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm text-center">
              {isImporting ? (
                <>
                  <div className="h-3 w-3 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  Restaurando dados...
                </>
              ) : (
                <>
                  <FileJson className="h-4 w-4" />
                  Importar Arquivo de Backup
                </>
              )}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-xs text-amber-500 flex flex-col gap-3">
          <div className="flex gap-2">
            <Database className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Sincronização com Nuvem:</strong> Se você já cadastrou uma conta de acesso (E-mail e Senha) e seus dados sumiram, faça login clicando no ícone de perfil no menu lateral para que seus dados guardados na nuvem sejam baixados de volta automaticamente.
            </span>
          </div>
          
          <button
            onClick={async () => {
              try {
                toast.promise(db.syncAll(), {
                  loading: 'Sincronizando dados com a nuvem...',
                  success: (data) => data.message,
                  error: 'Erro ao sincronizar dados. Verifique sua conexão.'
                });
                queryClient.invalidateQueries();
              } catch (e) {
                console.error(e);
              }
            }}
            className="w-full bg-amber-500 text-black hover:bg-amber-600 py-2.5 rounded-lg text-[10px] font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-amber-600/20 active:scale-95 uppercase"
          >
            <Download className="h-4 w-4" />
            Sincronizar Dados Locais para Nuvem (Enviar Agora)
          </button>
        </div>

        {/* Restore from Warranties Button */}
        <div className="mt-6 border-t border-white/10 pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-amber-500/10 p-2.5 rounded-xl">
                <Database className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Restauração de Dados das Notas</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  Recupere Ramon Dornelas, Yuri dos Santos e Carlos Eduardo.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
              <button
                onClick={async () => {
                  try {
                    toast.promise(db.autoSeed(), {
                      loading: 'Carregando dados de exemplo...',
                      success: 'Dados de exemplo carregados!',
                      error: 'Erro ao carregar dados de exemplo'
                    });
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="bg-white/5 text-white hover:bg-white/10 px-4 py-3 rounded-xl text-[10px] font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-white/10 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                CARREGAR CLIENTES EXEMPLO
              </button>

              <button
                onClick={handleRestoreData}
                disabled={isRestoring}
                className="bg-amber-500 text-black hover:bg-amber-600 px-4 py-3 rounded-xl text-[10px] font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
              >
                <Database className="h-4 w-4" />
                {isRestoring ? 'RESTAURANDO...' : 'RESTAURAR NOTAS'}
              </button>
              
              <button
                onClick={handleSearchStorage}
                disabled={isRestoring}
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-3 rounded-xl text-[10px] font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
              >
                <Search className="h-4 w-4" />
                {isRestoring ? 'BUSCANDO...' : 'IMPORTAR ARQUIVO'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <StorageExplorer 
        isOpen={isStorageExplorerOpen} 
        onClose={() => setIsStorageExplorerOpen(false)} 
      />

      <div className="bg-card border border-white/10 rounded-xl p-6 shadow-sm mt-6">
        <h2 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-4">
          <LogOut className="h-5 w-5" />
          Sessão
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Deseja encerrar sua sessão atual no aplicativo?
        </p>
        <button
          onClick={logout}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sair do Aplicativo
        </button>
      </div>
    </div>
  );
}
