import { Settings, Download, Upload, RefreshCw, Trash2, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import backupManager from '../../utils/backupManager';

const SettingsTab = () => {
  const [userName, setUserName] = useState('');
  const [semesterStartDate, setSemesterStartDate] = useState('');
  const [semesterEndDate, setSemesterEndDate] = useState('');
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState(null);

  useEffect(() => {
    // Load data from localStorage on mount
    setUserName(localStorage.getItem('userName') || '');
    setSemesterStartDate(localStorage.getItem('semesterStartDate') || '2025-08-25');
    setSemesterEndDate(localStorage.getItem('semesterEndDate') || '2025-12-11');

    // Load backup list
    loadBackupList();
  }, []);

  const loadBackupList = async () => {
    const result = await backupManager.listBackups();
    if (result.success) {
      setBackups(result.backups);
    }
  };

  const showMessage = (message, type = 'success') => {
    setBackupMessage({ text: message, type });
    setTimeout(() => setBackupMessage(null), 3000);
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    const result = await backupManager.exportBackup();
    setBackupLoading(false);

    if (result.success && !result.canceled) {
      showMessage('Backup exported successfully!', 'success');
    } else if (result.canceled) {
      showMessage('Export canceled', 'info');
    } else {
      showMessage(`Export failed: ${result.error}`, 'error');
    }
  };

  const handleImportBackup = async () => {
    setBackupLoading(true);
    const result = await backupManager.importBackup();

    if (result.success && !result.canceled) {
      const restored = backupManager.restoreAllData(result.data);
      setBackupLoading(false);

      if (restored) {
        showMessage('Backup imported successfully!', 'success');
        // Reload the page to reflect changes
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showMessage('Failed to restore backup data', 'error');
      }
    } else if (result.canceled) {
      setBackupLoading(false);
      showMessage('Import canceled', 'info');
    } else {
      setBackupLoading(false);
      showMessage(`Import failed: ${result.error}`, 'error');
    }
  };

  const handleRestoreBackup = async (fileName) => {
    const confirmed = window.confirm(
      `Are you sure you want to restore from "${fileName}"? This will replace all current data.`
    );

    if (!confirmed) return;

    setBackupLoading(true);
    const result = await backupManager.loadBackup(fileName);

    if (result.success) {
      const restored = backupManager.restoreAllData(result.data);
      setBackupLoading(false);

      if (restored) {
        showMessage('Backup restored successfully!', 'success');
        // Reload the page to reflect changes
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showMessage('Failed to restore backup data', 'error');
      }
    } else {
      setBackupLoading(false);
      showMessage(`Restore failed: ${result.error}`, 'error');
    }
  };

  const handleDeleteBackup = async (fileName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${fileName}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setBackupLoading(true);
    const result = await backupManager.deleteBackup(fileName);
    setBackupLoading(false);

    if (result.success) {
      showMessage('Backup deleted successfully!', 'success');
      loadBackupList();
    } else {
      showMessage(`Delete failed: ${result.error}`, 'error');
    }
  };

  const handleUserNameChange = (e) => {
    const newName = e.target.value;
    setUserName(newName);
    localStorage.setItem('userName', newName);

    // Backup after save
    backupManager.saveAutoBackup();

    window.dispatchEvent(new Event('userNameChanged'));
  };

  const handleStartDateChange = (e) => {
    const newDate = e.target.value;
    setSemesterStartDate(newDate);
    localStorage.setItem('semesterStartDate', newDate);

    // Backup after save
    backupManager.saveAutoBackup();

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('semesterDatesChanged'));
  };

  const handleEndDateChange = (e) => {
    const newDate = e.target.value;
    setSemesterEndDate(newDate);
    localStorage.setItem('semesterEndDate', newDate);

    // Backup after save
    backupManager.saveAutoBackup();

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('semesterDatesChanged'));
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

          {/* Timer Settings Placeholder */}
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
                  value={50}
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  value={10}
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                  disabled
                />
              </div>
            </div>
            <p className="text-xs text-text-tertiary mt-4">
              Timer customization will be enabled in Week 4
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

                      // Backup after change
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

          {/* Backup & Recovery */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Backup & Recovery
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

            <div className="space-y-4">
              {/* Export/Import Buttons */}
              <div>
                <p className="text-sm text-text-secondary mb-3">
                  Manually export or import your data
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportBackup}
                    disabled={backupLoading}
                    className="flex-1 bg-green-glow hover:bg-green-glow/90 disabled:bg-green-glow/50 disabled:cursor-not-allowed text-bg-primary font-semibold px-6 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Export Backup
                  </button>
                  <button
                    onClick={handleImportBackup}
                    disabled={backupLoading}
                    className="flex-1 bg-bg-tertiary hover:bg-bg-primary disabled:bg-bg-tertiary/50 disabled:cursor-not-allowed text-text-primary font-semibold px-6 py-2 rounded-lg border border-bg-primary hover:border-green-glow/50 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Upload size={16} />
                    Import Backup
                  </button>
                </div>
                <p className="text-xs text-text-tertiary mt-2">
                  Export saves a copy to your chosen location. Import restores data from a file.
                </p>
              </div>

              {/* Automatic Backups Info */}
              <div className="border-t border-bg-tertiary pt-4">
                <p className="text-sm text-text-secondary mb-2">
                  <strong className="text-text-primary">Automatic Protection:</strong>
                </p>
                <ul className="text-xs text-text-tertiary space-y-1 ml-4">
                  <li>• Auto-backup after every change</li>
                  <li>• Timestamped snapshots every 5 minutes</li>
                  <li>• Backups stored in: {'{'}userData{'}'}/backups/</li>
                </ul>
              </div>

              {/* Backup History */}
              {backups.length > 0 && (
                <div className="border-t border-bg-tertiary pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-text-primary font-semibold">
                      Available Backups ({backups.length})
                    </p>
                    <button
                      onClick={loadBackupList}
                      disabled={backupLoading}
                      className="p-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-bg-primary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all disabled:opacity-50"
                      title="Refresh list"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {backups.map((backup) => (
                      <div
                        key={backup.name}
                        className="bg-bg-tertiary rounded-lg p-3 border border-bg-primary hover:border-green-glow/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary font-medium truncate">
                              {backup.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {backupManager.formatDate(backup.modified)}
                              </span>
                              <span>{backupManager.formatFileSize(backup.size)}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleRestoreBackup(backup.name)}
                              disabled={backupLoading}
                              className="p-2 rounded-lg bg-green-glow hover:bg-green-glow/90 disabled:bg-green-glow/50 disabled:cursor-not-allowed text-bg-primary transition-all"
                              title="Restore this backup"
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteBackup(backup.name)}
                              disabled={backupLoading}
                              className="p-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed text-white transition-all"
                              title="Delete this backup"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-text-tertiary mt-3">
                    Click the restore icon to recover data from a backup. Auto-backups are overwritten automatically.
                  </p>
                </div>
              )}

              {/* No Backups Message */}
              {backups.length === 0 && !backupLoading && backupManager.isElectron() && (
                <div className="border-t border-bg-tertiary pt-4">
                  <p className="text-sm text-text-tertiary text-center py-4">
                    No backup files found. Backups will appear here as they're created automatically.
                  </p>
                </div>
              )}

              {/* Web Environment Message */}
              {!backupManager.isElectron() && (
                <div className="border-t border-bg-tertiary pt-4">
                  <p className="text-sm text-text-tertiary">
                    <strong className="text-text-primary">Note:</strong> Automatic backups and recovery are only available in the desktop app. Use Export/Import for manual backups.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* App Info */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              About
            </h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p><strong className="text-text-primary">Version:</strong> 1.0.0 (Week 1)</p>
              <p><strong className="text-text-primary">Status:</strong> Foundation Phase</p>
              <p className="text-text-tertiary pt-2">
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
