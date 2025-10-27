const { app, BrowserWindow, Notification, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0a0e14',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    titleBarStyle: 'hiddenInset',
    frame: true,
  });

  // Check if dist folder exists to determine if we're in dev or production
  const distPath = path.join(__dirname, '../dist/index.html');
  const isDev = !fs.existsSync(distPath);

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(distPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Export function for sending notifications (will be used later)
function sendNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

// ============================================
// BACKUP SYSTEM IPC HANDLERS
// ============================================

// Get backups directory path
const getBackupsDir = () => {
  const userDataPath = app.getPath('userData');
  const backupsDir = path.join(userDataPath, 'backups');

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  return backupsDir;
};

// Save auto-backup (Level 1)
ipcMain.handle('backup:save-auto', async (event, data) => {
  try {
    const backupsDir = getBackupsDir();
    const filePath = path.join(backupsDir, 'auto-backup.json');

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error saving auto-backup:', error);
    return { success: false, error: error.message };
  }
});

// Save timestamped snapshot (Level 2)
ipcMain.handle('backup:save-snapshot', async (event, data) => {
  try {
    const backupsDir = getBackupsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(backupsDir, `snapshot-${timestamp}.json`);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    return { success: true, path: filePath, timestamp };
  } catch (error) {
    console.error('Error saving snapshot:', error);
    return { success: false, error: error.message };
  }
});

// List all backup files
ipcMain.handle('backup:list', async () => {
  try {
    const backupsDir = getBackupsDir();
    const files = fs.readdirSync(backupsDir);

    const backups = files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(backupsDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    return { success: true, backups };
  } catch (error) {
    console.error('Error listing backups:', error);
    return { success: false, error: error.message, backups: [] };
  }
});

// Load backup file
ipcMain.handle('backup:load', async (event, fileName) => {
  try {
    const backupsDir = getBackupsDir();
    const filePath = path.join(backupsDir, fileName);

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Backup file not found' };
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);

    return { success: true, data: parsed };
  } catch (error) {
    console.error('Error loading backup:', error);
    return { success: false, error: error.message };
  }
});

// Export backup to custom location (Level 3)
ipcMain.handle('backup:export', async (event, data) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Backup',
      defaultPath: `productivity-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');

    return { success: true, path: result.filePath };
  } catch (error) {
    console.error('Error exporting backup:', error);
    return { success: false, error: error.message };
  }
});

// Import backup from custom location (Level 3)
ipcMain.handle('backup:import', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Backup',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);

    return { success: true, data: parsed, path: filePath };
  } catch (error) {
    console.error('Error importing backup:', error);
    return { success: false, error: error.message };
  }
});

// Delete backup file
ipcMain.handle('backup:delete', async (event, fileName) => {
  try {
    const backupsDir = getBackupsDir();
    const filePath = path.join(backupsDir, fileName);

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Backup file not found' };
    }

    fs.unlinkSync(filePath);

    return { success: true };
  } catch (error) {
    console.error('Error deleting backup:', error);
    return { success: false, error: error.message };
  }
});

module.exports = { sendNotification };
