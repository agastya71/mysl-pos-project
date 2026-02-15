import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface AppConfig {
  apiUrl: string;
  terminalId: string;
  autoUpdate: boolean;
  updateCheckInterval: number;
  environment: string;
}

const DEFAULT_CONFIG: AppConfig = {
  apiUrl: 'http://localhost:3000/api/v1',
  terminalId: '',
  autoUpdate: true,
  updateCheckInterval: 3600000, // 1 hour
  environment: 'production'
};

/**
 * Get the path to the configuration file
 * In development: Uses public/config.json
 * In production: Uses config.json from app resources directory
 */
function getConfigPath(): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '../../public/config.json');
  } else {
    // In production, config.json is in the resources directory
    return path.join(process.resourcesPath, 'config.json');
  }
}

/**
 * Load configuration from file system
 * Falls back to default configuration if file doesn't exist or is invalid
 */
export function loadConfig(): AppConfig {
  const configPath = getConfigPath();

  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);

      // Merge with defaults to ensure all required fields exist
      return {
        ...DEFAULT_CONFIG,
        ...config
      };
    } else {
      console.warn(`Config file not found at ${configPath}, using defaults`);
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    console.error('Error loading config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to file system
 * Used when configuration is updated at runtime
 */
export function saveConfig(config: Partial<AppConfig>): boolean {
  const configPath = getConfigPath();

  try {
    // Load existing config
    const currentConfig = loadConfig();

    // Merge with new values
    const updatedConfig = {
      ...currentConfig,
      ...config
    };

    // Write to file
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');
    console.log('Configuration saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

/**
 * Validate API URL format
 */
export function validateApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Get the base API URL without the /api/v1 suffix
 * Used for displaying to users or constructing other URLs
 */
export function getBaseUrl(apiUrl: string): string {
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return apiUrl;
  }
}
