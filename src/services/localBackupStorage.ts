import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { checkAndRequestStoragePermission } from '../utils/permissionUtils';

export interface LocalBackupItem {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  sizeBytes: number;
  isAuto: boolean;
  itemCount?: number;
  content?: string;
}

const STORAGE_KEY_METADATA = 'godshop_local_backups_metadata';

export const localBackupStorage = {
  /**
   * Obtém a lista de metadados salvos localmente
   */
  getStoredMetadata(): LocalBackupItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_METADATA);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Salva metadados de um novo backup
   */
  saveMetadata(item: LocalBackupItem): void {
    try {
      const list = this.getStoredMetadata();
      const filtered = list.filter(b => b.name !== item.name && b.id !== item.id);
      filtered.unshift(item);
      // Manter até 50 históricos de backup
      const trimmed = filtered.slice(0, 50);
      localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Erro ao salvar metadados de backup:', e);
    }
  },

  /**
   * Remove metadados de um backup
   */
  removeMetadata(nameOrId: string): void {
    try {
      const list = this.getStoredMetadata();
      const updated = list.filter(b => b.name !== nameOrId && b.id !== nameOrId);
      localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao remover metadados:', e);
    }
  },

  /**
   * Lista todos os backups disponíveis (combina arquivos físicos do Documents no Android com os metadados registrados)
   */
  async listBackups(): Promise<LocalBackupItem[]> {
    const metadataList = this.getStoredMetadata();
    const mapByName = new Map<string, LocalBackupItem>();

    // Indexar metadados
    for (const item of metadataList) {
      mapByName.set(item.name, item);
    }

    // Se estiver em ambiente nativo Capacitor (Android/iOS), verificar arquivos reais na pasta Documents
    if (Capacitor.isNativePlatform()) {
      try {
        const dirResult = await Filesystem.readdir({
          path: '',
          directory: Directory.Documents
        });

        if (dirResult && Array.isArray(dirResult.files)) {
          for (const file of dirResult.files) {
            const fileName = typeof file === 'string' ? file : file.name;
            if (fileName && fileName.endsWith('.json') && (fileName.includes('backup') || fileName.includes('godshop'))) {
              if (!mapByName.has(fileName)) {
                // Arquivo físico encontrado que não estava nos metadados
                let sizeBytes = 1024 * 10;
                let createdAt = new Date().toISOString();

                try {
                  const stat = await Filesystem.stat({
                    path: fileName,
                    directory: Directory.Documents
                  });
                  if (stat) {
                    sizeBytes = stat.size || sizeBytes;
                    if (stat.mtime) {
                      createdAt = new Date(stat.mtime).toISOString();
                    }
                  }
                } catch (statErr) {}

                const isAuto = fileName.toLowerCase().includes('diario') || fileName.toLowerCase().includes('auto');
                mapByName.set(fileName, {
                  id: 'file_' + fileName,
                  name: fileName,
                  path: fileName,
                  createdAt,
                  sizeBytes,
                  isAuto
                });
              } else {
                // Atualizar tamanho do arquivo físico se disponível
                const existing = mapByName.get(fileName)!;
                try {
                  const stat = await Filesystem.stat({
                    path: fileName,
                    directory: Directory.Documents
                  });
                  if (stat && stat.size) {
                    existing.sizeBytes = stat.size;
                  }
                } catch (e) {}
              }
            }
          }
        }
      } catch (nativeErr) {
        console.warn('Não foi possível ler diretório Documents nativo:', nativeErr);
      }
    }

    // Ordenar do mais novo para o mais antigo
    const results = Array.from(mapByName.values());
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  },

  /**
   * Lê o conteúdo JSON de um backup
   */
  async readBackupContent(item: LocalBackupItem): Promise<string | null> {
    // 1. Tentar ler do filesystem nativo se em plataforma Capacitor
    if (Capacitor.isNativePlatform()) {
      try {
        const fileData = await Filesystem.readFile({
          path: item.name,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });

        if (typeof fileData.data === 'string') {
          return fileData.data;
        }
      } catch (nativeReadErr) {
        console.warn('Falha ao ler arquivo nativo:', nativeReadErr);
      }
    }

    // 2. Fallback para conteúdo guardado em cache de metadados
    if (item.content) {
      return item.content;
    }

    return null;
  },

  /**
   * Exporta ou compartilha um arquivo de backup individual
   */
  async exportOrShareBackup(item: LocalBackupItem): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const hasPerm = await checkAndRequestStoragePermission();
        if (!hasPerm) return false;

        // Verificar se arquivo existe no Documents; se não, gravar primeiro
        try {
          await Filesystem.stat({
            path: item.name,
            directory: Directory.Documents
          });
        } catch (notFound) {
          if (item.content) {
            await Filesystem.writeFile({
              path: item.name,
              data: item.content,
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
              recursive: true
            });
          }
        }

        const fileUri = await Filesystem.getUri({
          path: item.name,
          directory: Directory.Documents
        });

        if (fileUri && fileUri.uri) {
          await Share.share({
            title: `Backup GODSHOP - ${item.name}`,
            text: `Arquivo de backup ${item.name}`,
            url: fileUri.uri,
            dialogTitle: 'Exportar / Salvar Backup'
          });
          toast.success('Compartilhamento aberto com sucesso!');
          return true;
        }
      } catch (shareErr) {
        console.warn('Erro ao compartilhar backup nativo:', shareErr);
        toast.error('Erro ao compartilhar via sistema nativo.');
      }
    }

    // Fallback Web: download do arquivo via saveAs
    try {
      const content = await this.readBackupContent(item);
      if (!content) {
        toast.error('Conteúdo do backup não encontrado para download.');
        return false;
      }
      const blob = new Blob([content], { type: 'application/json' });
      saveAs(blob, item.name);
      toast.success(`Download de ${item.name} concluído!`);
      return true;
    } catch (webErr) {
      toast.error('Não foi possível realizar o download.');
      return false;
    }
  },

  /**
   * Exclui um backup individual
   */
  async deleteBackup(item: LocalBackupItem): Promise<boolean> {
    let deleted = false;

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.deleteFile({
          path: item.name,
          directory: Directory.Documents
        });
        deleted = true;
      } catch (delErr) {
        console.warn('Arquivo físico não encontrado ou já excluído:', delErr);
      }
    }

    // Sempre remover dos metadados locais
    this.removeMetadata(item.name);
    this.removeMetadata(item.id);
    return true;
  }
};
