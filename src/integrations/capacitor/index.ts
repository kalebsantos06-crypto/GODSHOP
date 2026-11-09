import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Native Capacitor helper integrations with automatic web fallbacks
 */
export const NativeDevice = {
  isNative: () => Capacitor.isNativePlatform(),
  getPlatform: () => Capacitor.getPlatform(),

  /**
   * Share text or URL using native dialog or Web Share API
   */
  share: async (options: { title?: string; text?: string; url?: string; dialogTitle?: string }) => {
    try {
      if (Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && !!navigator.share)) {
        await Share.share(options);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[NativeDevice] Share aborted or unavailable', e);
      return false;
    }
  },

  /**
   * Write file to device storage (e.g. PDF receipt, CSV backup)
   */
  writeFile: async (fileName: string, base64Data: string) => {
    if (Capacitor.isNativePlatform()) {
      return await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
      });
    }
    return null;
  },
};

export default NativeDevice;
