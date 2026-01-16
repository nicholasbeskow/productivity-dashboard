import { useState, useEffect } from 'react';
import { Settings, Bot, Sparkles, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { aiService } from '../../services/aiService';
import backupManager from '../../utils/backupManager';

// Component for managing recent completed tasks
const RecentCompletedTasks = ({ onUpdate }) => {
  const [completedTasks, setCompletedTasks] = useState([]);

  useEffect(() => {
    loadRecentTasks();
  }, []);

  const loadRecentTasks = () => {
    const stored = JSON.parse(localStorage.getItem('completedTasks') || '[]');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Filter to tasks completed in the last 7 days
    const recent = stored.filter(task => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return completedDate >= sevenDaysAgo;
    }).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    setCompletedTasks(recent);
  };

  const handleDateChange = (taskId, newDate) => {
    // Only process complete, valid dates (YYYY-MM-DD format)
    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return; // Ignore incomplete/invalid dates
    }

    const dateObj = new Date(newDate + 'T12:00:00');
    if (isNaN(dateObj.getTime())) {
      return; // Ignore invalid date values
    }

    // Update in localStorage
    const stored = JSON.parse(localStorage.getItem('completedTasks') || '[]');
    const updatedTasks = stored.map(task => {
      if (task.id === taskId) {
        // Create a date at noon local time to avoid timezone issues
        return { ...task, completedAt: dateObj.toISOString() };
      }
      return task;
    });
    localStorage.setItem('completedTasks', JSON.stringify(updatedTasks));

    // Update local state
    loadRecentTasks();

    // Notify parent
    if (onUpdate) onUpdate();
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format for input
  };

  const formatDisplayDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (completedTasks.length === 0) {
    return (
      <div className="text-center py-6 text-white/40">
        <Calendar size={32} className="mx-auto mb-2 opacity-50" />
        <p>No completed tasks in the past 7 days</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {completedTasks.map(task => (
        <div
          key={task.id}
          className="flex items-center justify-between gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium truncate">{task.title}</div>
            <div className="text-xs text-white/40">{formatDisplayDate(task.completedAt)}</div>
          </div>
          <div className="shrink-0">
            <input
              type="date"
              value={formatDate(task.completedAt)}
              onChange={(e) => handleDateChange(task.id, e.target.value)}
              className="bg-transparent border border-white/20 rounded px-2 py-1 text-sm text-white focus:border-green-glow/50 focus:outline-none"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const SettingsTab = () => {
  const [userName, setUserName] = useState('');
  const [breakStartDate, setBreakStartDate] = useState('');
  const [semesterStartDate, setSemesterStartDate] = useState('');
  const [semesterEndDate, setSemesterEndDate] = useState('');
  const [pomodoroWorkDuration, setPomodoroWorkDuration] = useState('');
  const [pomodoroBreakDuration, setPomodoroBreakDuration] = useState('');
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [backupMessage, setBackupMessage] = useState(null);
  const [importExportMode, setImportExportMode] = useState('export'); // 'import' or 'export'

  // Canvas Integration state
  const [canvasUrl, setCanvasUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Focus Mode (SelfControl) state
  const [focusEnabled, setFocusEnabled] = useState(false);
  const [blocklistPath, setBlocklistPath] = useState('');

  // AI Configuration State
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('llama-3.3-70b-versatile');
  const [aiStatus, setAiStatus] = useState('idle'); // idle, testing, success, error
  const [aiStatusMessage, setAiStatusMessage] = useState('');

  useEffect(() => {
    // Load data from localStorage on mount
    setUserName(localStorage.getItem('userName') || '');
    setBreakStartDate(localStorage.getItem('breakStartDate') || '');
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

    // Load AI Settings
    setAiApiKey(localStorage.getItem(STORAGE_KEYS.AI_API_KEY) || '');
    setAiModel(localStorage.getItem(STORAGE_KEYS.AI_MODEL) || 'llama-3.3-70b-versatile');
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


  const handleAiApiKeyChange = (e) => {
    const newKey = e.target.value;
    setAiApiKey(newKey);
    localStorage.setItem(STORAGE_KEYS.AI_API_KEY, newKey);
    setAiStatus('idle'); // Reset status on change
  };

  const handleAiModelChange = (e) => {
    const newModel = e.target.value;
    setAiModel(newModel);
    localStorage.setItem(STORAGE_KEYS.AI_MODEL, newModel);
  };

  const testAiConnection = async () => {
    if (!aiApiKey) {
      setAiStatus('error');
      setAiStatusMessage('Please enter an API Key first.');
      return;
    }

    setAiStatus('testing');
    const result = await aiService.validateApiKey(aiApiKey);

    if (result.success) {
      setAiStatus('success');
      setAiStatusMessage(result.message || 'Connected to Groq!');
      setTimeout(() => setAiStatus('idle'), 3000);
    } else {
      setAiStatus('error');
      setAiStatusMessage(result.error || 'Connection failed.');
    }
  };

  const handleUserNameChange = (e) => {
    const newName = e.target.value;
    setUserName(newName);
    localStorage.setItem('userName', newName);
    backupManager.saveAutoBackup();
    window.dispatchEvent(new Event('userNameChanged'));
  };

  const handleBreakStartDateChange = (e) => {
    const newDate = e.target.value;
    setBreakStartDate(newDate);
    if (newDate) {
      localStorage.setItem('breakStartDate', newDate);
    } else {
      localStorage.removeItem('breakStartDate');
    }
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

  const handleExportMood = async () => {
    if (!window.require) {
      showMessage('Export not available in web mode', 'error');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const moodLog = JSON.parse(localStorage.getItem('moodLog') || '[]');
      const journalLog = JSON.parse(localStorage.getItem('journalLog') || '[]');

      const moodData = {
        moodLog,
        journalLog,
        exportedAt: new Date().toISOString(),
        type: 'mood-export'
      };

      const result = await ipcRenderer.invoke('dialog:show-save-dialog', {
        title: 'Export Mood Data',
        defaultPath: `mood-data-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      });

      if (!result.canceled && result.filePath) {
        const fs = window.require('fs');
        fs.writeFileSync(result.filePath, JSON.stringify(moodData, null, 2));
        showMessage('Mood data exported successfully!', 'success');
      }
    } catch (error) {
      console.error('Export mood error:', error);
      showMessage(`Export failed: ${error.message}`, 'error');
    }
  };

  const handleExportSleep = async () => {
    if (!window.require) {
      showMessage('Export not available in web mode', 'error');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const sleepLog = JSON.parse(localStorage.getItem('sleepLog') || '[]');

      const sleepData = {
        sleepLog,
        exportedAt: new Date().toISOString(),
        type: 'sleep-export'
      };

      const result = await ipcRenderer.invoke('dialog:show-save-dialog', {
        title: 'Export Sleep Data',
        defaultPath: `sleep-data-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      });

      if (!result.canceled && result.filePath) {
        const fs = window.require('fs');
        fs.writeFileSync(result.filePath, JSON.stringify(sleepData, null, 2));
        showMessage('Sleep data exported successfully!', 'success');
      }
    } catch (error) {
      console.error('Export sleep error:', error);
      showMessage(`Export failed: ${error.message}`, 'error');
    }
  };

  const handleExportTasks = async () => {
    if (!window.require) {
      showMessage('Export not available in web mode', 'error');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
      const recurringTasks = JSON.parse(localStorage.getItem('recurringTasks') || '[]');

      const taskData = {
        tasks,
        completedTasks,
        recurringTasks,
        exportedAt: new Date().toISOString(),
        type: 'tasks-export'
      };

      const result = await ipcRenderer.invoke('dialog:show-save-dialog', {
        title: 'Export Tasks Data',
        defaultPath: `tasks-data-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      });

      if (!result.canceled && result.filePath) {
        const fs = window.require('fs');
        fs.writeFileSync(result.filePath, JSON.stringify(taskData, null, 2));
        showMessage('Tasks data exported successfully!', 'success');
      }
    } catch (error) {
      console.error('Export tasks error:', error);
      showMessage(`Export failed: ${error.message}`, 'error');
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

  const handleImportMood = async () => {
    if (!window.require) {
      showMessage('Import not available in web mode', 'error');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');

      const result = await ipcRenderer.invoke('dialog:show-open-dialog', {
        title: 'Import Mood Data',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const fs = window.require('fs');
        const fileContent = fs.readFileSync(result.filePaths[0], 'utf8');
        const importedData = JSON.parse(fileContent);

        if (importedData.type === 'mood-export' && importedData.moodLog) {
          const confirmed = window.confirm(
            'This will replace your current mood data. Continue?'
          );

          if (confirmed) {
            localStorage.setItem('moodLog', JSON.stringify(importedData.moodLog));
            if (importedData.journalLog) {
              localStorage.setItem('journalLog', JSON.stringify(importedData.journalLog));
            }
            backupManager.saveAutoBackup();
            window.dispatchEvent(new CustomEvent('moodDataUpdated'));
            window.dispatchEvent(new Event('storage'));
            showMessage('Mood data imported successfully!', 'success');
          }
        } else {
          showMessage('Invalid mood data file', 'error');
        }
      }
    } catch (error) {
      console.error('Import mood error:', error);
      showMessage(`Import failed: ${error.message}`, 'error');
    }
  };

  const handleImportSleep = async () => {
    if (!window.require) {
      showMessage('Import not available in web mode', 'error');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');

      const result = await ipcRenderer.invoke('dialog:show-open-dialog', {
        title: 'Import Sleep Data',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const fs = window.require('fs');
        const fileContent = fs.readFileSync(result.filePaths[0], 'utf8');
        const importedData = JSON.parse(fileContent);

        if (importedData.type === 'sleep-export' && importedData.sleepLog) {
          const confirmed = window.confirm(
            'This will replace your current sleep data. Continue?'
          );

          if (confirmed) {
            localStorage.setItem('sleepLog', JSON.stringify(importedData.sleepLog));
            backupManager.saveAutoBackup();
            window.dispatchEvent(new CustomEvent('sleepDataUpdated'));
            window.dispatchEvent(new Event('storage'));
            showMessage('Sleep data imported successfully!', 'success');
          }
        } else {
          showMessage('Invalid sleep data file', 'error');
        }
      }
    } catch (error) {
      console.error('Import sleep error:', error);
      showMessage(`Import failed: ${error.message}`, 'error');
    }
  };

  const handleImportTasks = async () => {
    if (!window.require) {
      showMessage('Import not available in web mode', 'error');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');

      const result = await ipcRenderer.invoke('dialog:show-open-dialog', {
        title: 'Import Tasks Data',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const fs = window.require('fs');
        const fileContent = fs.readFileSync(result.filePaths[0], 'utf8');
        const importedData = JSON.parse(fileContent);

        if (importedData.type === 'tasks-export' && importedData.tasks !== undefined) {
          const confirmed = window.confirm(
            'This will replace your current tasks data. Continue?'
          );

          if (confirmed) {
            localStorage.setItem('tasks', JSON.stringify(importedData.tasks));
            if (importedData.completedTasks) {
              localStorage.setItem('completedTasks', JSON.stringify(importedData.completedTasks));
            }
            if (importedData.recurringTasks) {
              localStorage.setItem('recurringTasks', JSON.stringify(importedData.recurringTasks));
            }
            backupManager.saveAutoBackup();
            window.dispatchEvent(new Event('statsReset'));
            window.dispatchEvent(new Event('storage'));
            showMessage('Tasks data imported successfully! Reloading...', 'success');
            setTimeout(() => window.location.reload(), 1500);
          }
        } else {
          showMessage('Invalid tasks data file', 'error');
        }
      }
    } catch (error) {
      console.error('Import tasks error:', error);
      showMessage(`Import failed: ${error.message}`, 'error');
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

  const handleDeleteAllTasks = () => {
    if (!window.require) return; // Basic safety check

    // Double confirmation
    if (window.confirm('⚠️ DANGER: Are you absolutely sure you want to DELETE ALL TASKS?\n\nThis will permanently wipe your entire task database. This action CANNOT be undone.')) {
      // Second confirmation
      const verification = window.prompt('To confirm, please type "DELETE" below:');
      if (verification === 'DELETE') {
        const { ipcRenderer } = window.require('electron');
        // We'll use the context function ideally, but since SettingsTab doesn't use TaskContext directly yet (or we need to add it),
        // let's dispatch a custom event that App.jsx or TaskContext listens to, OR better yet, import the service directly as a fallback
        // OR simply reload the window after clearing storage manually if needed.
        // Actually, let's use the event we set up in TaskContext: 'tasksDeleted'

        // Direct storage clear via service (since we imported aiService but not taskService directly, let's fix imports if needed or rely on event)
        // Wait, we can't accept inconsistent state. Let's rely on the dispatchEvent or specific tool.
        // The implementation plan said "Add to TaskContext", which we did. But SettingsTab.jsx wasn't updated to use `useTasks`.
        // Let's modify imports to include `useTasks`.
        localStorage.removeItem('tasks');
        localStorage.removeItem('completedTasks');
        localStorage.removeItem('recurringTasks');

        window.dispatchEvent(new Event('tasksDeleted'));
        window.dispatchEvent(new Event('statsReset'));

        showMessage('All tasks deleted successfully.', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert('Verification failed. Tasks were NOT deleted.');
      }
    }
  };

  return (
    <div className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
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
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <h3 className="text-lg font-semibold text-white mb-4">
              Personal Information
            </h3>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={handleUserNameChange}
                placeholder="Enter your name"
                className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white placeholder-white/30 focus:border-green-glow/50 focus:outline-none transition-colors"
              />
              <p className="text-xs text-white/40 mt-2">
                This will personalize your dashboard welcome message
              </p>
            </div>
          </div>


          {/* AI Configuration (Pinnacle AI) */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="text-purple-400" size={20} />
                Pinnacle AI (Beta)
              </h3>
              <div className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs border border-orange-500/30">
                Powered by Groq
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-white/70">
                    Groq API Keys
                  </label>
                  {aiApiKey && (
                    <span className="text-xs text-white/40">
                      {aiApiKey.split(/[\n,\s]+/).filter(k => k.startsWith('gsk_')).length} key(s)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    value={aiApiKey}
                    onChange={handleAiApiKeyChange}
                    placeholder="gsk_xxxxxxxxxxxx&#10;gsk_yyyyyyyyyyyy&#10;(one per line, comma, or space separated)"
                    rows={3}
                    spellCheck={false}
                    className="w-full liquid-bubble-filled rounded-lg px-4 py-3 pr-24 text-white placeholder-white/30 focus:border-orange-400/50 focus:outline-none transition-colors resize-none font-mono text-xs leading-relaxed"
                  />
                  <div className="absolute right-2 bottom-2">
                    <button
                      onClick={testAiConnection}
                      disabled={!aiApiKey || aiStatus === 'testing'}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${aiStatus === 'testing' ? 'bg-white/10 text-white/50 cursor-wait' :
                        aiStatus === 'success' ? 'bg-green-500/20 text-green-400' :
                          aiStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                            'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                        }`}
                    >
                      {aiStatus === 'testing' ? 'Validating...' :
                        aiStatus === 'success' ? 'Valid ✓' :
                          aiStatus === 'error' ? 'Failed ✗' :
                            'Validate'}
                    </button>
                  </div>
                </div>
                {aiStatus === 'error' && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <AlertCircle size={12} /> {aiStatusMessage}
                  </p>
                )}
                {aiStatus === 'success' && (
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {aiStatusMessage}
                  </p>
                )}
                <p className="text-xs text-white/40 mt-2">
                  Add multiple keys to auto-rotate when rate limits are hit. <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 underline">Get free keys →</a>
                </p>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  AI Model
                </label>
                <select
                  value={aiModel}
                  onChange={handleAiModelChange}
                  className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white bg-[#0a0e14] focus:border-orange-400/50 focus:outline-none"
                >
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Smart & Fast)</option>
                  <option value="llama-3.1-8b-instant">Llama 3.1 8B (Super Fast)</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B (High Context)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Semester Information */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <h3 className="text-lg font-semibold text-white mb-4">
              Semester Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Break Start Date <span className="text-white/40">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={breakStartDate}
                  onChange={handleBreakStartDateChange}
                  className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white focus:border-green-glow/50 focus:outline-none"
                />
                <p className="text-xs text-white/40 mt-1">
                  Track break progress before semester starts
                </p>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Semester Start Date
                </label>
                <input
                  type="date"
                  value={semesterStartDate}
                  onChange={handleStartDateChange}
                  className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white focus:border-green-glow/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Last Day of Classes
                </label>
                <input
                  type="date"
                  value={semesterEndDate}
                  onChange={handleEndDateChange}
                  className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white focus:border-green-glow/50 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-white/40 mt-3">
              This will show a circular progress indicator on your dashboard
            </p>
          </div>

          {/* Pomodoro Timer */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <h3 className="text-lg font-semibold text-white mb-4">
              Pomodoro Timer
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  value={pomodoroWorkDuration}
                  onChange={handleWorkDurationChange}
                  min="1"
                  max="120"
                  className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white focus:border-green-glow/50 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  value={pomodoroBreakDuration}
                  onChange={handleBreakDurationChange}
                  min="1"
                  max="60"
                  className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white focus:border-green-glow/50 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <p className="text-xs text-white/40 mt-4">
              Changes take effect immediately when you reset or start a new session
            </p>
          </div>

          {/* Focus Mode (SelfControl) */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <h3 className="text-lg font-semibold text-white mb-4">
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
                <span className="text-white/70">Enable Focus Mode</span>
              </label>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  SelfControl Blocklist File
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={blocklistPath}
                    readOnly
                    placeholder="No file selected"
                    className="flex-1 liquid-bubble-filled rounded-lg px-4 py-2 text-white placeholder-white/30"
                  />
                  <button
                    onClick={handleSelectBlocklist}
                    className="px-4 py-2 liquid-bubble-filled text-white rounded-lg hover:bg-white/10 transition-all"
                  >
                    Select File
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 text-sm">
                <p className="font-semibold mb-1">How to use:</p>
                <p>Open SelfControl, add your sites, go to File → Save Blocklist, and select that file here.</p>
              </div>

              <p className="text-xs text-white/40">
                When enabled, starting a Work session will automatically block distracting websites for the session duration.
              </p>
              <p className="text-xs text-white/40 mt-2">
                <strong>Note:</strong> Requires the{' '}
                <a
                  href="https://selfcontrolapp.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white/70"
                >
                  SelfControl app
                </a>{' '}
                installed in your Applications folder (macOS only).
              </p>
            </div>
          </div>

          {/* Recent Completed Tasks - Backdate Completion */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <h3 className="text-lg font-semibold text-white mb-4">
              Recent Completed Tasks
            </h3>
            <p className="text-sm text-white/50 mb-4">
              Change completion dates for tasks completed in the past 7 days
            </p>
            <RecentCompletedTasks onUpdate={() => {
              backupManager.saveAutoBackup();
              window.dispatchEvent(new Event('storage'));
            }} />
          </div>
          {/* Canvas Integration */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <h3 className="text-lg font-semibold text-white mb-4">
              Canvas Integration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Canvas URL
                </label>
                <input
                  type="text"
                  value={canvasUrl}
                  onChange={(e) => setCanvasUrl(e.target.value)}
                  placeholder="e.g., usf.instructure.com"
                  className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white placeholder-white/30 focus:border-green-glow/50 focus:outline-none transition-colors"
                />
                <p className="text-xs text-white/40 mt-2">
                  Enter your school's Canvas domain (without https://)
                </p>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Canvas API Token
                </label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Paste your token here"
                  className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white placeholder-white/30 focus:border-green-glow/50 focus:outline-none transition-colors"
                />
                <p className="text-xs text-white/40 mt-2">
                  Generate a token from your Canvas Profile → Settings → New Access Token
                </p>
              </div>

              <button
                onClick={handleSaveAndTest}
                disabled={!canvasUrl || !apiToken}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${canvasUrl && apiToken
                  ? 'bg-green-glow bg-opacity-20 text-green-glow hover:bg-opacity-30'
                  : 'liquid-bubble-filled text-white/40 cursor-not-allowed'
                  }`}
              >
                Save & Test Connection
              </button>

              {/* Connection Status Feedback */}
              {connectionStatus && (
                <div className={`p-3 rounded-lg ${connectionStatus.status === 'success' ? 'bg-green-glow/20 text-green-glow' :
                  connectionStatus.status === 'error' ? 'bg-red-500/20 text-red-500' :
                    'bg-blue-500/20 text-blue-500'
                  }`}>
                  {connectionStatus.message}
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <h3 className="text-lg font-semibold text-white mb-4">
              Reset Statistics
            </h3>
            <p className="text-sm text-white/70 mb-4">
              Permanently delete specific data categories. This cannot be undone.
            </p>
            <div className="space-y-3">
              {/* Reset Task Statistics */}
              <div className="flex items-center justify-between p-3 liquid-bubble-filled rounded-lg">
                <div>
                  <p className="text-white font-medium">Task Completion History</p>
                  <p className="text-xs text-white/50 mt-1">Delete all completed tasks data</p>
                </div>
                <button
                  onClick={() => {
                    const confirmed = window.confirm(
                      'Are you sure? This will permanently delete all task completion history. Active tasks will not be affected.'
                    );
                    if (confirmed) {
                      localStorage.removeItem('completedTasks');
                      backupManager.saveAutoBackup();
                      window.dispatchEvent(new Event('statsReset'));
                      window.dispatchEvent(new Event('storage'));
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex-shrink-0"
                >
                  Reset Tasks
                </button>
              </div>

              {/* Reset Mood Data */}
              <div className="flex items-center justify-between p-3 liquid-bubble-filled rounded-lg">
                <div>
                  <p className="text-white font-medium">Mood Log</p>
                  <p className="text-xs text-white/50 mt-1">Delete all mood entries and journal notes</p>
                </div>
                <button
                  onClick={() => {
                    const confirmed = window.confirm(
                      'Are you sure? This will permanently delete all mood log entries and journal notes.'
                    );
                    if (confirmed) {
                      localStorage.removeItem('moodLog');
                      localStorage.removeItem('journalLog');
                      backupManager.saveAutoBackup();
                      window.dispatchEvent(new CustomEvent('moodDataUpdated'));
                      window.dispatchEvent(new Event('storage'));
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex-shrink-0"
                >
                  Reset Mood
                </button>
              </div>

              {/* Reset Sleep Data */}
              <div className="flex items-center justify-between p-3 liquid-bubble-filled rounded-lg">
                <div>
                  <p className="text-white font-medium">Sleep Log</p>
                  <p className="text-xs text-white/50 mt-1">Delete all sleep tracking data</p>
                </div>
                <button
                  onClick={() => {
                    const confirmed = window.confirm(
                      'Are you sure? This will permanently delete all sleep log entries.'
                    );
                    if (confirmed) {
                      localStorage.removeItem('sleepLog');
                      backupManager.saveAutoBackup();
                      window.dispatchEvent(new CustomEvent('sleepDataUpdated'));
                      window.dispatchEvent(new Event('storage'));
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex-shrink-0"
                >
                  Reset Sleep
                </button>
              </div>
            </div>
          </div>

          {/* Backup & Recovery */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <h3 className="text-lg font-semibold text-white mb-4">
              Backup & Recovery
            </h3>

            {/* Message Display */}
            {backupMessage && (
              <div className={`mb-4 p-3 rounded-lg ${backupMessage.type === 'success' ? 'bg-green-glow/20 text-green-glow' :
                backupMessage.type === 'error' ? 'bg-red-500/20 text-red-500' :
                  'bg-blue-500/20 text-blue-500'
                }`}>
                {backupMessage.text}
              </div>
            )}

            <div className="space-y-6">
              {/* Automatic Protection Info */}
              <div>
                <p className="text-white/70 mb-2">
                  <strong className="text-white">Automatic Protection:</strong>
                </p>
                <ul className="text-white/70 text-sm space-y-1 ml-4">
                  <li>• Instant auto-save on every change</li>
                  <li>• Daily backup at midnight</li>
                  <li>• Backup on app launch</li>
                </ul>
                <p className="text-white/40 text-sm mt-3">
                  Backups stored in: {'{'}userData{'}'}/backups/
                </p>
              </div>

              {/* Export/Import Section with Toggle */}
              <div>
                {/* Mode Toggle */}
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-white font-semibold">Data Transfer</h4>
                  <div className="flex items-center gap-2 liquid-bubble-filled rounded-lg p-1">
                    <button
                      onClick={() => setImportExportMode('export')}
                      className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${importExportMode === 'export'
                        ? 'bg-green-glow text-bg-primary'
                        : 'text-white/70 hover:text-white'
                        }`}
                    >
                      Export
                    </button>
                    <button
                      onClick={() => setImportExportMode('import')}
                      className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${importExportMode === 'import'
                        ? 'bg-blue-500 text-white'
                        : 'text-white/70 hover:text-white'
                        }`}
                    >
                      Import
                    </button>
                  </div>
                </div>

                {/* Complete Backup/Restore */}
                <div className="mb-6">
                  <h5 className="text-white/80 text-sm font-medium mb-3">
                    {importExportMode === 'export' ? 'Complete Backup' : 'Complete Restore'}
                  </h5>
                  <button
                    onClick={importExportMode === 'export' ? handleExport : handleImport}
                    className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${importExportMode === 'export'
                      ? 'bg-green-glow bg-opacity-20 text-green-glow hover:bg-opacity-30'
                      : 'bg-blue-500 bg-opacity-20 text-blue-500 hover:bg-opacity-30'
                      }`}
                  >
                    {importExportMode === 'export' ? 'Export All Data' : 'Import All Data'}
                  </button>
                  <p className="text-xs text-white/40 mt-2">
                    {importExportMode === 'export'
                      ? 'Save a complete backup of all your data'
                      : 'Restore all data from a backup file'}
                  </p>
                </div>

                {/* By Category */}
                <div>
                  <h5 className="text-white/80 text-sm font-medium mb-3">By Category</h5>
                  {!window.require ? (
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-yellow-500 text-sm">
                        Category export/import requires the Electron desktop app.
                        <br />
                        Use "Complete Backup" above for web mode.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                          onClick={importExportMode === 'export' ? handleExportTasks : handleImportTasks}
                          className="px-4 py-3 liquid-bubble-filled text-white rounded-lg hover:bg-white/10 transition-all font-medium text-sm"
                        >
                          {importExportMode === 'export' ? '📤' : '📥'} Tasks
                        </button>

                        <button
                          onClick={importExportMode === 'export' ? handleExportMood : handleImportMood}
                          className="px-4 py-3 liquid-bubble-filled text-white rounded-lg hover:bg-white/10 transition-all font-medium text-sm"
                        >
                          {importExportMode === 'export' ? '📤' : '📥'} Mood
                        </button>

                        <button
                          onClick={importExportMode === 'export' ? handleExportSleep : handleImportSleep}
                          className="px-4 py-3 liquid-bubble-filled text-white rounded-lg hover:bg-white/10 transition-all font-medium text-sm"
                        >
                          {importExportMode === 'export' ? '📤' : '📥'} Sleep
                        </button>
                      </div>
                      <p className="text-xs text-white/40 mt-3">
                        {importExportMode === 'export'
                          ? 'Export individual data categories as JSON files'
                          : 'Import data from category-specific JSON files'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Restore from Backup Dropdown */}
              <div className="border-t border-white/10 pt-6">
                <label className="block text-white font-semibold mb-3">
                  Restore from Backup
                </label>

                {backups.length === 0 ? (
                  <p className="text-white/70 text-sm">No backups available yet.</p>
                ) : (
                  <>
                    <select
                      value={selectedBackup}
                      onChange={(e) => setSelectedBackup(e.target.value)}
                      className="w-full liquid-bubble-filled text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-green-glow/50"
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
                      className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${selectedBackup
                        ? 'bg-green-glow bg-opacity-20 text-green-glow hover:bg-opacity-30'
                        : 'liquid-bubble-filled text-white/40 cursor-not-allowed'
                        }`}
                    >
                      Restore Selected Backup
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* About */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <h3 className="text-lg font-semibold text-white mb-4">
              About
            </h3>
            <div className="space-y-2 text-sm text-white/70">
              <p><strong className="text-white">Version:</strong> 2.2.0</p>
              <p><strong className="text-white">Status:</strong> Building</p>
              <p className="text-white/40 pt-2">
                Built with React, Electron, and Tailwind CSS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
