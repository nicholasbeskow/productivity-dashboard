import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, ChevronLeft, ChevronRight, Save, Edit2, ArrowLeft, Trash2, X, Sun, Sparkles, AlertTriangle } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, getDay, isSameDay, addMonths, subMonths, isSameMonth, subDays } from 'date-fns';
import backupManager from '../../utils/backupManager';

// Sleep quality definitions (colors match mood tracker)
const sleepQualities = [
  {
    level: 4,
    label: 'Excellent',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    glowColor: 'rgba(234, 179, 8, 0.5)', // matches mood "Great"
  },
  {
    level: 3,
    label: 'Good',
    color: 'text-green-glow',
    bgColor: 'bg-green-glow',
    glowColor: 'rgba(61, 214, 140, 0.5)', // matches mood "Good"
  },
  {
    level: 2,
    label: 'Fair',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    glowColor: 'rgba(249, 115, 22, 0.5)', // matches mood "Down"
  },
  {
    level: 1,
    label: 'Poor',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    glowColor: 'rgba(239, 68, 68, 0.5)', // matches mood "Rocky"
  }
];

// Sleep target hours (7-8 hours recommended)
const SLEEP_TARGET_MIN = 7;
const SLEEP_TARGET_MAX = 8;

const getQualityMessage = (level) => {
  switch (level) {
    case 4: return "Well rested! Great job!";
    case 3: return "Good sleep, keep it up!";
    case 2: return "Try to improve tonight.";
    case 1: return "Prioritize rest tonight.";
    default: return "";
  }
};

