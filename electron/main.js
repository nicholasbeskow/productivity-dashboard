const { app, BrowserWindow, Notification, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const axios = require('axios');
const Store = require('electron-store');
const { exec } = require('child_process');

app.setName('Pinnacle');

const store = new Store();

// Focus Mode settings
const initialFocusEnabled = store.get('focusModeEnabled', false);
const initialBlocklistPath = store.get('focusBlocklistPath', '');

let mainWindow;
let mainWindowRef = null; // Reference for sending timer updates
let isQuitting = false; // Flag to track explicit quitting

// ============================================
// POMODORO TIMER STATE (Main Process)
// ============================================

// Load durations from store (provide defaults in minutes)
const initialWorkMinutes = store.get('pomodoroWorkDuration', 50);
const initialBreakMinutes = store.get('pomodoroBreakDuration', 10);

let timerInterval = null;
let timerTargetEndTime = null; // Target timestamp when timer should end (ms)
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
    minWidth: 600,
    minHeight: 600,
    backgroundColor: '#0a0e14',
    icon: path.join(__dirname, '../resources/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    titleBarStyle: 'hiddenInset',
    frame: true,
  });

  // Use app.isPackaged to reliably detect production vs development
  // fs.existsSync doesn't work reliably with asar archives in packaged apps
  const isDev = !app.isPackaged;

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5555');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the dist folder bundled with the app
    const distPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(distPath);
  }

  // Store window reference for timer updates
  mainWindowRef = mainWindow;

  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    // When actually quitting, allow the window to close naturally
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    mainWindowRef = null;
  });
}

// Create macOS application menu with Cmd+Q support
function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // App Menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
  createWindow();

  // Set dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, '../resources/icon.png'));
  }
});

