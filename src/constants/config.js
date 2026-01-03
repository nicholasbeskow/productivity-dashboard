/**
 * Application configuration constants
 * Centralized magic numbers for durations, timeouts, limits, etc.
 */

// Time durations (milliseconds)
export const DURATIONS = {
  // Animation timings
  TASK_COMPLETE_ANIMATION: 700,
  CONFETTI_INTERVAL: 200,
  CONFETTI_DURATION: 5000,
  MESSAGE_TIMEOUT: 3000,
  RELOAD_DELAY: 1500,
  STARTUP_BACKUP_DELAY: 2000,

  // Pomodoro fallback durations (seconds)
  DEFAULT_WORK_DURATION: 3000,  // 50 minutes
  DEFAULT_BREAK_DURATION: 600,  // 10 minutes

  // Date calculations (milliseconds)
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 1000 * 60,
  MS_PER_HOUR: 1000 * 60 * 60,
  MS_PER_DAY: 1000 * 60 * 60 * 24,
};

// Default semester dates (fallback values)
export const DEFAULT_DATES = {
  SEMESTER_START: '2025-08-25',
  SEMESTER_END: '2025-12-11',
};

// UI sizing constants
export const UI_SIZES = {
  TASK_MENU_HEIGHT: 160,  // pixels
  TASK_MENU_SPACING: 8,   // pixels
};

// File size constants
export const FILE_SIZES = {
  BYTES_PER_KB: 1024,
};

// Backup limits
export const BACKUP_LIMITS = {
  MAX_SNAPSHOTS: 10,
};

// Platform-specific paths
export const PATHS = {
  SELFCONTROL_CLI: '/Applications/SelfControl.app/Contents/MacOS/selfcontrol-cli',
};
