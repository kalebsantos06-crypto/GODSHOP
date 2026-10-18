/**
 * Background Service for Android Capacitor APK and Desktop Executable (.exe)
 * Ensures continuous operation, background sync, wake lock, and prevents OS sleep/suspend.
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';

const STORAGE_KEY_BG_ENABLED = 'godshop_background_mode_enabled';

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

  /**
   * Initializes background listeners, Capacitor appStateChange handlers,
   * and starts keep-alive mechanisms.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[BackgroundService] Initializing background execution engine (APK & Desktop)...');

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
            // Minimizes app to background instead of killing process
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

    // Heartbeat every 15 seconds
    this.keepAliveInterval = setInterval(() => {
      this.triggerSync();
    }, 15000);

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
