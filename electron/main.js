const { app, BrowserWindow, Notification, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();

let mainWindow;
let mainWindowRef = null; // Reference for sending timer updates

// ============================================
// POMODORO TIMER STATE (Main Process)
// ============================================

// Load durations from store (provide defaults in minutes)
const initialWorkMinutes = store.get('pomodoroWorkDuration', 50);
const initialBreakMinutes = store.get('pomodoroBreakDuration', 10);

let timerInterval = null;
let timerState = {
  mode: 'idle', // 'work', 'break', 'idle'
  timeLeft: initialWorkMinutes * 60, // Initialize with loaded work duration in seconds
  isActive: false,
  workDuration: initialWorkMinutes * 60, // Convert minutes to seconds
  breakDuration: initialBreakMinutes * 60, // Convert minutes to seconds
};

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

  // Store window reference for timer updates
  mainWindowRef = mainWindow;

  mainWindow.on('closed', () => {
    mainWindow = null;
    mainWindowRef = null;
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
// POMODORO TIMER FUNCTIONS (Main Process)
// ============================================

// Send timer state update to renderer
function sendTimerUpdate() {
  if (mainWindowRef && mainWindowRef.webContents) {
    mainWindowRef.webContents.send('timer:update-state', timerState);
  }
}

// Start the timer
function startTimer() {
  // Clear any existing interval
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerState.isActive = true;
  sendTimerUpdate();

  // Start countdown interval
  timerInterval = setInterval(() => {
    timerState.timeLeft--;

    if (timerState.timeLeft <= 0) {
      // Timer reached zero - switch modes
      clearInterval(timerInterval);
      timerInterval = null;

      const finishedMode = timerState.mode;
      let nextMode;
      let nextDuration;
      let notificationTitle = '';
      let notificationBody = '';

      if (finishedMode === 'work') {
        // Work completed -> Break
        sendNotification('Work Complete!', 'Time for a break!');
        nextMode = 'break';
        nextDuration = timerState.breakDuration;
      } else if (finishedMode === 'break') {
        // Break completed -> Work
        sendNotification('Break Over!', 'Ready for the next session?');
        nextMode = 'work';
        nextDuration = timerState.workDuration;
      } else {
        // Idle -> Work (shouldn't happen during timer, but handle it)
        nextMode = 'work';
        nextDuration = timerState.workDuration;
      }

      // Update state for next session
      timerState.mode = nextMode;
      timerState.timeLeft = nextDuration;
      timerState.isActive = true; // Always true for auto-advance

      // Send update before starting next timer
      sendTimerUpdate();

      // Auto-start the next session
      startTimer();
    } else {
      // Continue countdown
      sendTimerUpdate();
    }
  }, 1000);
}

// Stop/pause the timer
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerState.isActive = false;
  sendTimerUpdate();
}

// Reset timer to idle
function resetTimer() {
  stopTimer();
  timerState.mode = 'idle';
  timerState.timeLeft = timerState.workDuration;
  sendTimerUpdate();
}

// Skip current session
function skipTimer() {
  stopTimer();

  // Determine next mode and send notification for skipped session
  let nextMode;
  let nextDuration;

  if (timerState.mode === 'work') {
    sendNotification('Work Complete!', 'Time for a break!');
    nextMode = 'break';
    nextDuration = timerState.breakDuration;
  } else if (timerState.mode === 'break') {
    sendNotification('Break Over!', 'Ready for the next session?');
    nextMode = 'work';
    nextDuration = timerState.workDuration;
  } else {
    nextMode = 'work';
    nextDuration = timerState.workDuration;
  }

  // Update state
  timerState.mode = nextMode;
  timerState.timeLeft = nextDuration;
  timerState.isActive = true; // Auto-advance after skip

  // Send update
  sendTimerUpdate();

  // Auto-start next session
  startTimer();
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
    const previousPath = path.join(backupsDir, 'auto-save-previous.json'); // Path for the older backup

    // Step 1: Check if the current auto-backup exists
    if (fs.existsSync(filePath)) {
      // Step 2: If 'auto-save-previous.json' already exists, delete it
      if (fs.existsSync(previousPath)) {
        fs.unlinkSync(previousPath);
      }
      // Step 3: Rename 'auto-backup.json' to 'auto-save-previous.json'
      fs.renameSync(filePath, previousPath);
    }

    // Step 4: Write the new 'auto-backup.json' file
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

    // --- Cleanup Logic: Keep only the 10 most recent snapshots ---
    // Get all snapshot files, sort them by name (newest first)
    const allSnapshots = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
      .sort() // Sorts alphabetically, which works for ISO timestamps (oldest to newest)
      .reverse(); // Reverse to get newest first

    // If we have more than 10, delete the oldest ones
    if (allSnapshots.length > 10) {
      const filesToDelete = allSnapshots.slice(10); // Get all files *after* the 10th one
      console.log(`[Backup] Cleaning up ${filesToDelete.length} old snapshots.`);
      for (const file of filesToDelete) {
        fs.unlinkSync(path.join(backupsDir, file));
      }
    }
    // --- End of Cleanup Logic ---

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

// ============================================
// FILE ATTACHMENT IPC HANDLERS
// ============================================

// Show open dialog for selecting files
ipcMain.handle('dialog:show-open-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select File to Attach',
      properties: ['openFile', 'multiSelections']
    });

    return result;
  } catch (error) {
    console.error('Error showing open dialog:', error);
    return { canceled: true, filePaths: [] };
  }
});

