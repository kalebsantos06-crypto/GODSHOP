import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { backupService } from './backupService';

const STORAGE_KEY_BG_ENABLED = 'godshop_background_mode_enabled';
const LAST_BACKUP_KEY = 'godshop_last_auto_backup_date';

class BackgroundService {
  private isEnabled: boolean = true;
  private wakeLockSentinel: any = null;
  private audioContext: AudioContext | null = null;
  private keepAliveInterval: any = null;
  private isInitialized: boolean = false;
  private onSyncCallbacks: Set<() => Promise<void> | void> = new Set();

  constructor() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BG_ENABLED);
      this.isEnabled = stored !== null ? stored === 'true' : true;
    } catch (e) {
      this.isEnabled = true;
    }
  }

  public isBackgroundEnabled(): boolean {
    return this.isEnabled;
  }

  public setBackgroundEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY_BG_ENABLED, String(enabled));
    } catch (e) {}

    if (enabled) {
      this.startKeepAlive();
      this.requestWakeLock();
    } else {
      this.stopKeepAlive();
      this.releaseWakeLock();
    }
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[BackgroundService] Initializing background execution engine (APK & Desktop)...');

    // Registrar tarefa de backup diário
    this.registerSyncTask(async () => {
      await this.runAutoBackup();
    });

    // 1. Listen for Capacitor App state changes (Android APK foreground <-> background)
    if (Capacitor.isNativePlatform()) {
      try {
        App.addListener('appStateChange', async (state) => {
          console.log(`[BackgroundService] Android app state: ${state.isActive ? 'ACTIVE' : 'BACKGROUND'}`);
          
          if (!state.isActive) {
            // App went to background - execute immediate sync check and ensure keep-alive
            if (this.isEnabled) {
              this.triggerSync();
              this.startKeepAlive();
            }
          } else {
            // App returned to foreground - trigger immediate sync and refresh
            this.triggerSync();
            this.requestWakeLock();
          }
        });

        // Prevent Android back button from completely terminating app when in root
        App.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            App.minimizeApp();
          }
        });
      } catch (err) {
        console.warn('[BackgroundService] Capacitor App listener error:', err);
      }
    }

    // 2. Start keep-alive loop and wake lock if enabled
    if (this.isEnabled) {
      this.startKeepAlive();
      this.requestWakeLock();
    }

    // 3. Keep wake lock re-acquired on tab or window focus
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isEnabled) {
          this.requestWakeLock();
          this.triggerSync();
        }
      });
    }
  }

  public isAutoBackupEnabled(): boolean {
    try {
      const stored = localStorage.getItem('godshop_auto_backup_enabled');
      return stored !== null ? stored === 'true' : true;
    } catch (e) {
      return true;
    }
  }

  public setAutoBackupEnabled(enabled: boolean): void {
    try {
      localStorage.setItem('godshop_auto_backup_enabled', String(enabled));
    } catch (e) {}
  }

  public getLastAutoBackupDate(): string | null {
    try {
      const ts = localStorage.getItem(LAST_BACKUP_KEY);
      if (!ts) return null;
      return new Date(parseInt(ts)).toLocaleString('pt-BR');
    } catch (e) {
      return null;
    }
  }

  public async runAutoBackup(force: boolean = false): Promise<{ success: boolean; message: string; fileName?: string }> {
    if (!force && !this.isAutoBackupEnabled()) {
      return { success: false, message: 'Backup automático desativado pelo usuário.' };
    }

    const lastBackupStr = localStorage.getItem(LAST_BACKUP_KEY);
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (!force && lastBackupStr && now - parseInt(lastBackupStr) < TWENTY_FOUR_HOURS) {
      return { success: true, message: 'Backup diário já realizado nas últimas 24 horas.' };
    }

    console.log('[BackgroundService] Executando backup diário...');
    try {
      const data = await backupService.exportData();
      const jsonStr = JSON.stringify(data, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `backup_diario_godshop_${dateStr}.json`;

      let savedNative = false;
      if (Capacitor.isNativePlatform()) {
        try {
          let hasPermission = true;
          try {
            const status = await Filesystem.checkPermissions();
            if (status.publicStorage !== 'granted') {
              const req = await Filesystem.requestPermissions();
              hasPermission = req.publicStorage === 'granted';
            }
          } catch (pErr) {}

          await Filesystem.writeFile({
            path: fileName,
            data: jsonStr,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
            recursive: true
          });
          savedNative = true;
          console.log('[BackgroundService] Backup diário salvo no armazenamento local Documents.');
        } catch (fsErr) {
          console.warn('[BackgroundService] Falha ao salvar em Documents, tentando Cache:', fsErr);
          try {
            await Filesystem.writeFile({
              path: fileName,
              data: jsonStr,
              directory: Directory.Cache,
              encoding: Encoding.UTF8,
              recursive: true
            });
            savedNative = true;
          } catch (cacheErr) {
            console.error('[BackgroundService] Erro definitivo ao gravar no filesystem:', cacheErr);
          }
        }
      }

      // Salvar nos metadados de backups locais
      const { localBackupStorage } = await import('./localBackupStorage');
      localBackupStorage.saveMetadata({
        id: `auto_${Date.now()}`,
        name: fileName,
        path: fileName,
        createdAt: new Date().toISOString(),
        sizeBytes: new Blob([jsonStr]).size,
        isAuto: true,
        content: jsonStr
      });

      localStorage.setItem(LAST_BACKUP_KEY, now.toString());
      return {
        success: true,
        message: savedNative 
          ? `Backup diário salvo na pasta Documentos (${fileName})`
          : `Backup diário gerado com sucesso (${fileName})`,
        fileName
      };
    } catch (err: any) {
      console.error('[BackgroundService] Falha no backup automático:', err);
      return { success: false, message: err?.message || 'Falha ao executar backup automático.' };
    }
  }
  
  // ... (keep alive methods remain unchanged)


  /**
   * Register a callback to be executed on background sync ticks
   */
  public registerSyncTask(task: () => Promise<void> | void): () => void {
    this.onSyncCallbacks.add(task);
    return () => {
      this.onSyncCallbacks.delete(task);
    };
  }

  private async triggerSync(): Promise<void> {
    for (const callback of this.onSyncCallbacks) {
      try {
        await callback();
      } catch (err) {
        console.warn('[BackgroundService] Sync task error:', err);
      }
    }
  }

  /**
   * Keeps the CPU awake using Screen Wake Lock API (supported on Chrome, Edge, Android WebView, Electron)
   */
  public async requestWakeLock(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        return true;
      }

      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      this.wakeLockSentinel.addEventListener('release', () => {
        this.wakeLockSentinel = null;
      });
      console.log('[BackgroundService] Wake Lock acquired successfully.');
      return true;
    } catch (err) {
      // Browser might reject wake lock if window is not visible or battery is critically low
      return false;
    }
  }

  public releaseWakeLock(): void {
    try {
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
        console.log('[BackgroundService] Wake Lock released.');
      }
    } catch (e) {}
  }

  /**
   * Starts a silent audio keep-alive and interval heartbeat.
   * Mobile OSes (Android) and desktop OSes allow WebViews / background windows
   * with active audio contexts to maintain process priority in the background.
   */
  private startKeepAlive(): void {
    if (this.keepAliveInterval) return;

    // Heartbeat every 60 seconds
    this.keepAliveInterval = setInterval(() => {
      this.triggerSync();
    }, 60000);

    // Setup silent audio keep-alive upon first user gesture
    const enableSilentAudio = () => {
      try {
        if (!this.audioContext && (window.AudioContext || (window as any).webkitAudioContext)) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          this.audioContext = new AudioCtx();
          
          // Create an inaudible buffer oscillator (zero gain)
          const osc = this.audioContext.createOscillator();
          const gain = this.audioContext.createGain();
          gain.gain.value = 0.00001; // virtually silent
          osc.connect(gain);
          gain.connect(this.audioContext.destination);
          osc.start();
          console.log('[BackgroundService] Inaudible background keep-alive audio active.');
        } else if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      } catch (e) {
        // AudioContext might require user interaction first
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('click', enableSilentAudio, { once: true });
      window.addEventListener('touchstart', enableSilentAudio, { once: true });
    }
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
  }

  /**
   * Helper to open Android app settings so the user can disable battery optimization / battery saver
   * for GODSHOP on Samsung, Xiaomi, Motorola, etc.
   */
  public async openAndroidBatterySettings(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') {
      return false;
    }

    try {
      await NativeSettings.openAndroid({
        option: AndroidSettings.ApplicationDetails
      });
      return true;
    } catch (error) {
      console.warn('[BackgroundService] Failed to open native settings:', error);
      return false;
    }
  }
}

export const backgroundService = new BackgroundService();
