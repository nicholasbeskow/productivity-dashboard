import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laugh, Smile, Meh, Frown, CloudRain, Sparkles, ChevronLeft, ChevronRight, Edit2, ArrowLeft, Save, Trash2, X } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, getDay, isSameDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import backupManager from '../../utils/backupManager';

// Mood definitions
const moods = [
  {
    level: 5,
    label: 'Great',
    icon: Laugh,
    color: 'text-yellow-500',
    glowColor: 'rgba(234, 179, 8, 0.5)', // yellow-500 with opacity
    particleColors: ['#eab308', '#fbbf24', '#facc15']
  },
  {
    level: 4,
    label: 'Good',
    icon: Smile,
    color: 'text-green-glow',
    glowColor: 'rgba(61, 214, 140, 0.5)', // green-glow with opacity
    particleColors: ['#3dd68c', '#2aba73', '#4fe39f']
  },
  {
    level: 3,
    label: 'Okay',
    icon: Meh,
    color: 'text-blue-400',
    glowColor: 'rgba(96, 165, 250, 0.5)', // blue-400 with opacity
    particleColors: ['#60a5fa', '#3b82f6', '#93c5fd']
  },
  {
    level: 2,
    label: 'Down',
    icon: Frown,
    color: 'text-orange-500',
    glowColor: 'rgba(249, 115, 22, 0.5)', // orange-500 with opacity
    particleColors: ['#f97316', '#fb923c', '#fdba74']
  },
  {
    level: 1,
    label: 'Rocky',
    icon: CloudRain,
    color: 'text-red-500',
    glowColor: 'rgba(239, 68, 68, 0.5)', // red-500 with opacity
    particleColors: ['#ef4444', '#dc2626', '#f87171']
  }
];

const getMoodMessage = (level) => {
  switch (level) {
    case 5: return "Keep rocking your day!";
    case 4: return "Looking good!";
    case 3: return "One step at a time.";
    case 2: return "It's okay to have tough days.";
    case 1: return "Hang in there. Tomorrow is a new day.";
    default: return "";
  }
};

