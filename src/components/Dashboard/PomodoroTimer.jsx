import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw, SkipForward, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useTimerStore from '../../stores/timerStore';

// Color constants for different modes
const WORK_COLOR = '#f97316'; // orange-500
const BREAK_COLOR = '#facc15'; // yellow-400

// Reusable TimerDisplay sub-component
const TimerDisplay = ({
  size = 240,
  strokeWidth = 12,
  fontSize = '2.25rem',
  timeText,
  modeLabel,
  progressPercentage,
  currentColor,
  glowColor
}) => {
  const radius = (size - strokeWidth) / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle - Carved groove */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(0, 0, 0, 0.5)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle - Liquid neon glow */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={currentColor}
          strokeWidth={strokeWidth}
          strokeOpacity={0.9}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 4px ${currentColor}) drop-shadow(0 0 8px ${currentColor})`,
            transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease-in-out, filter 0.5s ease-in-out'
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-bold text-white mb-2 font-sans"
          style={{ fontSize }}
        >
          {timeText}
        </div>
        <div
          className="text-sm font-medium uppercase tracking-wider"
          style={{
            color: currentColor,
            transition: 'color 0.5s ease-in-out',
            fontSize: size > 300 ? '1rem' : '0.875rem'
          }}
        >
          {modeLabel}
        </div>
      </div>
    </div>
  );
};

const PomodoroTimer = () => {
  // Get state and actions from Zustand store
  const {
    mode,
    timeLeft,
    isActive,
    workDuration,
    breakDuration,
    resetTimer,
    toggleTimer,
    skipTimer,
    startWork
  } = useTimerStore();

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if essential data is loaded
  if (workDuration === undefined || timeLeft === undefined) {
    return (
      <div className="glass-panel rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">
          Pomodoro Timer
        </h3>
        <div className="flex items-center justify-center h-48">
          <p className="text-white/70">Loading timer...</p>
        </div>
      </div>
    );
  }

  // Helper function to format seconds as MM:SS
  const formatTime = (seconds) => {
    if (seconds === undefined || seconds === null) {
      return '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current mode's total duration
  const getTotalDuration = () => {
    switch (mode) {
      case 'work':
        return workDuration || 3000; // Fallback to 50 minutes
      case 'break':
        return breakDuration || 600; // Fallback to 10 minutes
      default:
        return workDuration || 3000; // idle defaults to work duration
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
    skipTimer();
  };

  // Calculate progress percentage (for circular progress)
  const totalDuration = getTotalDuration();
  const safeTimeLeft = timeLeft ?? 0;
  const progressPercentage = totalDuration > 0
    ? ((totalDuration - safeTimeLeft) / totalDuration) * 100
    : 0;

  const currentColor = getCurrentColor();

  // Dynamic glow color based on mode
  const currentGlowColor = mode === 'work'
    ? 'rgba(249, 115, 22, 0.4)'  // orange-500 glow
    : mode === 'break'
    ? 'rgba(250, 204, 21, 0.4)'  // yellow-400 glow
    : 'rgba(0, 0, 0, 0)';         // no glow when idle

  // Common props for TimerDisplay
  const timerDisplayProps = {
    timeText: formatTime(timeLeft),
    modeLabel: getModeLabel(),
    progressPercentage,
    currentColor,
    glowColor: currentGlowColor
  };

  return (
    <>
      <div className="glass-panel rounded-xl p-6 border border-white/10">
        {/* Header with Maximize button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">
            Pomodoro Timer
          </h3>
          <motion.button
            onClick={() => setIsFullscreen(true)}
            className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-bg-primary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Fullscreen mode"
          >
            <Maximize2 size={18} />
          </motion.button>
        </div>

        {/* Circular Progress using TimerDisplay */}
        <div className="flex items-center justify-center mb-6">
          <TimerDisplay
            size={240}
            strokeWidth={12}
            fontSize="2.25rem"
            {...timerDisplayProps}
          />
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

      {/* Fullscreen overlay rendered via portal */}
      {createPortal(
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              key="fullscreen-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 bg-bg-primary flex flex-col items-center justify-center"
            >
              {/* Minimize button */}
              <motion.button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-6 right-6 p-3 rounded-full bg-bg-tertiary hover:glass-panel border border-bg-secondary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Exit fullscreen"
              >
                <Minimize2 size={24} />
              </motion.button>

              {/* Large Timer Display */}
              <div className="flex items-center justify-center mb-12">
                <TimerDisplay
                  size={400}
                  strokeWidth={20}
                  fontSize="4.5rem"
                  {...timerDisplayProps}
                />
              </div>

              {/* Large Control Buttons */}
              <div className="flex items-center justify-center gap-6">
                {/* Start/Pause Button */}
                <motion.button
                  onClick={handleStartPause}
                  className="p-6 rounded-full bg-green-glow hover:bg-green-glow/90 text-bg-primary transition-all shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={isActive ? 'Pause' : 'Start'}
                >
                  {isActive ? <Pause size={36} /> : <Play size={36} className="ml-1" />}
                </motion.button>

                {/* Reset Button */}
                <motion.button
                  onClick={handleReset}
                  className="p-5 rounded-full bg-bg-tertiary hover:glass-panel border border-bg-secondary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Reset"
                  disabled={mode === 'idle'}
                >
                  <RotateCcw size={28} />
                </motion.button>

                {/* Skip Button */}
                <motion.button
                  onClick={handleSkip}
                  className="p-5 rounded-full bg-bg-tertiary hover:glass-panel border border-bg-secondary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Skip"
                  disabled={mode === 'idle'}
                >
                  <SkipForward size={28} />
                </motion.button>
              </div>

              {/* Status indicator */}
              {isActive && (
                <div className="mt-8 text-center">
                  <span className="inline-flex items-center gap-2 text-sm text-text-tertiary">
                    <span className="w-3 h-3 rounded-full bg-green-glow animate-pulse" />
                    Timer running
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default PomodoroTimer;
