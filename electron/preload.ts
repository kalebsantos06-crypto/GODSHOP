import { contextBridge, ipcRenderer } from 'electron';

/**
 * GODSHOP Electron Preload Script
 * Safely exposes desktop IPC APIs to the renderer process with context isolation enabled.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  platform: 'windows',
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  saveFile: (fileName: string, dataBase64: string) => ipcRenderer.invoke('save-file', { fileName, dataBase64 }),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  printPage: () => ipcRenderer.invoke('print-page'),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', { title, body }),
});
