import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

/**
 * Utilitário para gerenciar permissões de armazenamento nativo no Android.
 * Lida com as diferenças de permissão entre versões do Android.
 */
export const checkAndRequestStoragePermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return true; // Não é necessário em navegadores web
  }

  try {
    // Verifica o status atual das permissões
    const status = await Filesystem.checkPermissions();

    if (status.publicStorage === 'granted') {
      return true;
    }

    // Solicita permissão se ainda não foi concedida
    const request = await Filesystem.requestPermissions();
    if (request.publicStorage === 'granted') {
      return true;
    }

    // Se negado, exibe alerta amigável
    toast.error('Permissão de armazenamento negada.', {
      description: 'Para salvar backups, vá em Configurações > Aplicativos > GODSHOP > Permissões e habilite o acesso a Arquivos/Armazenamento.'
    });
    return false;
  } catch (err) {
    console.error('Erro ao verificar permissões de armazenamento:', err);
    toast.error('Não foi possível verificar as permissões de armazenamento.');
    return false;
  }
};
