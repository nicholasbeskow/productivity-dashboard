import { create } from 'zustand';

// Get IPC renderer if available
const ipcRenderer = typeof window !== 'undefined' && window.require
  ? window.require('electron').ipcRenderer
  : null;

const useTimerStore = create((set, get) => ({
  // State (mirrors main process state)
  mode: 'idle',
  timeLeft: 50 * 60,
  isActive: false,
  workDuration: 50 * 60,
  breakDuration: 10 * 60,

  // Actions - send commands to main process
  toggleTimer: () => {
    const state = get();
    if (ipcRenderer) {
      if (state.isActive) {
        ipcRenderer.send('timer:pause');
      } else {
        ipcRenderer.send('timer:start');
      }
    }
  },

  resetTimer: () => {
    if (ipcRenderer) {
      ipcRenderer.send('timer:reset');
    }
  },

  skipTimer: () => {
    if (ipcRenderer) {
      ipcRenderer.send('timer:skip');
    }
  },

  setDurations: ({ work, break: breakDur }) => {
    if (ipcRenderer) {
      ipcRenderer.send('timer:set-durations', { work, break: breakDur });
    }
  },

  startWork: () => {
    if (ipcRenderer) {
      ipcRenderer.send('timer:start');
    }
  }
}));

// Set up IPC listener when store module loads
if (ipcRenderer) {
  // Listen for state updates from main process
  ipcRenderer.on('timer:update-state', (event, newState) => {
    useTimerStore.setState(newState);
  });

  // Request initial state from main process
  ipcRenderer.invoke('timer:get-initial-state').then(initialState => {
    if (initialState) {
      useTimerStore.setState(initialState);
    }
  }).catch(console.error);
}

// Set up localStorage listener for settings changes
const handleStorageChange = () => {
  const newWorkDuration = parseInt(localStorage.getItem('pomodoroWorkDuration') || '50') * 60;
  const newBreakDuration = parseInt(localStorage.getItem('pomodoroBreakDuration') || '10') * 60;

  // Send duration updates to main process
  useTimerStore.getState().setDurations({
    work: newWorkDuration,
    break: newBreakDuration
  });
};

// Listen for both storage events (from other tabs) and custom event (same tab)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('pomodoroSettingsChanged', handleStorageChange);
}

export default useTimerStore;
