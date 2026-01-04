import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CircularProgress = ({ daysRemaining, progressPercentage, breakDaysLeft }) => {
  const [isHovered, setIsHovered] = useState(false);

  const size = 140;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progressPercentage / 100) * circumference;

  // Use golden amber for break mode, green for semester mode
  const isBreakMode = breakDaysLeft !== null;
  const strokeColor = isBreakMode ? '#fbbf24' : '#3dd68c';
  const glowColor = isBreakMode ? 'rgba(251, 191, 36, 0.4)' : 'rgba(61, 214, 140, 0.4)';
  const textColorClass = isBreakMode ? 'text-amber-400' : 'text-green-glow';

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      style={{ WebkitAppRegion: 'no-drag' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle - Carved groove */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0, 0, 0, 0.5)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle - Liquid neon glow */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeOpacity={0.9}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          style={{
            filter: `drop-shadow(0 0 2px ${strokeColor})`,
          }}
        />
      </svg>
      {/* Center text with animated transition */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {isHovered ? (
            <motion.div
              key="percentage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center"
            >
              {breakDaysLeft !== null ? (
                <>
                  <div className={`text-4xl font-bold ${textColorClass}`}>
                    {breakDaysLeft}
                  </div>
                  <div className="text-xs text-white/70 mt-1">
                    days left
                  </div>
                </>
              ) : (
                <>
                  <div className={`text-4xl font-bold ${textColorClass}`}>
                    {Math.round(progressPercentage)}%
                  </div>
                  <div className="text-xs text-white/70 mt-1">
                    complete
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="days"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center"
            >
              <div className={`text-4xl font-bold ${textColorClass}`}>
                {daysRemaining > 0 ? daysRemaining : '🌴'}
              </div>
              <div className="text-xs text-white/70 mt-1">
                {daysRemaining > 0 ? 'days left' : 'on break'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CircularProgress;
