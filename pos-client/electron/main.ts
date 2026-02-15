import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import { loadConfig, saveConfig, AppConfig, validateApiUrl } from './config-loader';

let mainWindow: BrowserWindow | null = null;
let appConfig: AppConfig;

/**
 * Configure auto-updater
 */
function setupAutoUpdater() {
  // Don't check for updates in development
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  // Disable auto-download to allow user confirmation
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Log updater events
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);

    if (appConfig.autoUpdate) {
      // Show dialog to user
      dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. Would you like to download it now?`,
        buttons: ['Yes', 'Later'],
        defaultId: 0
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Download progress: ${progressObj.percent}%`);
    // Send progress to renderer
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);

    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded. The application will restart to install the update.`,
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // Check for updates on startup
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000); // Wait 3 seconds after app start

  // Set up periodic update checks
  if (appConfig.autoUpdate && appConfig.updateCheckInterval > 0) {
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, appConfig.updateCheckInterval);
  }
}

/**
 * Set up IPC handlers for config management
 */
function setupIpcHandlers() {
  // Get current configuration
  ipcMain.handle('get-config', () => {
    return appConfig;
  });

  // Update configuration
  ipcMain.handle('update-config', async (event, newConfig: Partial<AppConfig>) => {
    // Validate API URL if provided
    if (newConfig.apiUrl && !validateApiUrl(newConfig.apiUrl)) {
      return {
        success: false,
        error: 'Invalid API URL format'
      };
    }

    // Save configuration
    const success = saveConfig(newConfig);

    if (success) {
      // Reload configuration
      appConfig = loadConfig();
      return {
        success: true,
        config: appConfig
      };
    } else {
      return {
        success: false,
        error: 'Failed to save configuration'
      };
    }
  });

  // Get app version
  ipcMain.handle('get-version', () => {
    return app.getVersion();
  });

  // Manually check for updates
  ipcMain.handle('check-for-updates', () => {
    if (process.env.NODE_ENV === 'development') {
      return {
        success: false,
        error: 'Updates not available in development mode'
      };
    }

    autoUpdater.checkForUpdates();
    return { success: true };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // Load configuration
  appConfig = loadConfig();
  console.log('Loaded configuration:', appConfig);

  // Set up IPC handlers
  setupIpcHandlers();

  // Create window
  createWindow();

  // Set up auto-updater
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
