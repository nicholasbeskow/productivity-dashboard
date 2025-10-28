import { useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';
import useTimerStore from '../../stores/timerStore';

// Color constants for different modes
const WORK_COLOR = '#f97316'; // orange-500
const BREAK_COLOR = '#facc15'; // yellow-400

const PomodoroTimer = () => {
  // Get state and actions from Zustand store
  const {
    mode,
    timeLeft,
    isActive,
    workDuration,
    breakDuration,
    tick,
    setIsActive,
    setDurations,
    setTimeLeft,
    resetTimer,
    toggleTimer,
    switchToNextMode,
    startWork
  } = useTimerStore();

  // Helper function to format seconds as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current mode's total duration
  const getTotalDuration = () => {
    switch (mode) {
      case 'work':
        return workDuration;
      case 'break':
        return breakDuration;
      default:
        return workDuration; // idle defaults to work duration
    }
  };

  // Get current color based on mode
  const getCurrentColor = () => {
    if (mode === 'work') return WORK_COLOR;
    if (mode === 'break') return BREAK_COLOR;
    return '#64748b'; // gray for idle
  };

  // Get mode label
  const getModeLabel = () => {
    switch (mode) {
      case 'work':
        return 'Work';
      case 'break':
        return 'Break';
      default:
        return 'Idle';
    }
  };

  // Send desktop notification
  const sendNotification = (title, body) => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('timer:send-notification', { title, body });
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  };

  // Helper to send notification based on completed mode
  const sendCompletionNotification = (completedMode) => {
    if (completedMode === 'work') {
      sendNotification('Work Complete!', 'Time for a break!');
    } else if (completedMode === 'break') {
      sendNotification('Break Over!', 'Ready for the next session?');
    }
  };

  // Timer countdown logic
  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        const currentTime = useTimerStore.getState().timeLeft;

        if (currentTime <= 1) {
          // Timer reached 0 - switch to next mode
          const currentMode = useTimerStore.getState().mode;
          setIsActive(false);

          // Use setTimeout to ensure state updates complete
          setTimeout(() => {
            sendCompletionNotification(currentMode);
            switchToNextMode();
          }, 100);
        } else {
          tick();
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, tick, setIsActive, switchToNextMode]);

  // Start/Pause handler
  const handleStartPause = () => {
    if (mode === 'idle') {
      // Start first work session
      startWork();
    } else {
      // Toggle pause
      toggleTimer();
    }
  };

  // Reset handler - return to idle state
  const handleReset = () => {
    resetTimer();
  };

  // Skip handler - immediately switch to next mode
  const handleSkip = () => {
    const currentMode = mode;
    setIsActive(false);
    setTimeout(() => {
      sendCompletionNotification(currentMode);
      switchToNextMode();
    }, 100);
  };

  // Calculate progress percentage (for circular progress)
  const totalDuration = getTotalDuration();
  const progressPercentage = totalDuration > 0
    ? ((totalDuration - timeLeft) / totalDuration) * 100
    : 0;

  const currentColor = getCurrentColor();
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Dynamic glow color based on mode
  const currentGlowColor = mode === 'work'
    ? 'rgba(249, 115, 22, 0.4)'  // orange-500 glow
    : mode === 'break'
    ? 'rgba(250, 204, 21, 0.4)'  // yellow-400 glow
    : 'rgba(0, 0, 0, 0)';         // no glow when idle

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
      <h3 className="text-xl font-semibold text-text-primary mb-4">
        Pomodoro Timer
      </h3>

      {/* Circular Progress */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative" style={{ width: 240, height: 240 }}>
          {/* SVG Circle */}
          <svg
            width="240"
            height="240"
            className="transform -rotate-90"
          >
            {/* Background circle - NO GLOW */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke="#1a1f2e"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle - GLOW APPLIED HERE */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke={currentColor}
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 8px ${currentGlowColor})`,
                transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease-in-out, filter 0.5s ease-in-out'
              }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-text-primary mb-2 font-sans">
              {formatTime(timeLeft)}
            </div>
            <div
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: currentColor, transition: 'color 0.5s ease-in-out' }}
            >
              {getModeLabel()}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        {/* Start/Pause Button */}
        <motion.button
          onClick={handleStartPause}
          className="p-4 rounded-full bg-green-glow hover:bg-green-glow/90 text-bg-primary transition-all shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={isActive ? 'Pause' : 'Start'}
        >
          {isActive ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </motion.button>

        {/* Reset Button */}
        <motion.button
          onClick={handleReset}
          className="p-3 rounded-full bg-bg-tertiary hover:bg-bg-primary border border-bg-primary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Reset"
          disabled={mode === 'idle'}
        >
          <RotateCcw size={20} />
        </motion.button>

        {/* Skip Button */}
        <motion.button
          onClick={handleSkip}
          className="p-3 rounded-full bg-bg-tertiary hover:bg-bg-primary border border-bg-primary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Skip"
          disabled={mode === 'idle'}
        >
          <SkipForward size={20} />
        </motion.button>
      </div>

      {/* Status indicator (optional) */}
      {isActive && (
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-2 text-xs text-text-tertiary">
            <span className="w-2 h-2 rounded-full bg-green-glow animate-pulse" />
            Timer running
          </span>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