// Re-activate window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Must be registered at top level (outside whenReady) to catch quit events properly
app.on('before-quit', () => {
  isQuitting = true;
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

  // --- FOCUS MODE TRIGGER (Moved Here) ---
  // Trigger ONLY if we are in 'work' mode
  if (timerState.mode === 'work') {
    console.log(`[FocusMode] Starting Work Session (${timerState.timeLeft}s) - Checking triggers...`);
    // Use timeLeft so pauses/resumes are accurate
    triggerSelfControl(timerState.timeLeft);
  }
  // ---------------------------------------

  timerState.isActive = true;

  // Calculate target end time for drift-free timer
  // Store when the timer should end (current time + remaining seconds)
  timerTargetEndTime = Date.now() + (timerState.timeLeft * 1000);

  sendTimerUpdate();

  // Start countdown interval with drift compensation
  timerInterval = setInterval(() => {
    // Calculate actual time remaining using Date.now() comparison
    const now = Date.now();
    const msRemaining = timerTargetEndTime - now;
    const secondsRemaining = Math.ceil(msRemaining / 1000);

    // Update timeLeft based on actual time remaining (drift-free)
    timerState.timeLeft = Math.max(0, secondsRemaining);

    if (timerState.timeLeft <= 0) {
      // Timer reached zero - switch modes
      clearInterval(timerInterval);
      timerInterval = null;
      timerTargetEndTime = null;

      const finishedMode = timerState.mode;
      let nextMode;
      let nextDuration;

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
  // Clear target end time when stopping
  timerTargetEndTime = null;
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
// FOCUS MODE (SELFCONTROL) FUNCTIONS
// ============================================

function triggerSelfControl(durationSeconds) {
  const enabled = store.get('focusModeEnabled', false);
  const blocklistPath = store.get('focusBlocklistPath', '');
  const cliPath = '/Applications/SelfControl.app/Contents/MacOS/selfcontrol-cli';

  // 1. Validation checks
  if (!enabled) {
    return;
  }
  if (!blocklistPath || !fs.existsSync(blocklistPath)) {
    console.error('[FocusMode] Error: Blocklist file not found at', blocklistPath);
    return;
  }
  if (!fs.existsSync(cliPath)) {
    console.error('[FocusMode] Error: SelfControl app not found at', cliPath);
    return;
  }

  console.log('[FocusMode] Attempting to start...');

  // 2. Calculate End Date (Strict ISO 8601 format without milliseconds)
  // Example: "2023-11-22T15:30:00Z"
  const futureDate = new Date(Date.now() + durationSeconds * 1000);
  const endDate = futureDate.toISOString().split('.')[0] + "Z";

  // 3. Build Command
  const command = `"${cliPath}" start --blocklist "${blocklistPath}" --enddate "${endDate}"`;

  console.log('[FocusMode] Executing:', command);

  // 4. Execute
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`[FocusMode] Execution Error: ${error.message}`);
      return;
    }
    // SelfControl often outputs to stderr even on success, so we just log it
    if (stderr) {
      console.log(`[FocusMode] Output: ${stderr}`);
    }
    if (stdout) {
      console.log(`[FocusMode] Success: ${stdout}`);
    }
    sendNotification('Focus Mode Activated', 'Distracting sites are blocked.');
  });
}

// ============================================
// FOCUS MODE IPC HANDLERS
// ============================================

ipcMain.handle('settings:save-focus-config', async (event, { enabled, path }) => {
  store.set('focusModeEnabled', enabled);
  store.set('focusBlocklistPath', path);
  return { success: true };
});

ipcMain.handle('settings:get-focus-config', async () => {
  return {
    enabled: store.get('focusModeEnabled', false),
    path: store.get('focusBlocklistPath', '')
  };
});

// ============================================
// BACKUP SYSTEM IPC HANDLERS
// ============================================

// Get backups directory path (async)
const getBackupsDir = async () => {
  const userDataPath = app.getPath('userData');
  const backupsDir = path.join(userDataPath, 'backups');

  // Create backups directory if it doesn't exist
  try {
    await fsPromises.access(backupsDir);
  } catch {
    // Directory doesn't exist, create it
    await fsPromises.mkdir(backupsDir, { recursive: true });
  }

  return backupsDir;
};

// Save auto-backup (Level 1)
ipcMain.handle('backup:save-auto', async (event, data) => {
  try {
    const backupsDir = await getBackupsDir();
    const filePath = path.join(backupsDir, 'auto-backup.json');
    const previousPath = path.join(backupsDir, 'auto-save-previous.json'); // Path for the older backup

    // Step 1: Check if the current auto-backup exists
    try {
      await fsPromises.access(filePath);
      // File exists, proceed with rotation

      // Step 2: If 'auto-save-previous.json' already exists, delete it
      try {
        await fsPromises.access(previousPath);
        await fsPromises.unlink(previousPath);
      } catch {
        // Previous file doesn't exist, no need to delete
      }

      // Step 3: Rename 'auto-backup.json' to 'auto-save-previous.json'
      await fsPromises.rename(filePath, previousPath);
    } catch {
      // Current auto-backup doesn't exist, skip rotation
    }

    // Step 4: Write the new 'auto-backup.json' file
    await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error saving auto-backup:', error);
    return { success: false, error: error.message };
  }
});

// Save timestamped snapshot (Level 2)
ipcMain.handle('backup:save-snapshot', async (event, data) => {
  try {
    const backupsDir = await getBackupsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(backupsDir, `snapshot-${timestamp}.json`);

    await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    // --- Cleanup Logic: Keep only the 10 most recent snapshots ---
    // Get all snapshot files, sort them by name (newest first)
    const allFiles = await fsPromises.readdir(backupsDir);
    const allSnapshots = allFiles
      .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
      .sort() // Sorts alphabetically, which works for ISO timestamps (oldest to newest)
      .reverse(); // Reverse to get newest first

    // If we have more than 10, delete the oldest ones
    if (allSnapshots.length > 10) {
      const filesToDelete = allSnapshots.slice(10); // Get all files *after* the 10th one
      console.log(`[Backup] Cleaning up ${filesToDelete.length} old snapshots.`);
      for (const file of filesToDelete) {
        try {
          await fsPromises.unlink(path.join(backupsDir, file));
        } catch (error) {
          // Ignore ENOENT errors (file already deleted)
          if (error.code !== 'ENOENT') {
            console.error(`[Backup] Failed to delete snapshot ${file}:`, error.message);
            // Don't throw - continue with other deletions
          }
        }
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
    const backupsDir = await getBackupsDir();
    const files = await fsPromises.readdir(backupsDir);

    const backupsPromises = files
      .filter(f => f.endsWith('.json'))
      .map(async (f) => {
        const filePath = path.join(backupsDir, f);
        const stats = await fsPromises.stat(filePath);
        return {
          name: f,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      });

    const backups = (await Promise.all(backupsPromises))
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
    const backupsDir = await getBackupsDir();
    const filePath = path.join(backupsDir, fileName);

    // Check if file exists
    try {
      await fsPromises.access(filePath);
    } catch {
      return { success: false, error: 'Backup file not found' };
    }

    const data = await fsPromises.readFile(filePath, 'utf8');
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

    await fsPromises.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8');

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
    const data = await fsPromises.readFile(filePath, 'utf8');
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
    const backupsDir = await getBackupsDir();
    const filePath = path.join(backupsDir, fileName);

    // Check if file exists
    try {
      await fsPromises.access(filePath);
    } catch {
      return { success: false, error: 'Backup file not found' };
    }

    await fsPromises.unlink(filePath);

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
ipcMain.handle('dialog:show-open-dialog', async (event, options = {}) => {
  try {
    const dialogOptions = {
      title: options.title || 'Select File to Attach',
      properties: options.properties || ['openFile', 'multiSelections'],
      filters: options.filters || undefined
    };

    const result = await dialog.showOpenDialog(mainWindow, dialogOptions);

    return result;
  } catch (error) {
    console.error('Error showing open dialog:', error);
    return { canceled: true, filePaths: [] };
  }
});

// Show save dialog for exporting files
ipcMain.handle('dialog:show-save-dialog', async (event, options = {}) => {
  try {
    const dialogOptions = {
      title: options.title || 'Save File',
      defaultPath: options.defaultPath || undefined,
      filters: options.filters || undefined
    };

    const result = await dialog.showSaveDialog(mainWindow, dialogOptions);

    return result;
  } catch (error) {
    console.error('Error showing save dialog:', error);
    return { canceled: true, filePath: null };
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

// ============================================
// CANVAS INTEGRATION IPC HANDLERS
// ============================================

// Save Canvas credentials securely
ipcMain.handle('canvas:save-credentials', async (event, { canvasUrl, apiToken }) => {
  try {
    store.set('canvasUrl', canvasUrl);
    store.set('canvasApiToken', apiToken);
    return { success: true };
  } catch (error) {
    console.error('Error saving Canvas credentials:', error);
    return { success: false, error: error.message };
  }
});

// Load Canvas credentials
ipcMain.handle('canvas:load-credentials', async () => {
  try {
    const canvasUrl = store.get('canvasUrl');
    const apiToken = store.get('canvasApiToken');
    return { canvasUrl, apiToken };
  } catch (error) {
    console.error('Error loading Canvas credentials:', error);
    return { canvasUrl: null, apiToken: null };
  }
});

// Test Canvas connection
ipcMain.handle('canvas:test-connection', async (event, { canvasUrl, apiToken }) => {
  try {
    const url = `https://${canvasUrl}/api/v1/users/self`;
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });

    if (response.data && response.data.name) {
      return { success: true, name: response.data.name };
    } else {
      return { success: false, error: 'Invalid response from Canvas API' };
    }
  } catch (error) {
    console.error('Error testing Canvas connection:', error);
    return { success: false, error: error.message };
  }
});

// Fetch Canvas assignments
ipcMain.handle('canvas:fetch-assignments', async () => {
  try {
    // Retrieve credentials from electron-store
    const canvasUrl = store.get('canvasUrl');
    const apiToken = store.get('canvasApiToken');

    // Check if credentials are set
    if (!canvasUrl || !apiToken) {
      return { success: false, error: 'Canvas credentials not set. Please configure them in Settings.' };
    }

    // Fetch upcoming assignments from Canvas API
    const url = `https://${canvasUrl}/api/v1/users/self/upcoming_events?per_page=50`;
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });

    // Filter only assignment events and format the data
    const assignments = response.data
      .filter(event => event.type === 'assignment')
      .map(event => ({
        id: event.assignment.id,
        name: event.assignment.name,
        due_at: event.assignment.due_at,
        html_url: event.html_url,
        course_id: event.course_id,
        context_name: event.context_name, // Course name
        description: event.assignment.description || '',
      }));

    return { success: true, assignments };
  } catch (error) {
    console.error('Error fetching Canvas assignments:', error);
    return { success: false, error: error.message };
  }
});

// Get electron-store data for backup
ipcMain.handle('backup:get-electron-store-data', async () => {
  try {
    const canvasUrl = store.get('canvasUrl');
    const apiToken = store.get('canvasApiToken');
    const focusModeEnabled = store.get('focusModeEnabled', false);
    const focusBlocklistPath = store.get('focusBlocklistPath', '');
    return { success: true, data: { canvasUrl, apiToken, focusModeEnabled, focusBlocklistPath } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Restore electron-store data from backup
ipcMain.handle('backup:restore-electron-store-data', async (event, data) => {
  try {
    if (data.canvasUrl) {
      store.set('canvasUrl', data.canvasUrl);
    }
    if (data.apiToken) {
      store.set('canvasApiToken', data.apiToken);
    }
    if (data.focusModeEnabled !== undefined) {
      store.set('focusModeEnabled', data.focusModeEnabled);
    }
    if (data.focusBlocklistPath !== undefined) {
      store.set('focusBlocklistPath', data.focusBlocklistPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

module.exports = { sendNotification };
