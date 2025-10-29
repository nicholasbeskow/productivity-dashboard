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

// Note: Settings updates are now handled directly via IPC in SettingsTab.jsx
// No localStorage listener needed here - main process handles settings persistence

export default useTimerStore;
