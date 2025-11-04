import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laugh, Smile, Meh, Frown, FrownCry, Sparkles } from 'lucide-react';
import backupManager from '../../utils/backupManager';

// Mood definitions with icons, colors, and labels
const moods = [
  {
    level: 5,
    label: 'Great',
    icon: Laugh,
    color: 'text-green-glow',
    glowColor: '#3dd68c',
    hoverGlow: '0 0 20px rgba(61, 214, 140, 0.6)',
    particleColors: ['#3dd68c', '#2aba73', '#4fe39f']
  },
  {
    level: 4,
    label: 'Good',
    icon: Smile,
    color: 'text-blue-400',
    glowColor: '#60a5fa',
    hoverGlow: '0 0 20px rgba(96, 165, 250, 0.6)',
    particleColors: ['#60a5fa', '#3b82f6', '#93c5fd']
  },
  {
    level: 3,
    label: 'Okay',
    icon: Meh,
    color: 'text-yellow-500',
    glowColor: '#eab308',
    hoverGlow: '0 0 20px rgba(234, 179, 8, 0.6)',
    particleColors: ['#eab308', '#fbbf24', '#facc15']
  },
  {
    level: 2,
    label: 'Down',
    icon: Frown,
    color: 'text-orange-500',
    glowColor: '#f97316',
    hoverGlow: '0 0 20px rgba(249, 115, 22, 0.6)',
    particleColors: ['#f97316', '#fb923c', '#fdba74']
  },
  {
    level: 1,
    label: 'Rocky',
    icon: FrownCry,
    color: 'text-red-500',
    glowColor: '#ef4444',
    hoverGlow: '0 0 20px rgba(239, 68, 68, 0.6)',
    particleColors: ['#ef4444', '#dc2626', '#f87171']
  }
];

// Supportive messages based on mood level
const getMoodMessage = (level) => {
  switch (level) {
    case 5:
      return "Keep rocking your day!";
    case 4:
      return "Looking good!";
    case 3:
      return "One step at a time.";
    case 2:
      return "It's okay to have tough days.";
    case 1:
      return "Hang in there. Tomorrow is a new day.";
    default:
      return "";
  }
};

const MoodTracker = () => {
  const [todaysMood, setTodaysMood] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showParticles, setShowParticles] = useState(false);

  // Helper to get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Load mood log from localStorage on mount
  useEffect(() => {
    const moodLog = JSON.parse(localStorage.getItem('moodLog') || '[]');
    const todayString = getTodayString();
    const todayEntry = moodLog.find(entry => entry.date === todayString);

    if (todayEntry) {
      // Find the matching mood object
      const mood = moods.find(m => m.level === todayEntry.level);
      if (mood) {
        setTodaysMood(mood);
      }
    }

    setIsLoading(false);
  }, []);

  // Trigger particles when todaysMood is set
  useEffect(() => {
    if (todaysMood) {
      setShowParticles(true);
      // Hide particles after animation completes
      const timer = setTimeout(() => {
        setShowParticles(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [todaysMood]);

  // Handle mood selection
  const handleMoodSelect = (mood) => {
    setTodaysMood(mood);

    // Load existing mood log
    const moodLog = JSON.parse(localStorage.getItem('moodLog') || '[]');
    const todayString = getTodayString();

    // Filter out any existing entry for today
    const updatedLog = moodLog.filter(entry => entry.date !== todayString);

    // Add new entry
    updatedLog.push({
      date: todayString,
      level: mood.level,
      label: mood.label
    });

    // Save to localStorage
    localStorage.setItem('moodLog', JSON.stringify(updatedLog));

    // Trigger backup
    backupManager.saveAutoBackup();
  };

  // Handle change mood
  const handleChangeMood = () => {
    setTodaysMood(null);
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
      <h3 className="text-xl font-bold text-text-primary mb-4">Daily Check-in</h3>

      <AnimatePresence mode="wait">
        {!isLoading && (
          todaysMood ? (
            // View B: Mood selected
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {/* Particle Effect */}
              <AnimatePresence>
                {showParticles && (
                  <>
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                        animate={{
                          opacity: 0,
                          x: (Math.random() - 0.5) * 100,
                          y: (Math.random() - 0.5) * 100,
                          scale: 0,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.03 }}
                        className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-10"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: todaysMood.particleColors[i % 3],
                          willChange: 'transform, opacity',
                        }}
                      />
                    ))}
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 1] }}
                      transition={{ duration: 0.4 }}
                      className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-10"
                    >
                      <Sparkles className={todaysMood.color} size={20} />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="flex flex-col items-center gap-4">
                <motion.div
                  className={`${todaysMood.color}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <todaysMood.icon size={64} strokeWidth={1.5} />
                </motion.div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-text-primary mb-2">
                    {todaysMood.label}
                  </p>
                  <p className="text-sm text-text-secondary mb-4">
                    {getMoodMessage(todaysMood.level)}
                  </p>
                </div>

                <motion.button
                  onClick={handleChangeMood}
                  className="text-sm text-text-tertiary hover:text-green-glow transition-colors underline"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  (Change)
                </motion.button>
              </div>
            </motion.div>
          ) : (
            // View A: Select mood
            <motion.div
              key="select"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-text-secondary text-center mb-6">
                How are you feeling today?
              </p>

              <div className="flex justify-center gap-4 flex-wrap">
                {moods.map((mood) => (
                  <motion.button
                    key={mood.level}
                    onClick={() => handleMoodSelect(mood)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-bg-tertiary border border-bg-primary transition-all ${mood.color}`}
                    whileHover={{
                      scale: 1.1,
                      boxShadow: mood.hoverGlow
                    }}
                    whileTap={{ scale: 0.95 }}
                    title={mood.label}
                  >
                    <mood.icon size={32} strokeWidth={1.5} />
                    <span className="text-xs font-medium text-text-secondary">
                      {mood.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
};

export default MoodTracker;
