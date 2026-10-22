import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  RefreshCw, 
  Download, 
  Trash2, 
  Database, 
  RotateCcw, 
  Clock, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  Share2, 
  Sparkles,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { localBackupStorage, LocalBackupItem } from '../services/localBackupStorage';
import { backgroundService } from '../services/backgroundService';
import { backupService } from '../services/backupService';

interface LocalBackupManagerProps {
  onBackupRestored?: () => void;
  onRequestManualBackup?: () => void;
}

export const LocalBackupManager: React.FC<LocalBackupManagerProps> = ({
  onBackupRestored,
  onRequestManualBackup
}) => {
  const [backups, setBackups] = useState<LocalBackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(() => backgroundService.isAutoBackupEnabled());
  const [lastAutoBackup, setLastAutoBackup] = useState<string | null>(() => backgroundService.getLastAutoBackupDate());
  const [isExecutingAutoBackup, setIsExecutingAutoBackup] = useState(false);
  
  // Modal de confirmação de restauração
  const [backupToRestore, setBackupToRestore] = useState<LocalBackupItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Carregar lista de backups
  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const list = await localBackupStorage.listBackups();
      setBackups(list);
      setLastAutoBackup(backgroundService.getLastAutoBackupDate());
    } catch (err) {
      console.error('Erro ao listar backups locais:', err);
      toast.error('Erro ao carregar lista de backups.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  // Alternar backup automático
  const handleToggleAutoBackup = (enabled: boolean) => {
    setIsAutoBackupEnabled(enabled);
    backgroundService.setAutoBackupEnabled(enabled);
    toast.success(
      enabled 
        ? 'Backup automático diário ativado! O sistema salvará cópias locais automaticamente.' 
        : 'Backup automático diário pausado.'
    );
  };

  // Executar backup diário imediatamente
  const handleTriggerDailyBackupNow = async () => {
    setIsExecutingAutoBackup(true);
    try {
      const result = await backgroundService.runAutoBackup(true);
      if (result.success) {
        toast.success(result.message);
        await loadBackups();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao executar backup diário.');
    } finally {
      setIsExecutingAutoBackup(false);
    }
  };

  // Compartilhar / Exportar arquivo
  const handleShareOrExport = async (item: LocalBackupItem) => {
    const success = await localBackupStorage.exportOrShareBackup(item);
    if (!success) {
      toast.error('Não foi possível exportar o arquivo.');
    }
  };

  // Excluir arquivo de backup
  const handleDeleteBackup = async (item: LocalBackupItem) => {
    const confirmed = window.confirm(`Deseja realmente excluir o backup "${item.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      await localBackupStorage.deleteBackup(item);
      toast.success(`Backup "${item.name}" removido com sucesso.`);
      setBackups(prev => prev.filter(b => b.name !== item.name && b.id !== item.id));
    } catch (err) {
      toast.error('Erro ao excluir backup.');
    }
  };

  // Confirmar e restaurar backup
  const handleConfirmRestore = async () => {
    if (!backupToRestore) return;
    setIsRestoring(true);

    try {
      const content = await localBackupStorage.readBackupContent(backupToRestore);
      if (!content) {
        toast.error('Não foi possível ler os dados do arquivo de backup.');
        return;
      }

      const result = await backupService.importData(content);
      if (result.success) {
        toast.success(result.message);
        setBackupToRestore(null);
        if (onBackupRestored) {
          onBackupRestored();
        }
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error('Erro ao restaurar backup: ' + (err?.message || 'Falha desconhecida'));
    } finally {
      setIsRestoring(false);
    }
  };

  // Formatar bytes
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  // Formatar data
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Painel de Backup Automático Diário */}
      <div className="border border-border/70 rounded-xl p-5 bg-card/60 backdrop-blur-sm space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                Backup Automático Diário
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isAutoBackupEnabled 
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                    : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  {isAutoBackupEnabled ? 'Ativo' : 'Pausado'}
                </span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gera e salva automaticamente um arquivo JSON no armazenamento interno do dispositivo a cada 24 horas.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none self-start sm:self-center">
            <input
              type="checkbox"
              checked={isAutoBackupEnabled}
              onChange={(e) => handleToggleAutoBackup(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Último backup automático:</span>
            <strong className="text-foreground font-semibold">
              {lastAutoBackup || 'Nenhum registro nas últimas 24h'}
            </strong>
          </div>

          <button
            type="button"
            disabled={isExecutingAutoBackup}
            onClick={handleTriggerDailyBackupNow}
            className="w-full sm:w-auto bg-muted hover:bg-muted/80 text-foreground font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 border border-border/80 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isExecutingAutoBackup ? 'animate-spin text-emerald-500' : ''}`} />
            {isExecutingAutoBackup ? 'Executando Backup...' : 'Executar Backup Diário Agora'}
          </button>
        </div>
      </div>

      {/* Gerenciador Visual de Backups Locais */}
      <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                Gerenciador de Backups Locais
                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {backups.length} {backups.length === 1 ? 'arquivo' : 'arquivos'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Arquivos de cópia de segurança salvos no aparelho (pasta Documentos / armazenamento local).
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={loadBackups}
            className="self-start sm:self-center bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-border/60 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            Atualizar Lista
          </button>
        </div>

        {/* Lista de Arquivos */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
            Buscando arquivos de backup salvos...
          </div>
        ) : backups.length === 0 ? (
          <div className="py-8 px-4 text-center border border-dashed border-border/80 rounded-xl bg-muted/10 space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Database className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Nenhum arquivo de backup encontrado ainda</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Crie um backup manual ou ative o backup automático diário para manter o histórico seguro salvo no seu celular.
              </p>
            </div>
            {onRequestManualBackup && (
              <button
                type="button"
                onClick={onRequestManualBackup}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Criar Primeiro Backup Agora
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-background/50">
            {backups.map((item) => (
              <div 
                key={item.id || item.name}
                className="p-3.5 hover:bg-muted/30 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                    item.isAuto 
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {item.isAuto ? <Sparkles className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-foreground font-mono truncate max-w-xs sm:max-w-md">
                        {item.name}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                        item.isAuto 
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {item.isAuto ? 'Automático Diário' : 'Manual'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(item.createdAt)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatBytes(item.sizeBytes)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações individuais */}
                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                  {/* Restaurar */}
                  <button
                    type="button"
                    title="Restaurar dados deste backup"
                    onClick={() => setBackupToRestore(item)}
                    className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restaurar</span>
                  </button>

                  {/* Exportar / Compartilhar */}
                  <button
                    type="button"
                    title="Compartilhar ou exportar arquivo"
                    onClick={() => handleShareOrExport(item)}
                    className="bg-muted hover:bg-muted/80 text-foreground border border-border px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5 text-primary" />
                    <span>Exportar</span>
                  </button>

                  {/* Excluir */}
                  <button
                    type="button"
                    title="Excluir arquivo de backup"
                    onClick={() => handleDeleteBackup(item)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          <span>Local nativo: <code>Documents/</code> no Android</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Validação de integridade ativada
          </span>
        </div>
      </div>

      {/* Modal de Confirmação de Restauração */}
      {backupToRestore && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                <RotateCcw className="h-5 w-5 text-amber-500" />
                Restaurar Backup Local
              </h3>
              <button
                onClick={() => setBackupToRestore(null)}
                disabled={isRestoring}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <AlertTriangle className="h-4 w-4" />
                  Atenção ao restaurar dados
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Os dados do sistema serão atualizados com as informações contidas neste arquivo de backup. Duplicatas serão unificadas de forma automática.
                </p>
              </div>

              <div className="border border-border/60 rounded-xl p-3 bg-muted/20 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Arquivo:</span>
                  <span className="font-mono font-bold text-foreground truncate max-w-[220px]">
                    {backupToRestore.name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Tipo de cópia:</span>
                  <span className="font-semibold text-foreground">
                    {backupToRestore.isAuto ? 'Backup Automático Diário' : 'Exportação Manual'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Data de criação:</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(backupToRestore.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Tamanho:</span>
                  <span className="font-semibold text-foreground">
                    {formatBytes(backupToRestore.sizeBytes)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-black" />
                    Restaurando e unificando banco de dados...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Confirmar Restauração Deste Backup
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setBackupToRestore(null)}
                className="w-full bg-muted hover:bg-muted/80 text-foreground font-semibold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
