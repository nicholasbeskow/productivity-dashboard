/**
 * BackupManager - 4-Layer Backup System
 *
 * Level 1: Auto-save on every change
 * Level 2: Timestamped snapshots every 5 minutes
 * Level 3: Manual export/import
 * Level 4: Emergency recovery UI
 */

class BackupManager {
  constructor() {
    this.snapshotInterval = null;
    this.lastSnapshotTime = null;
    this.SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check if we're in Electron environment
   */
  isElectron() {
    return window.require !== undefined;
  }

  /**
   * Get all localStorage data for backup
   */
  getAllData() {
    return {
      tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
      completedTasks: JSON.parse(localStorage.getItem('completedTasks') || '[]'),
      userName: localStorage.getItem('userName') || '',
      semesterStartDate: localStorage.getItem('semesterStartDate') || '',
      semesterEndDate: localStorage.getItem('semesterEndDate') || '',
      taskFilter: localStorage.getItem('taskFilter') || 'all',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Restore all data from backup
   */
  restoreAllData(data) {
    if (!data) return false;

    try {
      if (data.tasks) localStorage.setItem('tasks', JSON.stringify(data.tasks));
      if (data.completedTasks) localStorage.setItem('completedTasks', JSON.stringify(data.completedTasks));
      if (data.userName) localStorage.setItem('userName', data.userName);
      if (data.semesterStartDate) localStorage.setItem('semesterStartDate', data.semesterStartDate);
      if (data.semesterEndDate) localStorage.setItem('semesterEndDate', data.semesterEndDate);
      if (data.taskFilter) localStorage.setItem('taskFilter', data.taskFilter);

      // Trigger storage event to update all components
      window.dispatchEvent(new Event('storage'));

      return true;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  }

  /**
   * Level 1: Auto-save backup (called after every localStorage write)
   */
  async saveAutoBackup() {
    if (!this.isElectron()) {
      console.warn('Auto-backup is only available in Electron environment');
      return { success: false, error: 'Not in Electron environment' };
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const data = this.getAllData();
      const result = await ipcRenderer.invoke('backup:save-auto', data);
      return result;
    } catch (error) {
      console.error('Error saving auto-backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Level 2: Save timestamped snapshot
   */
  async saveSnapshot() {
    if (!this.isElectron()) {
      console.warn('Snapshots are only available in Electron environment');
      return { success: false, error: 'Not in Electron environment' };
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const data = this.getAllData();
      const result = await ipcRenderer.invoke('backup:save-snapshot', data);

      if (result.success) {
        this.lastSnapshotTime = new Date();
      }

      return result;
    } catch (error) {
      console.error('Error saving snapshot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start automatic snapshot timer (every 5 minutes)
   */
  startSnapshotTimer() {
    if (!this.isElectron()) return;

    // Clear existing timer if any
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
    }

    // Save initial snapshot
    this.saveSnapshot();

    // Start timer
    this.snapshotInterval = setInterval(() => {
      this.saveSnapshot();
    }, this.SNAPSHOT_INTERVAL_MS);

    console.log('[BackupManager] Snapshot timer started (every 5 minutes)');
  }

  /**
   * Stop automatic snapshot timer
   */
  stopSnapshotTimer() {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
      console.log('[BackupManager] Snapshot timer stopped');
    }
  }

  /**
   * Level 3: Export backup to custom location
   */
  async exportBackup() {
    if (!this.isElectron()) {
      // Fallback for web: download as JSON file
      const data = this.getAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productivity-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const data = this.getAllData();
      const result = await ipcRenderer.invoke('backup:export', data);
      return result;
    } catch (error) {
      console.error('Error exporting backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Level 3: Import backup from custom location
   */
  async importBackup() {
    if (!this.isElectron()) {
      // Fallback for web: file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) {
            resolve({ success: false, canceled: true });
            return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target.result);
              resolve({ success: true, data });
            } catch (error) {
              resolve({ success: false, error: 'Invalid JSON file' });
            }
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('backup:import');
      return result;
    } catch (error) {
      console.error('Error importing backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Level 4: List all backup files
   */
  async listBackups() {
    if (!this.isElectron()) {
      console.warn('Backup list is only available in Electron environment');
      return { success: false, error: 'Not in Electron environment', backups: [] };
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('backup:list');
      return result;
    } catch (error) {
      console.error('Error listing backups:', error);
      return { success: false, error: error.message, backups: [] };
    }
  }

  /**
   * Level 4: Load specific backup file
   */
  async loadBackup(fileName) {
    if (!this.isElectron()) {
      console.warn('Backup loading is only available in Electron environment');
      return { success: false, error: 'Not in Electron environment' };
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('backup:load', fileName);
      return result;
    } catch (error) {
      console.error('Error loading backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete backup file
   */
  async deleteBackup(fileName) {
    if (!this.isElectron()) {
      console.warn('Backup deletion is only available in Electron environment');
      return { success: false, error: 'Not in Electron environment' };
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('backup:delete', fileName);
      return result;
    } catch (error) {
      console.error('Error deleting backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format date for display
   */
  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// Create singleton instance
const backupManager = new BackupManager();

export default backupManager;
