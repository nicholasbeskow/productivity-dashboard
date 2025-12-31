import { Settings, Lock, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import backupManager from '../../utils/backupManager';

const SettingsTab = () => {
  const [userName, setUserName] = useState('');
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartDate, setBreakStartDate] = useState('');
  const [semesterStartDate, setSemesterStartDate] = useState('');
  const [semesterEndDate, setSemesterEndDate] = useState('');
  const [pomodoroWorkDuration, setPomodoroWorkDuration] = useState('');
  const [pomodoroBreakDuration, setPomodoroBreakDuration] = useState('');
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [backupMessage, setBackupMessage] = useState(null);

  // Canvas Integration state
  const [canvasUrl, setCanvasUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Focus Mode (SelfControl) state
  const [focusEnabled, setFocusEnabled] = useState(false);
  const [blocklistPath, setBlocklistPath] = useState('');

  useEffect(() => {
    // Load data from localStorage on mount
    setUserName(localStorage.getItem('userName') || '');
    const storedBreakStartDate = localStorage.getItem('breakStartDate') || '';
    setBreakStartDate(storedBreakStartDate);
    setIsOnBreak(!!storedBreakStartDate); // Set toggle based on whether breakStartDate exists
    setSemesterStartDate(localStorage.getItem('semesterStartDate') || '2025-08-25');
    setSemesterEndDate(localStorage.getItem('semesterEndDate') || '2025-12-11');
    setPomodoroWorkDuration(localStorage.getItem('pomodoroWorkDuration') || '50');
    setPomodoroBreakDuration(localStorage.getItem('pomodoroBreakDuration') || '10');

    // Load backup list
    loadBackupList();

    // Load Canvas credentials
    loadCanvasCredentials();

    // Load Focus Mode settings
    loadFocusConfig();
  }, []);

  const loadBackupList = async () => {
    const result = await backupManager.listBackups();
    if (result.success && result.backups) {
      setBackups(result.backups);
    }
  };

  const showMessage = (message, type = 'success') => {
    setBackupMessage({ text: message, type });
    setTimeout(() => setBackupMessage(null), 3000);
  };

  const handleUserNameChange = (e) => {
    const newName = e.target.value;
    setUserName(newName);
    localStorage.setItem('userName', newName);
    backupManager.saveAutoBackup();
    window.dispatchEvent(new Event('userNameChanged'));
  };

  const handleOnBreakToggle = (e) => {
    const checked = e.target.checked;
    setIsOnBreak(checked);

    if (!checked) {
      // Clear break start date when toggle is turned off
      setBreakStartDate('');
      localStorage.removeItem('breakStartDate');
      backupManager.saveAutoBackup();
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('semesterDatesChanged'));
    }
  };

  const handleBreakStartDateChange = (e) => {
    const newDate = e.target.value;
    setBreakStartDate(newDate);
    localStorage.setItem('breakStartDate', newDate);
    backupManager.saveAutoBackup();
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('semesterDatesChanged'));
  };

  const handleStartDateChange = (e) => {
    const newDate = e.target.value;
    setSemesterStartDate(newDate);
    localStorage.setItem('semesterStartDate', newDate);
    backupManager.saveAutoBackup();
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('semesterDatesChanged'));
  };

  const handleEndDateChange = (e) => {
    const newDate = e.target.value;
    setSemesterEndDate(newDate);
    localStorage.setItem('semesterEndDate', newDate);
    backupManager.saveAutoBackup();
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('semesterDatesChanged'));
  };

  const handleWorkDurationChange = (e) => {
    const newDuration = e.target.value;
    setPomodoroWorkDuration(newDuration);
    localStorage.setItem('pomodoroWorkDuration', newDuration);
    backupManager.saveAutoBackup();

    // Send update to main process via IPC
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('timer:update-settings-from-renderer', {
          workMinutes: parseInt(newDuration),
          breakMinutes: parseInt(pomodoroBreakDuration)
        });
      } catch (error) {
        console.error('Error sending timer settings to main process:', error);
      }
    }
  };

  const handleBreakDurationChange = (e) => {
    const newDuration = e.target.value;
    setPomodoroBreakDuration(newDuration);
    localStorage.setItem('pomodoroBreakDuration', newDuration);
    backupManager.saveAutoBackup();

    // Send update to main process via IPC
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('timer:update-settings-from-renderer', {
          workMinutes: parseInt(pomodoroWorkDuration),
          breakMinutes: parseInt(newDuration)
        });
      } catch (error) {
        console.error('Error sending timer settings to main process:', error);
      }
    }
  };

  const handleExport = async () => {
    const result = await backupManager.exportBackup();
    if (result.success && !result.canceled) {
      showMessage('Backup exported successfully!', 'success');
    } else if (!result.canceled) {
      showMessage(`Export failed: ${result.error}`, 'error');
    }
  };

  const handleImport = async () => {
    const result = await backupManager.importBackup();
    if (result.success && !result.canceled) {
      const restored = backupManager.restoreAllData(result.data);
      if (restored) {
        showMessage('Backup imported successfully! Reloading...', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showMessage('Failed to restore backup data', 'error');
      }
    } else if (!result.canceled) {
      showMessage(`Import failed: ${result.error}`, 'error');
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    const confirmed = window.confirm(
      `Are you sure you want to restore from "${selectedBackup}"? This will replace all current data.`
    );

    if (!confirmed) return;

    const result = await backupManager.loadBackup(selectedBackup);
    if (result.success) {
      const restored = backupManager.restoreAllData(result.data);
      if (restored) {
        showMessage('Backup restored successfully! Reloading...', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showMessage('Failed to restore backup data', 'error');
      }
    } else {
      showMessage(`Restore failed: ${result.error}`, 'error');
    }
  };

  // Canvas Integration Handlers
  const loadCanvasCredentials = async () => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const { canvasUrl: savedUrl, apiToken: savedToken } = await ipcRenderer.invoke('canvas:load-credentials');
        if (savedUrl) setCanvasUrl(savedUrl);
        if (savedToken) setApiToken(savedToken);
      } catch (error) {
        console.error('Error loading Canvas credentials:', error);
      }
    }
  };

  // Focus Mode (SelfControl) Handlers
  const loadFocusConfig = async () => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const { enabled, path } = await ipcRenderer.invoke('settings:get-focus-config');
        setFocusEnabled(enabled);
        setBlocklistPath(path || '');
      } catch (error) {
        console.error('Error loading Focus Mode config:', error);
      }
    }
  };

  const saveFocusConfig = async (enabled, path) => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('settings:save-focus-config', { enabled, path });
        backupManager.saveAutoBackup();
      } catch (error) {
        console.error('Error saving Focus Mode config:', error);
      }
    }
  };

  const handleFocusToggle = (e) => {
    const enabled = e.target.checked;
    setFocusEnabled(enabled);
    saveFocusConfig(enabled, blocklistPath);
  };

  const handleSelectBlocklist = async () => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('dialog:show-open-dialog', {
          title: 'Select SelfControl Blocklist',
          properties: ['openFile'],
          filters: [{ name: 'SelfControl Blocklist', extensions: ['selfcontrol'] }]
        });
        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
          const path = result.filePaths[0];
          setBlocklistPath(path);
          saveFocusConfig(focusEnabled, path);
        }
      } catch (error) {
        console.error('Error selecting blocklist file:', error);
      }
    }
  };

  const handleSaveAndTest = async () => {
    if (!window.require) {
      setConnectionStatus({ status: 'error', message: 'Electron not available' });
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');

      // Set loading state
      setConnectionStatus({ status: 'loading', message: 'Testing connection...' });

      // Save credentials
      await ipcRenderer.invoke('canvas:save-credentials', { canvasUrl, apiToken });

      // Test connection
      const result = await ipcRenderer.invoke('canvas:test-connection', { canvasUrl, apiToken });

      if (result.success) {
        setConnectionStatus({ status: 'success', message: `Connected as ${result.name}!` });
      } else {
        setConnectionStatus({ status: 'error', message: `Connection failed: ${result.error}` });
      }
    } catch (error) {
      console.error('Error saving/testing Canvas credentials:', error);
      setConnectionStatus({ status: 'error', message: `Error: ${error.message}` });
    }
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <Settings className="text-green-glow" size={32} />
            Settings
          </h2>
          <p className="text-text-secondary">
            Configure your dashboard preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Personal Information
            </h3>
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={handleUserNameChange}
                placeholder="Enter your name"
                className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
              />
              <p className="text-xs text-text-tertiary mt-2">
                This will personalize your dashboard welcome message
              </p>
            </div>
          </div>

          {/* Canvas Integration */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Lock size={20} className="text-green-glow" />
              Canvas Integration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Canvas URL
                </label>
                <input
                  type="text"
                  value={canvasUrl}
                  onChange={(e) => setCanvasUrl(e.target.value)}
                  placeholder="e.g., usf.instructure.com"
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
                />
                <p className="text-xs text-text-tertiary mt-2">
                  Enter your school's Canvas domain (without https://)
                </p>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Canvas API Token
                </label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Paste your token here"
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
                />
                <p className="text-xs text-text-tertiary mt-2">
                  Generate a token from your Canvas Profile → Settings → New Access Token
                </p>
              </div>

              <button
                onClick={handleSaveAndTest}
                disabled={!canvasUrl || !apiToken}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                  canvasUrl && apiToken
                    ? 'bg-green-glow bg-opacity-20 text-green-glow hover:bg-opacity-30'
                    : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                }`}
              >
                Save & Test Connection
              </button>

              {/* Connection Status Feedback */}
              {connectionStatus && (
                <div className={`p-3 rounded-lg ${
                  connectionStatus.status === 'success' ? 'bg-green-glow/20 text-green-glow' :
                  connectionStatus.status === 'error' ? 'bg-red-500/20 text-red-500' :
                  'bg-blue-500/20 text-blue-500'
                }`}>
                  {connectionStatus.message}
                </div>
              )}
            </div>
          </div>

          {/* Timer Settings */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Pomodoro Timer
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  value={pomodoroWorkDuration}
                  onChange={handleWorkDurationChange}
                  min="1"
                  max="120"
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  value={pomodoroBreakDuration}
                  onChange={handleBreakDurationChange}
                  min="1"
                  max="60"
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
                />
              </div>
            </div>
            <p className="text-xs text-text-tertiary mt-4">
              Changes take effect immediately when you reset or start a new session
            </p>
          </div>

          {/* Focus Mode (SelfControl) */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Shield size={20} className="text-green-glow" />
              Focus Mode (SelfControl)
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={focusEnabled}
                  onChange={handleFocusToggle}
                  className="w-5 h-5 rounded border-bg-primary bg-bg-tertiary accent-green-glow"
                />
                <span className="text-text-secondary">Enable Focus Mode</span>
              </label>

              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  SelfControl Blocklist File
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={blocklistPath}
                    readOnly
                    placeholder="No file selected"
                    className="flex-1 bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary"
                  />
                  <button
                    onClick={handleSelectBlocklist}
                    className="px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-opacity-80 transition-all border border-bg-primary"
                  >
                    Select File
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 text-sm">
                <p className="font-semibold mb-1">How to use:</p>
                <p>Open SelfControl, add your sites, go to File → Save Blocklist, and select that file here.</p>
              </div>

              <p className="text-xs text-text-tertiary">
                When enabled, starting a Work session will automatically block distracting websites for the session duration.
              </p>
              <p className="text-xs text-text-tertiary mt-2">
                <strong>Note:</strong> Requires the{' '}
                <a
                  href="https://selfcontrolapp.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-text-secondary"
                >
                  SelfControl app
                </a>{' '}
                installed in your Applications folder (macOS only).
              </p>
            </div>
          </div>

          {/* Notifications Placeholder */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Notifications
            </h3>
            <div className="space-y-3">
              {[
                'Timer completed',
                'Break ended',
                'Task due in 6 hours'
              ].map((label) => (
                <label key={label} className="flex items-center gap-3 cursor-not-allowed opacity-50">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="w-5 h-5 rounded border-bg-primary bg-bg-tertiary"
                  />
                  <span className="text-text-secondary">{label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-text-tertiary mt-4">
              Notification preferences will be enabled in Week 4
            </p>
          </div>

          {/* Semester Settings */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Semester Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Semester Start Date
                </label>
                <input
                  type="date"
                  value={semesterStartDate}
                  onChange={handleStartDateChange}
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Last Day of Classes
                </label>
                <input
                  type="date"
                  value={semesterEndDate}
                  onChange={handleEndDateChange}
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                />
              </div>
            </div>

            {/* On Break Toggle */}
            <div className="mt-4 pt-4 border-t border-bg-tertiary">
              <div className="flex items-center gap-3">
                {/* Custom Toggle Switch */}
                <button
                  type="button"
                  onClick={() => handleOnBreakToggle({ target: { checked: !isOnBreak } })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isOnBreak ? 'bg-green-glow' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isOnBreak ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <label className="text-text-secondary font-medium cursor-pointer" onClick={() => handleOnBreakToggle({ target: { checked: !isOnBreak } })}>
                  On break?
                </label>
              </div>
              <p className="text-xs text-text-tertiary mt-2 ml-14">
                Track your break progress before the semester starts
              </p>

              {/* Collapsible Break Start Date Input */}
              {isOnBreak && (
                <div className="mt-3 ml-14">
                  <label className="block text-sm text-text-secondary mb-2">
                    Break Start Date
                  </label>
                  <input
                    type="date"
                    value={breakStartDate}
                    onChange={handleBreakStartDateChange}
                    className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                  />
                </div>
              )}
            </div>

            <p className="text-xs text-text-tertiary mt-3">
              This will show a circular progress indicator on your dashboard
            </p>
          </div>

          {/* Statistics Settings */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Statistics
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-text-secondary mb-3">
                  Permanently delete all task completion history
                </p>
                <button
                  onClick={() => {
                    const confirmed = window.confirm(
                      'Are you sure? This will permanently delete all completion history. Active tasks will not be affected.'
                    );
                    if (confirmed) {
                      localStorage.removeItem('completedTasks');
                      backupManager.saveAutoBackup();
                      window.dispatchEvent(new Event('statsReset'));
                      window.dispatchEvent(new Event('storage'));
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200"
                >
                  Reset All Statistics
                </button>
                <p className="text-xs text-text-tertiary mt-2">
                  This cannot be undone
                </p>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              About
            </h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p><strong className="text-text-primary">Version:</strong> 1.5.0</p>
              <p><strong className="text-text-primary">Status:</strong> Phase 2: Stats & Backup</p>
              <p className="text-text-tertiary pt-2">
                Built with React, Electron, and Tailwind CSS
              </p>
            </div>
          </div>

          {/* Backup & Recovery (MOVED TO BOTTOM) */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              💾 Backup & Recovery
            </h3>

            {/* Message Display */}
            {backupMessage && (
              <div className={`mb-4 p-3 rounded-lg ${
                backupMessage.type === 'success' ? 'bg-green-glow/20 text-green-glow' :
                backupMessage.type === 'error' ? 'bg-red-500/20 text-red-500' :
                'bg-blue-500/20 text-blue-500'
              }`}>
                {backupMessage.text}
              </div>
            )}

            <div className="space-y-6">
              {/* Automatic Protection Info */}
              <div>
                <p className="text-text-secondary mb-2">
                  <strong className="text-text-primary">🛡️ Automatic Protection:</strong>
                </p>
                <ul className="text-text-secondary text-sm space-y-1 ml-4">
                  <li>• Instant auto-save on every change</li>
                  <li>• Daily backup at midnight</li>
                  <li>• Backup on app launch</li>
                </ul>
                <p className="text-text-tertiary text-sm mt-3">
                  📁 Backups stored in: {'{'}userData{'}'}/backups/
                </p>
              </div>

              {/* Export/Import Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExport}
                  className="px-6 py-3 bg-green-glow bg-opacity-20 text-green-glow rounded-lg hover:bg-opacity-30 transition-all font-semibold"
                >
                  📥 Export Data
                </button>

                <button
                  onClick={handleImport}
                  className="px-6 py-3 bg-bg-tertiary text-text-primary rounded-lg hover:bg-opacity-80 transition-all font-semibold border border-bg-primary"
                >
                  📤 Import Data
                </button>
              </div>

              {/* Restore from Backup Dropdown */}
              <div className="border-t border-bg-tertiary pt-6">
                <label className="block text-text-primary font-semibold mb-3">
                  🕐 Restore from Backup
                </label>

                {backups.length === 0 ? (
                  <p className="text-text-secondary text-sm">No backups available yet.</p>
                ) : (
                  <>
                    <select
                      value={selectedBackup}
                      onChange={(e) => setSelectedBackup(e.target.value)}
                      className="w-full bg-bg-tertiary text-text-primary border border-bg-tertiary rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-green-glow"
                    >
                      <option value="">Select a backup to restore...</option>
                      {backups.map((backup) => (
                        <option key={backup.name} value={backup.name}>
                          {backupManager.formatDate(backup.modified)} - {backupManager.formatFileSize(backup.size)}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleRestoreBackup}
                      disabled={!selectedBackup}
                      className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                        selectedBackup
                          ? 'bg-green-glow bg-opacity-20 text-green-glow hover:bg-opacity-30'
                          : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                      }`}
                    >
                      Restore Selected Backup
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
