import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      isElectron: boolean;
      getAppVersion: () => Promise<string>;
      saveFile: (fileName: string, dataBase64: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      openExternal: (url: string) => Promise<boolean>;
      printPage: () => Promise<boolean>;
      showNotification: (title: string, body: string) => Promise<boolean>;
    };
  }
}

export type PlatformType = 'web' | 'android' | 'ios' | 'windows';

/**
 * Universal Platform Detector & Cross-Platform Bridge for GODSHOP
 * Standardizes native operations across Web, Android (Capacitor) and Windows (Electron).
 */
export const PlatformBridge = {
  getPlatform(): PlatformType {
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      return 'windows';
    }
    if (Capacitor.isNativePlatform()) {
      const capPlatform = Capacitor.getPlatform();
      return capPlatform === 'android' ? 'android' : 'ios';
    }
    return 'web';
  },

  isWindows(): boolean {
    return this.getPlatform() === 'windows';
  },

  isAndroid(): boolean {
    return this.getPlatform() === 'android';
  },

  isNativeMobile(): boolean {
    return Capacitor.isNativePlatform();
  },

  isWeb(): boolean {
    return this.getPlatform() === 'web';
  },

  /**
   * Universal share text or document link across platforms
   */
  async share(options: { title?: string; text?: string; url?: string; dialogTitle?: string }): Promise<boolean> {
    try {
      if (this.isWindows() && window.electronAPI) {
        if (options.url) {
          await window.electronAPI.openExternal(options.url);
          return true;
        }
      }

      if (this.isNativeMobile() || (typeof navigator !== 'undefined' && !!navigator.share)) {
        await Share.share(options);
        return true;
      }

      // Web fallback: copy URL to clipboard
      if (options.url && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(options.url);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[PlatformBridge] Share warning:', e);
      return false;
    }
  },

  /**
   * Save generated document or receipt PDF to platform storage
   */
  async saveFile(fileName: string, base64Data: string): Promise<{ success: boolean; path?: string }> {
    try {
      // 1. Windows Electron
      if (this.isWindows() && window.electronAPI) {
        const res = await window.electronAPI.saveFile(fileName, base64Data);
        return { success: res.success, path: res.filePath };
      }

      // 2. Android Capacitor
      if (this.isNativeMobile()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });
        return { success: true, path: result.uri };
      }

      // 3. Web Browser Download
      if (typeof window !== 'undefined') {
        const link = document.createElement('a');
        link.href = base64Data.startsWith('data:') ? base64Data : `data:application/octet-stream;base64,${base64Data}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true };
      }

      return { success: false };
    } catch (err: any) {
      console.warn('[PlatformBridge] File save error:', err);
      return { success: false };
    }
  },

  /**
   * Trigger native system notification
   */
  async notify(title: string, body: string): Promise<boolean> {
    try {
      if (this.isWindows() && window.electronAPI) {
        return await window.electronAPI.showNotification(title, body);
      }
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body });
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  /**
   * Trigger native document printing
   */
  async print(): Promise<boolean> {
    try {
      if (this.isWindows() && window.electronAPI) {
        return await window.electronAPI.printPage();
      }
      if (typeof window !== 'undefined') {
        window.print();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },
};

export default PlatformBridge;
