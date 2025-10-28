import { Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import backupManager from '../../utils/backupManager';

const SettingsTab = () => {
  const [userName, setUserName] = useState('');
  const [semesterStartDate, setSemesterStartDate] = useState('');
  const [semesterEndDate, setSemesterEndDate] = useState('');
  const [pomodoroWorkDuration, setPomodoroWorkDuration] = useState('');
  const [pomodoroBreakDuration, setPomodoroBreakDuration] = useState('');
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [backupMessage, setBackupMessage] = useState(null);

  useEffect(() => {
    // Load data from localStorage on mount
    setUserName(localStorage.getItem('userName') || '');
    setSemesterStartDate(localStorage.getItem('semesterStartDate') || '2025-08-25');
    setSemesterEndDate(localStorage.getItem('semesterEndDate') || '2025-12-11');
    setPomodoroWorkDuration(localStorage.getItem('pomodoroWorkDuration') || '50');
    setPomodoroBreakDuration(localStorage.getItem('pomodoroBreakDuration') || '10');

    // Load backup list
    loadBackupList();
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
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('pomodoroSettingsChanged'));
  };

  const handleBreakDurationChange = (e) => {
    const newDuration = e.target.value;
    setPomodoroBreakDuration(newDuration);
    localStorage.setItem('pomodoroBreakDuration', newDuration);
    backupManager.saveAutoBackup();
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('pomodoroSettingsChanged'));
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

          {/* Canvas Settings Placeholder */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Canvas Integration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Canvas API Token
                </label>
                <input
                  type="password"
                  placeholder="Paste your Canvas API token here"
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                  disabled
                />
                <p className="text-xs text-text-tertiary mt-2">
                  Canvas setup will be enabled in Week 3
                </p>
              </div>
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
