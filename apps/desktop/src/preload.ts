import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, validated APIs to the renderer window
// Node Integration is disabled and Context Isolation is strictly enabled.
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isDesktop: true,
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  getSystemInfo: (): Promise<{ platform: string; arch: string; osRelease: string }> =>
    ipcRenderer.invoke('get-system-info'),
  minimize: (): Promise<void> => ipcRenderer.invoke('window-minimize'),
  maximize: (): Promise<void> => ipcRenderer.invoke('window-maximize'),
  close: (): Promise<void> => ipcRenderer.invoke('window-close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window-is-maximized'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
});
