import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laugh, Smile, Meh, Frown, CloudRain, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, getDay, isSameDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import backupManager from '../../utils/backupManager';

// Mood definitions with icons, colors, and labels
const moods = [
  {
    level: 5,
    label: 'Great',
    icon: Laugh,
    color: 'text-yellow-500',
    glowColor: '#eab308',
    hoverGlow: '0 0 20px rgba(234, 179, 8, 0.6)',
    particleColors: ['#eab308', '#fbbf24', '#facc15']
  },
  {
    level: 4,
    label: 'Good',
    icon: Smile,
    color: 'text-green-glow',
    glowColor: '#3dd68c',
    hoverGlow: '0 0 20px rgba(61, 214, 140, 0.6)',
    particleColors: ['#3dd68c', '#2aba73', '#4fe39f']
  },
  {
    level: 3,
    label: 'Okay',
    icon: Meh,
    color: 'text-blue-400',
    glowColor: '#60a5fa',
    hoverGlow: '0 0 20px rgba(96, 165, 250, 0.6)',
    particleColors: ['#60a5fa', '#3b82f6', '#93c5fd']
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
    icon: CloudRain,
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
  const [view, setView] = useState('loading'); // 'loading', 'select', 'confirm', 'month'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingDate, setEditingDate] = useState(new Date());
  const [moodLog, setMoodLog] = useState([]);
  const [showParticles, setShowParticles] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [journalLog, setJournalLog] = useState([]);
  const [currentJournalEntry, setCurrentJournalEntry] = useState('');

  // Helper to get date string in YYYY-MM-DD format
  const getDateString = (date) => {
    return format(date, 'yyyy-MM-dd');
  };

  // Load mood log and journal log from localStorage on mount
  useEffect(() => {
    const storedLog = JSON.parse(localStorage.getItem('moodLog') || '[]');
    setMoodLog(storedLog);

    const storedJournalLog = JSON.parse(localStorage.getItem('journalLog') || '[]');
    setJournalLog(storedJournalLog);

    const todayString = getDateString(new Date());
    const todayEntry = storedLog.find(entry => entry.date === todayString);
    const todayJournalEntry = storedJournalLog.find(entry => entry.date === todayString);

    if (todayJournalEntry) {
      setCurrentJournalEntry(todayJournalEntry.text);
    }

    if (todayEntry) {
      setView('month');
    } else {
      setView('select');
    }
  }, []);

  // Trigger particles when selectedMood is set
  useEffect(() => {
    if (selectedMood && view === 'confirm') {
      setShowParticles(true);
      const timer = setTimeout(() => {
        setShowParticles(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [selectedMood, view]);

  // Handle mood selection
  const handleMoodSelect = (mood) => {
    // Save journal entry first (before view transition)
    const editingDateString = getDateString(editingDate);
    const updatedJournalLog = journalLog.filter(entry => entry.date !== editingDateString);
    if (currentJournalEntry.trim()) {
      updatedJournalLog.push({
        date: editingDateString,
        text: currentJournalEntry
      });
    }
    setJournalLog(updatedJournalLog);
    localStorage.setItem('journalLog', JSON.stringify(updatedJournalLog));

    setSelectedMood(mood);
    setView('confirm');

    // Update mood log
    const updatedLog = moodLog.filter(entry => entry.date !== editingDateString);
    updatedLog.push({
      date: editingDateString,
      level: mood.level,
      label: mood.label
    });

    setMoodLog(updatedLog);
    localStorage.setItem('moodLog', JSON.stringify(updatedLog));
    backupManager.saveAutoBackup();

    // Automatically transition to month view after 2.5 seconds
    setTimeout(() => {
      setView('month');
    }, 2500);
  };

  // Handle day click in monthly view
  const handleDayClick = (date) => {
    // Prevent editing future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      return; // Don't allow clicking future dates
    }

    // Load journal entry for the selected date
    const dateString = getDateString(date);
    const existingJournalEntry = journalLog.find(entry => entry.date === dateString);
    if (existingJournalEntry) {
      setCurrentJournalEntry(existingJournalEntry.text);
    } else {
      setCurrentJournalEntry('');
    }

    setEditingDate(date);
    setView('select');
  };

  // Handle remove mood for editing date
  const handleRemoveMood = () => {
    const editingDateString = getDateString(editingDate);

    // Filter out the mood for editingDate
    const updatedLog = moodLog.filter(entry => entry.date !== editingDateString);

    // Update state and localStorage
    setMoodLog(updatedLog);
    localStorage.setItem('moodLog', JSON.stringify(updatedLog));
    backupManager.saveAutoBackup();

    // Return to month view
    setView('month');
  };

  // Handle previous month navigation
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // Handle next month navigation
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Get mood for a specific date
  const getMoodForDate = (date) => {
    const dateString = getDateString(date);
    const entry = moodLog.find(e => e.date === dateString);
    if (entry) {
      return moods.find(m => m.level === entry.level);
    }
    return null;
  };

  // Render monthly calendar view
  const renderMonthlyView = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDayOfMonth = startOfMonth(currentMonth);
    const startDayOfWeek = getDay(firstDayOfMonth);

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-12" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const mood = getMoodForDate(date);
      const isToday = isSameDay(date, new Date());

      // Check if date is in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      const isFuture = checkDate > today;

      days.push(
        <motion.button
          key={day}
          onClick={() => handleDayClick(date)}
          disabled={isFuture}
          className={`h-12 flex items-center justify-center rounded-lg transition-all ${
            isFuture
              ? 'opacity-50 cursor-not-allowed'
              : isToday
              ? 'bg-green-glow/20 border border-green-glow'
              : 'hover:bg-bg-tertiary'
          }`}
          whileHover={isFuture ? {} : { scale: 1.05 }}
          whileTap={isFuture ? {} : { scale: 0.95 }}
        >
          {mood ? (
            (() => {
              const MoodIcon = mood.icon;
              return <MoodIcon size={24} className={mood.color} strokeWidth={1.5} />;
            })()
          ) : (
            <span className="text-text-tertiary text-sm">{day}</span>
          )}
        </motion.button>
      );
    }

    return (
      <motion.div
        key="month"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Month header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-primary transition-all"
            title="Previous month"
          >
            <ChevronLeft size={20} />
          </button>

          <h4 className="text-lg font-semibold text-text-primary">
            {format(currentMonth, 'MMMM yyyy')}
          </h4>

          <button
            onClick={handleNextMonth}
            disabled={isSameMonth(currentMonth, new Date())}
            className={`p-2 rounded-lg transition-all ${
              isSameMonth(currentMonth, new Date())
                ? 'opacity-50 cursor-not-allowed text-text-tertiary'
                : 'hover:bg-bg-tertiary text-text-primary'
            }`}
            title="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div
              key={index}
              className="h-8 flex items-center justify-center text-xs font-medium text-text-tertiary"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {days}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
      <h3 className="text-xl font-bold text-text-primary mb-4">Mood Tracker</h3>

      <AnimatePresence mode="wait">
        {view === 'select' && (
          // View A: Select mood
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-text-secondary text-center mb-6">
              {isSameDay(editingDate, new Date())
                ? 'How are you feeling today?'
                : `How were you feeling on ${format(editingDate, 'MMM d')}?`}
            </p>

            <div className="flex justify-center gap-4 flex-wrap">
              {moods.map((mood) => {
                const MoodIcon = mood.icon;
                return (
                  <motion.button
                    key={mood.level}
                    onClick={() => handleMoodSelect(mood)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-bg-tertiary border border-bg-primary transition-all ${mood.color}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title={mood.label}
                  >
                    <MoodIcon size={32} strokeWidth={1.5} />
                    <span className="text-xs font-medium text-text-secondary">
                      {mood.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <textarea
              rows="3"
              placeholder="Why are you feeling this way?"
              value={currentJournalEntry}
              onChange={(e) => setCurrentJournalEntry(e.target.value)}
              className="w-full mt-6 bg-bg-tertiary border border-bg-primary rounded-xl p-4 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-all resize-none text-sm"
            />

            <div className="text-center mt-6">
              <button
                onClick={handleRemoveMood}
                className="text-sm text-text-tertiary hover:text-red-500 transition-colors underline"
              >
                Remove Mood
              </button>
            </div>
          </motion.div>
        )}

        {view === 'confirm' && selectedMood && (
          // View B: Confirmation
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {/* Particle Effect */}
            <AnimatePresence>
              {showParticles && (
                <div>
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
                        background: selectedMood.particleColors[i % 3],
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
                    <Sparkles className={selectedMood.color} size={20} />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <div className="flex flex-col items-center gap-4">
              <motion.div
                className={`${selectedMood.color}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {(() => {
                  const MoodIcon = selectedMood.icon;
                  return <MoodIcon size={64} strokeWidth={1.5} />;
                })()}
              </motion.div>

              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary mb-2">
                  {selectedMood.label}
                </p>
                <p className="text-sm text-text-secondary">
                  {getMoodMessage(selectedMood.level)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'month' && renderMonthlyView()}
      </AnimatePresence>
    </div>
  );
};

export default MoodTracker;
