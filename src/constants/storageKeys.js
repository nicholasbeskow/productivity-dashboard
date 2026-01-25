/**
 * LocalStorage key constants
 * Centralized to prevent typos and make refactoring easier
 */

// Task-related keys
export const STORAGE_KEYS = {
  // Tasks
  TASKS: 'tasks',
  COMPLETED_TASKS: 'completedTasks',
  RECURRING_TASKS: 'recurringTasks',
  TASK_FILTER: 'taskFilter',
  PROCESSED_CANVAS_IDS: 'processedCanvasIds',

  // User settings
  USER_NAME: 'userName',
  BREAK_START_DATE: 'breakStartDate',
  SEMESTER_START_DATE: 'semesterStartDate',
  SEMESTER_END_DATE: 'semesterEndDate',

  // Pomodoro settings
  POMODORO_WORK_DURATION: 'pomodoroWorkDuration',
  POMODORO_BREAK_DURATION: 'pomodoroBreakDuration',

  // Mood tracking
  MOOD_LOG: 'moodLog',
  JOURNAL_LOG: 'journalLog',

  // Sleep tracking
  SLEEP_LOG: 'sleepLog',

  // AI Configuration
  AI_API_KEY: 'aiApiKey',
  AI_MODEL: 'aiModel',

  // Duration Prediction
  TASK_DURATION_HISTORY: 'taskDurationHistory',
  DURATION_COOLDOWN_UNTIL: 'durationCooldownUntil',
  DURATION_FEATURE_ENABLED: 'durationFeatureEnabled',
};

// Event names for window.dispatchEvent
export const APP_EVENTS = {
  STORAGE: 'storage',
  USER_NAME_CHANGED: 'userNameChanged',
  SEMESTER_DATES_CHANGED: 'semesterDatesChanged',
  TASK_FILTER_CHANGED: 'taskFilterChanged',
  STATS_RESET: 'statsReset',
  MOOD_DATA_UPDATED: 'moodDataUpdated',
  SLEEP_DATA_UPDATED: 'sleepDataUpdated',
};