const SleepTracker = () => {
  const [view, setView] = useState('loading'); // 'loading', 'log', 'confirm', 'month', 'details'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingDate, setEditingDate] = useState(new Date());

  // Data State
  const [sleepLog, setSleepLog] = useState([]);

  // Form State
  const [selectedHours, setSelectedHours] = useState(7.5);
  const [napDuration, setNapDuration] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [sleepNotes, setSleepNotes] = useState('');
  const [showParticles, setShowParticles] = useState(false);

  // Calculate total sleep (night + nap)
  const totalSleep = selectedHours + napDuration;

  // Warning state
  const [sleepWarning, setSleepWarning] = useState(null);

  const getDateString = (date) => format(date, 'yyyy-MM-dd');

  // Load Data
  useEffect(() => {
    const loadData = () => {
      const storedSleep = JSON.parse(localStorage.getItem('sleepLog') || '[]');
      setSleepLog(storedSleep);

      const todayEntry = storedSleep.find(e => e.date === getDateString(new Date()));
      setView(todayEntry ? 'month' : 'log');

      // Check for sleep warnings
      checkSleepWarnings(storedSleep);
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  // Check for sleep pattern warnings
  const checkSleepWarnings = (log) => {
    if (log.length < 3) {
      setSleepWarning(null);
      return;
    }

    // Check last 3 nights
    const today = new Date();
    const last3Nights = [];
    for (let i = 1; i <= 3; i++) {
      const dateStr = getDateString(subDays(today, i));
      const entry = log.find(e => e.date === dateStr);
      if (entry) last3Nights.push(entry);
    }

    if (last3Nights.length >= 3) {
      // Use totalSleep if available (new format), otherwise fall back to hours (legacy)
      const avgSleep = last3Nights.reduce((acc, e) => acc + (e.totalSleep ?? e.hours), 0) / last3Nights.length;
      if (avgSleep < 6) {
        setSleepWarning({
          type: 'critical',
          message: `You've averaged ${avgSleep.toFixed(1)} hours for 3+ nights. This typically precedes overwhelmed days.`
        });
        return;
      }
    }

    // Check for declining quality
    if (last3Nights.length >= 3) {
      const avgQuality = last3Nights.reduce((acc, e) => acc + e.quality, 0) / last3Nights.length;
      if (avgQuality < 2) {
        setSleepWarning({
          type: 'warning',
          message: 'Your sleep quality has been declining. Consider adjusting your sleep routine.'
        });
        return;
      }
    }

    setSleepWarning(null);
  };

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

  const getSleepForDate = (date) => {
    const entry = sleepLog.find(e => e.date === getDateString(date));
    return entry || null;
  };

  // Get quality color for calendar indicator (matches mood tracker colors)
  const getQualityColor = (quality) => {
    switch (quality) {
      case 4: return 'bg-yellow-500';  // Excellent (matches mood "Great")
      case 3: return 'bg-green-glow';  // Good (matches mood "Good")
      case 2: return 'bg-orange-500';  // Fair (matches mood "Down")
      case 1: return 'bg-red-500';     // Poor (matches mood "Rocky")
      default: return 'bg-text-tertiary';
    }
  };

  // Get quality text color for moon icon
  const getQualityTextColor = (quality) => {
    switch (quality) {
      case 4: return 'text-yellow-500';   // Excellent
      case 3: return 'text-green-glow';   // Good
      case 2: return 'text-orange-500';   // Fair
      case 1: return 'text-red-500';      // Poor
      default: return 'text-purple-400';
    }
  };

  // Core Logic
  const handleDayClick = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) return;

    setEditingDate(date);
    const sleepEntry = getSleepForDate(date);

    if (sleepEntry) {
      // Support both new format (nightSleep) and legacy format (hours)
      setSelectedHours(sleepEntry.nightSleep ?? sleepEntry.hours);
      setNapDuration(sleepEntry.napDuration ?? 0);
      setSelectedQuality(sleepQualities.find(q => q.level === sleepEntry.quality));
      setSleepNotes(sleepEntry.notes || '');
      setView('details');
    } else {
      setSelectedHours(7.5);
      setNapDuration(0);
      setSelectedQuality(null);
      setSleepNotes('');
      setView('log');
    }
  };

  const handleSaveEntry = () => {
    if (!selectedQuality) return;

    const dateStr = getDateString(editingDate);
    const calculatedTotal = selectedHours + napDuration;

    // Update Sleep Log with new data structure
    const newSleepLog = sleepLog.filter(e => e.date !== dateStr);
    newSleepLog.push({
      date: dateStr,
      nightSleep: selectedHours,
      napDuration: napDuration,
      totalSleep: calculatedTotal,
      hours: calculatedTotal, // Keep for backwards compatibility
      quality: selectedQuality.level,
      notes: sleepNotes.trim(),
      loggedAt: new Date().toISOString()
    });
    setSleepLog(newSleepLog);
    localStorage.setItem('sleepLog', JSON.stringify(newSleepLog));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('sleepDataUpdated'));

    backupManager.saveAutoBackup();
    setView('confirm');

    // Check for warnings after save
    checkSleepWarnings(newSleepLog);

    setTimeout(() => setView('month'), 2000);
  };

  const handleDeleteEntry = () => {
    if (!window.confirm('Delete this sleep entry?')) return;

    const dateStr = getDateString(editingDate);
    const newSleepLog = sleepLog.filter(e => e.date !== dateStr);

    setSleepLog(newSleepLog);
    localStorage.setItem('sleepLog', JSON.stringify(newSleepLog));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('sleepDataUpdated'));

    backupManager.saveAutoBackup();

    setView('month');
  };

  // Calculate sleep debt using cumulative approach (7 days including today)
  const calculateSleepDebt = () => {
    const today = new Date();
    const last7DaysData = [];

    // Get sleep data for last 7 days (including today), in chronological order
    for (let i = 6; i >= 0; i--) {
      const dateStr = getDateString(subDays(today, i));
      const entry = sleepLog.find(e => e.date === dateStr);
      if (entry) {
        last7DaysData.push({
          date: dateStr,
          sleep: entry.totalSleep ?? entry.hours
        });
      }
    }

    if (last7DaysData.length === 0) return null;

    const TARGET_SLEEP = 7.5; // Sleep target in hours
    let cumulativeDebt = 0;

    // Calculate cumulative debt chronologically
    last7DaysData.forEach(day => {
      if (day.sleep < TARGET_SLEEP) {
        // Deficit: add to debt
        cumulativeDebt += (TARGET_SLEEP - day.sleep);
      } else {
        // Surplus: reduce debt (but don't go below 0)
        const surplus = day.sleep - TARGET_SLEEP;
        cumulativeDebt = Math.max(0, cumulativeDebt - surplus);
      }
    });

    const totalSleepHours = last7DaysData.reduce((sum, day) => sum + day.sleep, 0);
    const avgSleep = totalSleepHours / last7DaysData.length;

    return {
      avgSleep: avgSleep.toFixed(1),
      debt: cumulativeDebt.toFixed(1), // Always >= 0
      hasSurplus: false, // Debt can never be negative
      daysTracked: last7DaysData.length,
      targetPerNight: TARGET_SLEEP
    };
  };

  const sleepDebt = calculateSleepDebt();

  // --- RENDER HELPERS ---

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const startDay = getDay(startOfMonth(currentMonth));
    const days = [];

    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="h-12" />);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const sleepEntry = getSleepForDate(date);
      const isToday = isSameDay(date, new Date());
      const isFuture = date > new Date().setHours(0, 0, 0, 0);

      days.push(
        <motion.button
          key={day}
          onClick={() => handleDayClick(date)}
          disabled={isFuture}
          className={`h-12 flex flex-col items-center justify-center rounded-xl transition-all relative focus:outline-none focus-visible:outline-none outline-none border-0 group ${
            isFuture ? 'opacity-30 cursor-not-allowed bg-zinc-800/30' :
            sleepEntry ? 'liquid-bubble-filled' :
            isToday ? 'liquid-bubble-today' : 'liquid-bubble-empty hover:liquid-bubble-hover'
          }`}
          style={{ border: 'none', outline: 'none' }}
          whileHover={!isFuture ? { scale: 1.05, y: -1 } : {}}
          whileTap={!isFuture ? { scale: 0.95 } : {}}
        >
          {sleepEntry ? (
            <span className={`text-sm ${getQualityTextColor(sleepEntry.quality)} font-medium`}>
              {(sleepEntry.totalSleep ?? sleepEntry.hours)}h
            </span>
          ) : (
            <span className="text-zinc-500 text-sm font-medium">{day}</span>
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
          {view === 'month' && 'Sleep Calendar'}
          {view === 'log' && 'Log Sleep'}
          {view === 'details' && 'Sleep Details'}
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

      {/* Sleep Warning Banner */}
      {sleepWarning && view === 'month' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
            sleepWarning.type === 'critical'
              ? 'bg-red-500/10 border border-red-500/30'
              : 'bg-orange-500/10 border border-orange-500/30'
          }`}
        >
          <AlertTriangle
            size={18}
            className={sleepWarning.type === 'critical' ? 'text-red-500 mt-0.5' : 'text-orange-500 mt-0.5'}
          />
          <p className={`text-sm ${sleepWarning.type === 'critical' ? 'text-red-400' : 'text-orange-400'}`}>
            {sleepWarning.message}
          </p>
        </motion.div>
      )}

      {/* Sleep Debt Summary */}
      {sleepDebt && view === 'month' && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="liquid-bubble-filled rounded-lg p-3">
            <p className="text-xs text-white/50 mb-1">7-Day Average</p>
            <p className="text-lg font-bold text-purple-400">{sleepDebt.avgSleep}h</p>
            <p className="text-[10px] text-white/40">{sleepDebt.daysTracked} days tracked</p>
          </div>
          <div className="liquid-bubble-filled rounded-lg p-3">
            <p className="text-xs text-white/50 mb-1">Weekly Sleep Debt</p>
            <p className={`text-lg font-bold ${
              parseFloat(sleepDebt.debt) === 0 ? 'text-green-glow' :
              parseFloat(sleepDebt.debt) > 5 ? 'text-red-500' :
              'text-orange-500'
            }`}>
              {sleepDebt.debt}h
            </p>
            <p className="text-[10px] text-white/40">vs {sleepDebt.targetPerNight}h/night target</p>
          </div>
        </div>
      )}

      {/* --- VIEWS --- */}
      <AnimatePresence mode="wait">

        {/* 1. CALENDAR VIEW */}
        {view === 'month' && (
          <motion.div
            key="month"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1"
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
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-xs text-text-tertiary h-8 flex items-center justify-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
          </motion.div>
        )}

        {/* 2. LOG VIEW */}
        {view === 'log' && (
          <motion.div
            key="log"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <div className="text-center mb-6">
              <p className="text-white/70">
                {isSameDay(editingDate, new Date())
                  ? 'How did you sleep last night?'
                  : `How did you sleep on ${format(editingDate, 'MMM d')}?`}
              </p>
            </div>

            {/* Night Sleep Slider */}
            <div className="mb-4">
              <label className="block text-sm text-white/70 mb-3">
                Night Sleep: <span className="text-purple-400 font-bold">{selectedHours}h</span>
              </label>
              <div className="liquid-bubble-filled rounded-xl p-4">
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={selectedHours}
                  onChange={(e) => setSelectedHours(parseFloat(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(168, 85, 247, 0.6) 0%, rgba(168, 85, 247, 0.8) ${(selectedHours / 12) * 100}%, rgba(255, 255, 255, 0.1) ${(selectedHours / 12) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                    WebkitAppearance: 'none',
                  }}
                />
                <style>{`
                  input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(168, 85, 247, 0.9), rgba(124, 58, 237, 1));
                    cursor: pointer;
                    box-shadow: 0 0 12px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    transition: all 0.2s ease;
                  }
                  input[type="range"]::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 0 16px rgba(168, 85, 247, 0.7), 0 0 28px rgba(168, 85, 247, 0.4);
                  }
                  input[type="range"]::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(168, 85, 247, 0.9), rgba(124, 58, 237, 1));
                    cursor: pointer;
                    box-shadow: 0 0 12px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    transition: all 0.2s ease;
                  }
                  input[type="range"]::-moz-range-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 0 16px rgba(168, 85, 247, 0.7), 0 0 28px rgba(168, 85, 247, 0.4);
                  }
                `}</style>
                <div className="flex justify-between text-xs text-white/40 mt-2">
                  <span>0h</span>
                  <span className="text-purple-400 font-semibold">7-8h (ideal)</span>
                  <span>12h</span>
                </div>
              </div>
            </div>

            {/* Nap Duration */}
            <div className="mb-6">
              <label className="block text-sm text-white/70 mb-2">
                Nap Duration <span className="text-white/40">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={napDuration || ''}
                  onChange={(e) => setNapDuration(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-20 liquid-bubble-filled rounded-lg px-3 py-2 text-white placeholder-white/30 focus:border-purple-500/50 focus:outline-none transition-colors text-center"
                />
                <span className="text-sm text-white/70">hours</span>
                {napDuration > 0 && (
                  <span className="text-xs text-purple-400 ml-auto">
                    Total: {totalSleep}h
                  </span>
                )}
              </div>
            </div>

            {/* Quality Selection */}
            <div className="mb-6">
              <label className="block text-sm text-white/70 mb-3">Sleep Quality</label>
              <div className="flex justify-center gap-2">
                {sleepQualities.map((quality) => {
                  const isSelected = selectedQuality?.level === quality.level;
                  return (
                    <motion.button
                      key={quality.level}
                      onClick={() => setSelectedQuality(quality)}
                      className={`px-4 py-2 rounded-xl transition-all ${
                        isSelected
                          ? `${quality.color} liquid-bubble-filled`
                          : 'liquid-bubble-empty text-white/60 hover:liquid-bubble-hover hover:text-white/80'
                      }`}
                      style={{
                        boxShadow: isSelected ? `0 0 8px ${quality.glowColor}` : 'none'
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="text-sm font-medium">{quality.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Notes Input */}
            <div className="flex-1">
              <label className="block text-sm text-white/70 mb-2">Notes (Optional)</label>
              <textarea
                value={sleepNotes}
                onChange={(e) => setSleepNotes(e.target.value)}
                placeholder="e.g., woke up multiple times, had vivid dreams..."
                className="w-full h-24 liquid-bubble-filled rounded-xl p-4 text-white placeholder-white/30 focus:border-purple-500/50 focus:outline-none resize-none transition-colors"
              />
            </div>

            {/* Save Button */}
            <div className="mt-6">
              <button
                onClick={handleSaveEntry}
                disabled={!selectedQuality}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  selectedQuality
                    ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg'
                    : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                }`}
              >
                <Save size={18} />
                Log Sleep
              </button>
            </div>
          </motion.div>
        )}

        {/* 3. DETAILS VIEW */}
        {view === 'details' && selectedQuality && (
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

            {/* Sleep Card */}
            <div className="liquid-bubble-filled rounded-2xl p-6 text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Moon size={48} className="text-purple-400" />
                <Sun size={32} className="text-yellow-500" />
              </div>
              <h2 className="text-3xl font-bold text-purple-400 mb-1">{totalSleep} hours</h2>
              {napDuration > 0 && (
                <p className="text-xs text-white/60 mb-2">
                  {selectedHours}h night + {napDuration}h nap
                </p>
              )}
              <p className={`text-lg font-semibold ${selectedQuality.color}`}>{selectedQuality.label}</p>
              <p className="text-white/70 mt-2 text-sm">{getQualityMessage(selectedQuality.level)}</p>
            </div>

            {/* Notes Card */}
            {sleepNotes && (
              <div className="liquid-bubble-filled rounded-2xl p-6 flex-1">
                <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3">Notes</h4>
                <p className="text-white whitespace-pre-wrap leading-relaxed">
                  {sleepNotes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setView('log')}
                className="flex-1 py-3 liquid-bubble-filled rounded-xl text-white font-medium hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
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
        {view === 'confirm' && selectedQuality && (
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
                    style={{ backgroundColor: i % 2 === 0 ? '#a855f7' : '#c084fc' }}
                  />
                ))}
              </div>
            )}
            <Moon size={64} className="text-purple-400 mb-4" />
            <Sparkles size={32} className="text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-white">Sleep Logged!</h2>
            <p className="text-white/70 mt-2">
              {totalSleep}h{napDuration > 0 && ` (${selectedHours}h + ${napDuration}h nap)`} • {selectedQuality.label}
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default SleepTracker;
