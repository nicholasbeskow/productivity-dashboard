import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CircularProgress = ({ daysRemaining, progressPercentage }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const size = 140;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div 
      className="relative flex items-center justify-center cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e2530"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3dd68c"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(61, 214, 140, 0.4))',
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
              <div className="text-4xl font-bold text-green-glow">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-xs text-text-secondary mt-1">
                complete
              </div>
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
              <div className="text-4xl font-bold text-green-glow">
                {daysRemaining > 0 ? daysRemaining : '🌴'}
              </div>
              <div className="text-xs text-text-secondary mt-1">
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
