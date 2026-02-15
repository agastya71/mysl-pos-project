import { contextBridge, ipcRenderer } from 'electron';

export interface AppConfig {
  apiUrl: string;
  terminalId: string;
  autoUpdate: boolean;
  updateCheckInterval: number;
  environment: string;
}

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,

  // Configuration management
  config: {
    get: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
    update: (config: Partial<AppConfig>): Promise<{ success: boolean; config?: AppConfig; error?: string }> =>
      ipcRenderer.invoke('update-config', config),
  },

  // App info
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('get-version'),
  },

  // Auto-update
  updates: {
    check: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('check-for-updates'),
    onDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('download-progress', (event, progress) => callback(progress));
    },
  },
});
