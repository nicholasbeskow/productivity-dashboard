import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';

// Color constants for different modes
const WORK_COLOR = '#f97316'; // orange-500
const BREAK_COLOR = '#facc15'; // yellow-400

const PomodoroTimer = () => {
  // Timer state
  const [mode, setMode] = useState('idle'); // 'work', 'break', 'longBreak', 'idle'
  const [isActive, setIsActive] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [cyclesBeforeLongBreak] = useState(4);

  // Durations (in seconds)
  const [workDuration, setWorkDuration] = useState(() => {
    const stored = localStorage.getItem('pomodoroWorkDuration');
    return stored ? parseInt(stored) * 60 : 50 * 60; // Convert minutes to seconds
  });

  const [breakDuration, setBreakDuration] = useState(() => {
    const stored = localStorage.getItem('pomodoroBreakDuration');
    return stored ? parseInt(stored) * 60 : 10 * 60; // Convert minutes to seconds
  });

  const [longBreakDuration, setLongBreakDuration] = useState(() => {
    const stored = localStorage.getItem('pomodoroLongBreakDuration');
    return stored ? parseInt(stored) * 60 : 15 * 60; // Convert minutes to seconds
  });

  // Time left in current session
  const [timeLeft, setTimeLeft] = useState(workDuration);

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
      case 'longBreak':
        return longBreakDuration;
      default:
        return workDuration; // idle defaults to work duration
    }
  };

  // Get current color based on mode
  const getCurrentColor = () => {
    if (mode === 'work') return WORK_COLOR;
    if (mode === 'break' || mode === 'longBreak') return BREAK_COLOR;
    return '#64748b'; // gray for idle
  };

  // Get mode label
  const getModeLabel = () => {
    switch (mode) {
      case 'work':
        return 'Work';
      case 'break':
        return 'Break';
      case 'longBreak':
        return 'Long Break';
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

  // Mode switching logic (reusable)
  const switchToNextMode = () => {
    let nextMode;
    let nextDuration;
    let shouldAutoStart = false;
    let notificationTitle = '';
    let notificationBody = '';

    if (mode === 'work') {
      // Work session completed
      notificationTitle = 'Work Complete!';
      notificationBody = 'Time for a break!';

      // Check if it's time for a long break
      if (currentCycle >= cyclesBeforeLongBreak) {
        nextMode = 'longBreak';
        nextDuration = longBreakDuration;
      } else {
        nextMode = 'break';
        nextDuration = breakDuration;
      }

      setCurrentCycle(prev => prev + 1);
      shouldAutoStart = true; // Auto-start breaks
    } else if (mode === 'break') {
      // Short break completed
      notificationTitle = 'Break Over!';
      notificationBody = 'Ready for the next session?';
      nextMode = 'work';
      nextDuration = workDuration;
      shouldAutoStart = false; // Manual start for work
    } else if (mode === 'longBreak') {
      // Long break completed
      notificationTitle = 'Long Break Over!';
      notificationBody = 'Ready to get back to work?';
      nextMode = 'work';
      nextDuration = workDuration;
      setCurrentCycle(1); // Reset cycle count
      shouldAutoStart = false; // Manual start for work
    } else {
      // Idle state (shouldn't normally happen)
      nextMode = 'work';
      nextDuration = workDuration;
      shouldAutoStart = false;
    }

    // Send notification
    if (notificationTitle) {
      sendNotification(notificationTitle, notificationBody);
    }

    // Update state
    setMode(nextMode);
    setTimeLeft(nextDuration);
    setIsActive(shouldAutoStart);
  };

  // Listen for localStorage changes (from Settings)
  useEffect(() => {
    const handleStorageChange = () => {
      const newWorkDuration = parseInt(localStorage.getItem('pomodoroWorkDuration') || '50') * 60;
      const newBreakDuration = parseInt(localStorage.getItem('pomodoroBreakDuration') || '10') * 60;
      const newLongBreakDuration = parseInt(localStorage.getItem('pomodoroLongBreakDuration') || '15') * 60;

      setWorkDuration(newWorkDuration);
      setBreakDuration(newBreakDuration);
      setLongBreakDuration(newLongBreakDuration);

      // If timer is idle and not active, update timeLeft to reflect new duration
      if (!isActive && mode === 'idle') {
        setTimeLeft(newWorkDuration);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pomodoroSettingsChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pomodoroSettingsChanged', handleStorageChange);
    };
  }, [isActive, mode]);

  // Timer countdown logic
  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer reached 0 - switch to next mode
            setIsActive(false);
            // Use setTimeout to ensure state updates complete
            setTimeout(() => {
              switchToNextMode();
            }, 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, mode, currentCycle, cyclesBeforeLongBreak, workDuration, breakDuration, longBreakDuration]);

  // Start/Pause handler
  const handleStartPause = () => {
    if (mode === 'idle') {
      // Start first work session
      setMode('work');
      setTimeLeft(workDuration);
      setIsActive(true);
    } else {
      // Toggle pause
      setIsActive(!isActive);
    }
  };

  // Reset handler - always reset to work mode
  const handleReset = () => {
    setIsActive(false);
    setMode('work');
    setTimeLeft(workDuration);
    setCurrentCycle(1);
  };

  // Skip handler - immediately switch to next mode
  const handleSkip = () => {
    setIsActive(false);
    switchToNextMode();
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
    : (mode === 'break' || mode === 'longBreak')
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
