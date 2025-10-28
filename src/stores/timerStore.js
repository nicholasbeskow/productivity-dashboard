import { create } from 'zustand';

const useTimerStore = create((set, get) => ({
  // State
  mode: 'idle', // 'work', 'break', 'idle'
  timeLeft: (() => {
    const stored = localStorage.getItem('pomodoroWorkDuration');
    return stored ? parseInt(stored) * 60 : 50 * 60;
  })(),
  isActive: false,
  workDuration: (() => {
    const stored = localStorage.getItem('pomodoroWorkDuration');
    return stored ? parseInt(stored) * 60 : 50 * 60;
  })(),
  breakDuration: (() => {
    const stored = localStorage.getItem('pomodoroBreakDuration');
    return stored ? parseInt(stored) * 60 : 10 * 60;
  })(),

  // Actions
  setMode: (newMode) => set({ mode: newMode }),

  setTimeLeft: (newTime) => set({ timeLeft: newTime }),

  tick: () => set((state) => ({
    timeLeft: state.timeLeft > 0 ? state.timeLeft - 1 : 0
  })),

  setIsActive: (active) => set({ isActive: active }),

  toggleTimer: () => set((state) => ({ isActive: !state.isActive })),

  setDurations: ({ work, break: breakDur }) => {
    set({
      workDuration: work,
      breakDuration: breakDur
    });

    // If timer is idle and not active, also update timeLeft
    const state = get();
    if (!state.isActive && state.mode === 'idle') {
      set({ timeLeft: work });
    }
  },

  resetTimer: () => set((state) => ({
    mode: 'idle',
    isActive: false,
    timeLeft: state.workDuration
  })),

  switchToNextMode: () => {
    const state = get();
    let nextMode;
    let nextDuration;
    let shouldAutoStart = false;

    if (state.mode === 'work') {
      // Work session completed - go to break
      nextMode = 'break';
      nextDuration = state.breakDuration;
      shouldAutoStart = true; // Auto-start breaks
    } else if (state.mode === 'break') {
      // Break completed - go to work
      nextMode = 'work';
      nextDuration = state.workDuration;
      shouldAutoStart = false; // Manual start for work
    } else {
      // Idle state
      nextMode = 'work';
      nextDuration = state.workDuration;
      shouldAutoStart = false;
    }

    set({
      mode: nextMode,
      timeLeft: nextDuration,
      isActive: shouldAutoStart
    });

    return { nextMode, shouldAutoStart }; // Return for notification logic
  },

  startWork: () => set((state) => ({
    mode: 'work',
    timeLeft: state.workDuration,
    isActive: true
  }))
}));

// Set up localStorage listener when store module loads
// This ensures settings changes are always picked up, even when component is unmounted
const handleStorageChange = () => {
  const newWorkDuration = parseInt(localStorage.getItem('pomodoroWorkDuration') || '50') * 60;
  const newBreakDuration = parseInt(localStorage.getItem('pomodoroBreakDuration') || '10') * 60;

  // Update store with new durations
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
