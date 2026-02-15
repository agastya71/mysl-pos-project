export interface AppConfig {
  apiUrl: string;
  terminalId: string;
  autoUpdate: boolean;
  updateCheckInterval: number;
  environment: string;
}

export interface ElectronAPI {
  platform: string;
  config: {
    get: () => Promise<AppConfig>;
    update: (config: Partial<AppConfig>) => Promise<{
      success: boolean;
      config?: AppConfig;
      error?: string;
    }>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
  updates: {
    check: () => Promise<{ success: boolean; error?: string }>;
    onDownloadProgress: (callback: (progress: any) => void) => void;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}