const MoodTracker = () => {
  const [view, setView] = useState('loading'); // 'loading', 'select', 'confirm', 'month', 'details'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingDate, setEditingDate] = useState(new Date());

  // Data State
  const [moodLog, setMoodLog] = useState([]);
  const [journalLog, setJournalLog] = useState([]);
  const [sleepLog, setSleepLog] = useState([]);

  // Editing State
  const [selectedMood, setSelectedMood] = useState(null);
  const [currentJournalEntry, setCurrentJournalEntry] = useState('');
  const [showParticles, setShowParticles] = useState(false);

  const getDateString = (date) => format(date, 'yyyy-MM-dd');

  // Load Data
  useEffect(() => {
    const loadData = () => {
      const storedMoods = JSON.parse(localStorage.getItem('moodLog') || '[]');
      const storedJournal = JSON.parse(localStorage.getItem('journalLog') || '[]');
      const storedSleep = JSON.parse(localStorage.getItem('sleepLog') || '[]');
      setMoodLog(storedMoods);
      setJournalLog(storedJournal);
      setSleepLog(storedSleep);

      const todayEntry = storedMoods.find(e => e.date === getDateString(new Date()));
      // Start in month view by default unless you want to force entry
      setView(todayEntry ? 'month' : 'select');
    };

    loadData();
    window.addEventListener('storage', loadData);
    window.addEventListener('sleepDataUpdated', loadData);
    window.addEventListener('moodDataUpdated', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
      window.removeEventListener('sleepDataUpdated', loadData);
      window.removeEventListener('moodDataUpdated', loadData);
    };
  }, []);

  // Particle Effect
  useEffect(() => {
    if (view === 'confirm') {
      setShowParticles(true);
      const timer = setTimeout(() => setShowParticles(false), 600);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // Navigation Handlers
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getMoodForDate = (date) => {
    const entry = moodLog.find(e => e.date === getDateString(date));
    return entry ? moods.find(m => m.level === entry.level) : null;
  };

  const getJournalForDate = (date) => {
    const entry = journalLog.find(e => e.date === getDateString(date));
    return entry ? entry.text : '';
  };

  const getSleepForDate = (date) => {
    const entry = sleepLog.find(e => e.date === getDateString(date));
    return entry || null;
  };

  // Get sleep quality color for indicator
  const getSleepQualityColor = (quality) => {
    switch (quality) {
      case 4: return 'bg-green-glow';
      case 3: return 'bg-yellow-500';
      case 2: return 'bg-orange-500';
      case 1: return 'bg-red-500';
      default: return 'bg-text-tertiary';
    }
  };

  // Core Logic
  const handleDayClick = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) return;

    setEditingDate(date);
    const mood = getMoodForDate(date);
    const journal = getJournalForDate(date);

    setSelectedMood(mood);
    setCurrentJournalEntry(journal);

    // If data exists, go to Details view. Else, go to Edit view.
    if (mood) {
      setView('details');
    } else {
      setView('select');
    }
  };

  const handleSaveEntry = () => {
    if (!selectedMood) return;

    const dateStr = getDateString(editingDate);

    // Update Moods
    const newMoodLog = moodLog.filter(e => e.date !== dateStr);
    newMoodLog.push({ date: dateStr, level: selectedMood.level });
    setMoodLog(newMoodLog);
    localStorage.setItem('moodLog', JSON.stringify(newMoodLog));

    // Update Journal
    const newJournalLog = journalLog.filter(e => e.date !== dateStr);
    if (currentJournalEntry.trim()) {
      newJournalLog.push({ date: dateStr, text: currentJournalEntry.trim() });
    }
    setJournalLog(newJournalLog);
    localStorage.setItem('journalLog', JSON.stringify(newJournalLog));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('moodDataUpdated'));

    backupManager.saveAutoBackup();
    setView('confirm');

    setTimeout(() => setView('month'), 2000);
  };

  const handleDeleteEntry = () => {
    if (!window.confirm('Delete this entry?')) return;

    const dateStr = getDateString(editingDate);
    const newMoodLog = moodLog.filter(e => e.date !== dateStr);
    const newJournalLog = journalLog.filter(e => e.date !== dateStr);

    setMoodLog(newMoodLog);
    setJournalLog(newJournalLog);

    localStorage.setItem('moodLog', JSON.stringify(newMoodLog));
    localStorage.setItem('journalLog', JSON.stringify(newJournalLog));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('moodDataUpdated'));

    backupManager.saveAutoBackup();

    setView('month');
  };

  // --- RENDER HELPERS ---

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const startDay = getDay(startOfMonth(currentMonth));
    const days = [];

    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="h-12" />);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const mood = getMoodForDate(date);
      const sleepEntry = getSleepForDate(date);
      const isToday = isSameDay(date, new Date());
      const isFuture = date > new Date().setHours(0,0,0,0);

      days.push(
        <motion.button
          key={day}
          onClick={() => handleDayClick(date)}
          disabled={isFuture}
          className={`h-12 flex items-center justify-center rounded-xl transition-all relative focus:outline-none focus-visible:outline-none group ${
            isFuture ? 'opacity-30 cursor-not-allowed bg-zinc-800/30' :
            mood ? 'liquid-bubble-filled' :
            isToday ? 'liquid-bubble-today' : 'liquid-bubble-empty hover:liquid-bubble-hover'
          }`}
          whileHover={!isFuture ? { scale: 1.05, y: -1 } : {}}
          whileTap={!isFuture ? { scale: 0.95 } : {}}
        >
          {mood ? (
            <>
              <mood.icon size={24} className={`${mood.color} transition-opacity duration-200 ${sleepEntry ? 'group-hover:opacity-0' : ''}`} strokeWidth={2} />
              {sleepEntry && (
                <span className="absolute text-sm text-purple-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {sleepEntry.hours}h
                </span>
              )}
            </>
          ) : (
            <span className="text-zinc-500 text-sm font-medium">{day}</span>
          )}
          {/* Journal Indicator Dot */}
          {getJournalForDate(date) && (
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-text-tertiary" />
          )}
        </motion.button>
      );
    }
    return days;
  };

  return (
    <div className="glass-panel rounded-xl p-6 border border-white/10 h-full flex flex-col">

      {/* --- HEADER --- */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">
          {view === 'month' && 'Mood Calendar'}
          {view === 'select' && 'Log Mood'}
          {view === 'details' && 'Entry Details'}
        </h3>
        {view !== 'month' && view !== 'confirm' && (
          <button
            onClick={() => setView('month')}
            className="text-text-tertiary hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* --- VIEWS --- */}
      <AnimatePresence mode="wait">

        {/* 1. CALENDAR VIEW */}
        {view === 'month' && (
          <motion.div
            key="month"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="font-semibold text-white">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={handleNextMonth}
                disabled={isSameMonth(currentMonth, new Date())}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-center text-xs text-text-tertiary h-8 flex items-center justify-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 mb-4">{renderCalendar()}</div>

            {/* Mood Statistics */}
            {(() => {
              // Calculate 7-day average mood
              const today = new Date();
              const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                return getDateString(date);
              });

              const last7Moods = moodLog.filter(entry => last7Days.includes(entry.date));
              const avgMood = last7Moods.length > 0
                ? (last7Moods.reduce((sum, entry) => sum + entry.level, 0) / last7Moods.length).toFixed(1)
                : null;

              // Calculate mood-sleep correlation
              const moodSleepPairs = moodLog
                .map(moodEntry => {
                  const sleepEntry = sleepLog.find(s => s.date === moodEntry.date);
                  return sleepEntry ? { mood: moodEntry.level, sleep: sleepEntry.totalSleep ?? sleepEntry.hours } : null;
                })
                .filter(Boolean);

              let correlation = null;
              if (moodSleepPairs.length >= 3) {
                const avgMoodVal = moodSleepPairs.reduce((sum, p) => sum + p.mood, 0) / moodSleepPairs.length;
                const avgSleepVal = moodSleepPairs.reduce((sum, p) => sum + p.sleep, 0) / moodSleepPairs.length;

                const numerator = moodSleepPairs.reduce((sum, p) => sum + (p.mood - avgMoodVal) * (p.sleep - avgSleepVal), 0);
                const denomMood = Math.sqrt(moodSleepPairs.reduce((sum, p) => sum + Math.pow(p.mood - avgMoodVal, 2), 0));
                const denomSleep = Math.sqrt(moodSleepPairs.reduce((sum, p) => sum + Math.pow(p.sleep - avgSleepVal, 2), 0));

                if (denomMood !== 0 && denomSleep !== 0) {
                  correlation = (numerator / (denomMood * denomSleep)).toFixed(2);
                }
              }

              const getMoodLabel = (avgMood) => {
                const moodVal = parseFloat(avgMood);
                if (moodVal >= 4.5) return 'Great';
                if (moodVal >= 3.5) return 'Good';
                if (moodVal >= 2.5) return 'Okay';
                if (moodVal >= 1.5) return 'Down';
                return 'Rocky';
              };

              const getMoodColor = (avgMood) => {
                const moodVal = parseFloat(avgMood);
                if (moodVal >= 4.5) return 'text-yellow-500';
                if (moodVal >= 3.5) return 'text-green-glow';
                if (moodVal >= 2.5) return 'text-blue-400';
                if (moodVal >= 1.5) return 'text-orange-500';
                return 'text-red-500';
              };

              return (
                <div className="grid grid-cols-2 gap-3">
                  <div className="liquid-bubble-filled rounded-lg p-3">
                    <p className="text-xs text-white/50 mb-1">7-Day Average</p>
                    {avgMood ? (
                      <>
                        <p className={`text-lg font-bold ${getMoodColor(avgMood)}`}>
                          {getMoodLabel(avgMood)} ({avgMood})
                        </p>
                        <p className="text-[10px] text-white/40">{last7Moods.length} days tracked</p>
                      </>
                    ) : (
                      <p className="text-sm text-white/40">No data yet</p>
                    )}
                  </div>
                  <div className="liquid-bubble-filled rounded-lg p-3">
                    <p className="text-xs text-white/50 mb-1">Mood-Sleep Link</p>
                    {correlation !== null ? (
                      <>
                        <p className={`text-lg font-bold ${
                          parseFloat(correlation) >= 0.5 ? 'text-green-glow' :
                          parseFloat(correlation) >= 0.3 ? 'text-yellow-500' :
                          parseFloat(correlation) >= 0 ? 'text-blue-400' :
                          parseFloat(correlation) >= -0.3 ? 'text-orange-500' : 'text-red-500'
                        }`}>
                          {parseFloat(correlation) >= 0 ? '+' : ''}{correlation}
                        </p>
                        <p className="text-[10px] text-white/40">
                          {parseFloat(correlation) >= 0.5 ? 'Strong positive' :
                           parseFloat(correlation) >= 0.3 ? 'Moderate positive' :
                           parseFloat(correlation) >= 0 ? 'Weak positive' :
                           parseFloat(correlation) >= -0.3 ? 'Weak negative' : 'Moderate negative'}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-white/40">Need 3+ days</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* 2. SELECT / EDIT VIEW */}
        {view === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <div className="text-center mb-6">
              <p className="text-white/70">
                {isSameDay(editingDate, new Date()) ? 'How are you today?' : `How were you on ${format(editingDate, 'MMM d')}?`}
              </p>
            </div>

            {/* Mood Grid */}
            <div className="flex justify-center gap-3 mb-8">
              {moods.map((mood) => {
                const isSelected = selectedMood?.level === mood.level;
                return (
                  <motion.button
                    key={mood.level}
                    onClick={() => setSelectedMood(mood)}
                    className={`p-3 rounded-2xl transition-all ${
                      isSelected
                        ? `${mood.color} liquid-bubble-filled`
                        : 'liquid-bubble-empty text-white/60 hover:liquid-bubble-hover hover:text-white/80'
                    }`}
                    style={{
                      boxShadow: isSelected ? `0 0 8px ${mood.glowColor}` : 'none'
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <mood.icon size={32} strokeWidth={isSelected ? 2.5 : 1.5} />
                  </motion.button>
                );
              })}
            </div>

            {/* Journal Input */}
            <div className="flex-1">
              <label className="block text-sm text-white/70 mb-2">Daily Note</label>
              <textarea
                value={currentJournalEntry}
                onChange={(e) => setCurrentJournalEntry(e.target.value)}
                placeholder="What's on your mind? (Optional)"
                className="w-full h-32 liquid-bubble-filled rounded-xl p-4 text-white placeholder-white/30 focus:border-yellow-500/50 focus:outline-none resize-none transition-colors"
              />
            </div>

            {/* Save Button */}
            <div className="mt-6">
              <button
                onClick={handleSaveEntry}
                disabled={!selectedMood}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  selectedMood
                    ? 'bg-green-glow text-bg-primary hover:shadow-glow shadow-lg'
                    : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                }`}
              >
                <Save size={18} />
                Log Mood
              </button>
            </div>
          </motion.div>
        )}

        {/* 3. DETAILS VIEW (Reading Mode) */}
        {view === 'details' && selectedMood && (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-6 text-text-tertiary text-sm">
              <button onClick={() => setView('month')} className="hover:text-white flex items-center gap-1">
                <ArrowLeft size={16} /> Back
              </button>
              <span>•</span>
              <span>{format(editingDate, 'EEEE, MMMM do')}</span>
            </div>

            {/* Mood Card */}
            <div className="liquid-bubble-filled rounded-2xl p-6 text-center mb-6">
              <selectedMood.icon size={64} className={`mx-auto mb-4 ${selectedMood.color}`} strokeWidth={1.5} />
              <h2 className={`text-2xl font-bold ${selectedMood.color}`}>{selectedMood.label}</h2>
              <p className="text-white/70 mt-2 text-sm">{getMoodMessage(selectedMood.level)}</p>
            </div>

            {/* Journal Card */}
            {currentJournalEntry && (
              <div className="liquid-bubble-filled rounded-2xl p-6 flex-1">
                <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3">Journal</h4>
                <p className="text-white whitespace-pre-wrap leading-relaxed">
                  {currentJournalEntry}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setView('select')}
                className="flex-1 py-3 liquid-bubble-filled rounded-xl text-white font-medium hover:text-green-glow transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 size={16} /> Edit
              </button>
              <button
                onClick={handleDeleteEntry}
                className="px-4 py-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* 4. CONFIRMATION VIEW */}
        {view === 'confirm' && selectedMood && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center"
          >
            {showParticles && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                    animate={{
                      x: (Math.random() - 0.5) * 200,
                      y: (Math.random() - 0.5) * 200,
                      opacity: 0,
                      scale: 1
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: selectedMood.particleColors[i % 3] }}
                  />
                ))}
              </div>
            )}
            <selectedMood.icon size={80} className={selectedMood.color} />
            <h2 className="text-2xl font-bold text-white mt-6">Entry Saved!</h2>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default MoodTracker;
