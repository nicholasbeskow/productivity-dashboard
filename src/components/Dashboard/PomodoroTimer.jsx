import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useTimerStore from '../../stores/timerStore';

// Color constants for different modes
const WORK_COLOR = '#f97316'; // orange-500
const BREAK_COLOR = '#facc15'; // yellow-400

const PomodoroTimer = () => {
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // ESC key handler for exiting fullscreen
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isFullscreen) {
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when fullscreen
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, handleKeyDown]);

  // Check if essential data is loaded
  if (workDuration === undefined || timeLeft === undefined) {
    return (
      <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
        <h3 className="text-xl font-semibold text-text-primary mb-4">
          Pomodoro Timer
        </h3>
        <div className="flex items-center justify-center h-48">
          <p className="text-text-secondary">Loading timer...</p>
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
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Dynamic glow color based on mode
  const currentGlowColor = mode === 'work'
    ? 'rgba(249, 115, 22, 0.4)'  // orange-500 glow
    : mode === 'break'
    ? 'rgba(250, 204, 21, 0.4)'  // yellow-400 glow
    : 'rgba(0, 0, 0, 0)';         // no glow when idle

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Fullscreen overlay component
  const FullscreenOverlay = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-bg-primary flex flex-col items-center justify-center"
      onClick={(e) => {
        // Close when clicking outside the timer area
        if (e.target === e.currentTarget) {
          setIsFullscreen(false);
        }
      }}
    >
      {/* Close button */}
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={() => setIsFullscreen(false)}
        className="absolute top-8 right-8 p-3 rounded-full bg-bg-tertiary hover:bg-bg-secondary border border-bg-secondary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
        title="Exit fullscreen (ESC)"
      >
        <X size={24} />
      </motion.button>

      {/* ESC hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="absolute top-10 left-1/2 -translate-x-1/2 text-text-tertiary text-sm"
      >
        Press <kbd className="px-2 py-1 bg-bg-tertiary rounded text-text-secondary">ESC</kbd> to exit
      </motion.div>

      {/* Main timer content */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        className="flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mode label */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-semibold uppercase tracking-widest mb-8"
          style={{ color: currentColor }}
        >
          {getModeLabel()}
        </motion.div>

        {/* Large circular progress */}
        <div className="relative" style={{ width: 400, height: 400 }}>
          <svg
            width="400"
            height="400"
            className="transform -rotate-90"
          >
            {/* Background circle */}
            <circle
              cx="200"
              cy="200"
              r={160}
              stroke="#1a1f2e"
              strokeWidth="16"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="200"
              cy="200"
              r={160}
              stroke={currentColor}
              strokeWidth="16"
              fill="none"
              strokeDasharray={2 * Math.PI * 160}
              strokeDashoffset={(2 * Math.PI * 160) - (progressPercentage / 100) * (2 * Math.PI * 160)}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 15px ${currentGlowColor})`,
                transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease-in-out'
              }}
            />
          </svg>

          {/* Center content - large time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-8xl font-bold text-text-primary mb-4 font-sans tabular-nums"
              style={{ letterSpacing: '0.05em' }}
            >
              {formatTime(timeLeft)}
            </motion.div>
          </div>
        </div>

        {/* Control buttons - larger in fullscreen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-6 mt-12"
        >
          {/* Start/Pause Button */}
          <motion.button
            onClick={handleStartPause}
            className="p-6 rounded-full bg-green-glow hover:bg-green-glow/90 text-bg-primary transition-all shadow-glow-strong"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isActive ? 'Pause' : 'Start'}
          >
            {isActive ? <Pause size={36} /> : <Play size={36} className="ml-1" />}
          </motion.button>

          {/* Reset Button */}
          <motion.button
            onClick={handleReset}
            className="p-5 rounded-full bg-bg-tertiary hover:bg-bg-secondary border border-bg-secondary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
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
            className="p-5 rounded-full bg-bg-tertiary hover:bg-bg-secondary border border-bg-secondary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Skip"
            disabled={mode === 'idle'}
          >
            <SkipForward size={28} />
          </motion.button>
        </motion.div>

        {/* Status indicator */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8"
          >
            <span className="inline-flex items-center gap-3 text-base text-text-tertiary">
              <span className="w-3 h-3 rounded-full bg-green-glow animate-pulse" />
              Timer running
            </span>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {/* Fullscreen overlay */}
      <AnimatePresence>
        {isFullscreen && <FullscreenOverlay />}
      </AnimatePresence>

      {/* Regular timer widget */}
      <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
        {/* Header with title and fullscreen button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-text-primary">
            Pomodoro Timer
          </h3>
          <motion.button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-bg-primary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Enter fullscreen"
          >
            <Maximize2 size={18} />
          </motion.button>
        </div>

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
    </>
  );
};

export default PomodoroTimer;