// Open file with system's default application
ipcMain.handle('shell:open-path', async (event, filePath) => {
  try {
    // shell.openPath returns a promise which resolves if successful
    // or rejects with an error message string if unsuccessful.
    const errorMessage = await shell.openPath(filePath);

    if (errorMessage) {
      // Although the promise resolved, shell indicates an issue opening the file.
      console.error(`Error opening path ${filePath}:`, errorMessage);
      return { success: false, error: errorMessage };
    } else {
      // Success: Promise resolved with no error message.
      return { success: true };
    }
  } catch (error) {
    // Catch if the promise itself rejects (e.g., path doesn't exist)
    console.error(`Failed to open path ${filePath}:`, error);
    // Ensure error is a string for consistency
    const errorMessageString = typeof error === 'string' ? error : (error.message || 'Unknown error');
    return { success: false, error: errorMessageString };
  }
});

// Show file in system's file explorer/finder
ipcMain.handle('shell:show-item-in-folder', async (event, filePath) => {
  try {
    // This function is synchronous and throws on error.
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    console.error(`Failed to show item in folder ${filePath}:`, error);
    return { success: false, error: error.message || 'Failed to show item in folder' };
  }
});

// ============================================
// POMODORO TIMER IPC HANDLERS
// ============================================

// Get initial timer state
ipcMain.handle('timer:get-initial-state', async () => {
  return timerState;
});

// Start timer
ipcMain.on('timer:start', () => {
  if (timerState.mode === 'idle') {
    // First time starting - switch to work mode
    timerState.mode = 'work';
    timerState.timeLeft = timerState.workDuration;
  }
  startTimer();
});

// Pause/stop timer
ipcMain.on('timer:pause', () => {
  stopTimer();
});

// Reset timer
ipcMain.on('timer:reset', () => {
  resetTimer();
});

// Skip current session
ipcMain.on('timer:skip', () => {
  skipTimer();
});

// Update settings from renderer (receives minutes, saves to store)
ipcMain.on('timer:update-settings-from-renderer', (event, { workMinutes, breakMinutes }) => {
  const workSecs = parseInt(workMinutes || 50) * 60;
  const breakSecs = parseInt(breakMinutes || 10) * 60;

  // Save to electron-store (in minutes for consistency)
  store.set('pomodoroWorkDuration', parseInt(workMinutes || 50));
  store.set('pomodoroBreakDuration', parseInt(breakMinutes || 10));

  // Update running state (in seconds)
  timerState.workDuration = workSecs;
  timerState.breakDuration = breakSecs;

  // If idle and not active, update timeLeft
  if (timerState.mode === 'idle' && !timerState.isActive) {
    timerState.timeLeft = timerState.workDuration;
  }

  sendTimerUpdate(); // Notify renderer
});

module.exports = { sendNotification };
