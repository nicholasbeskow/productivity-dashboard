import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Moon, TrendingUp, TrendingDown, AlertTriangle, Trophy, Target, Zap } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js';
import { subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

// Sleep target hours
const SLEEP_TARGET = 7.5;

const SleepAnalytics = () => {
  const [sleepLog, setSleepLog] = useState([]);
  const [moodLog, setMoodLog] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [timePeriod, setTimePeriod] = useState('Week');

  // Load data
  useEffect(() => {
    const loadData = () => {
      setSleepLog(JSON.parse(localStorage.getItem('sleepLog') || '[]'));
      setMoodLog(JSON.parse(localStorage.getItem('moodLog') || '[]'));
      setCompletedTasks(JSON.parse(localStorage.getItem('completedTasks') || '[]'));
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  // Mood labels for reference
  const moodLabels = {
    5: 'Great',
    4: 'Good',
    3: 'Okay',
    2: 'Down',
    1: 'Rocky'
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (sleepLog.length === 0) return null;

    const today = new Date();
    let startDate = new Date();
    let daysToAnalyze = 7;

    switch (timePeriod) {
      case 'Week':
        startDate = subDays(today, 7);
        daysToAnalyze = 7;
        break;
      case 'Month':
        startDate = subDays(today, 30);
        daysToAnalyze = 30;
        break;
      case 'All Time':
        startDate = new Date(0);
        daysToAnalyze = sleepLog.length;
        break;
      default:
        break;
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const filteredSleep = sleepLog.filter(e => e.date >= startDateStr);

    if (filteredSleep.length === 0) return null;

    // Calculate averages
    const totalHours = filteredSleep.reduce((acc, e) => acc + e.hours, 0);
    const avgHours = totalHours / filteredSleep.length;

    const totalQuality = filteredSleep.reduce((acc, e) => acc + e.quality, 0);
    const avgQuality = totalQuality / filteredSleep.length;

    // Calculate sleep debt
    const targetTotal = filteredSleep.length * SLEEP_TARGET;
    const sleepDebt = Math.max(0, targetTotal - totalHours);

    // Best and worst weeks
    const weeklyAverages = {};
    filteredSleep.forEach(entry => {
      const weekStart = format(startOfWeek(new Date(entry.date)), 'yyyy-MM-dd');
      if (!weeklyAverages[weekStart]) {
        weeklyAverages[weekStart] = { hours: [], quality: [] };
      }
      weeklyAverages[weekStart].hours.push(entry.hours);
      weeklyAverages[weekStart].quality.push(entry.quality);
    });

    let bestWeek = null;
    let worstWeek = null;
    let bestAvg = 0;
    let worstAvg = Infinity;

    Object.entries(weeklyAverages).forEach(([week, data]) => {
      const avg = data.hours.reduce((a, b) => a + b, 0) / data.hours.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestWeek = week;
      }
      if (avg < worstAvg) {
        worstAvg = avg;
        worstWeek = week;
      }
    });

    // Calculate streak (consecutive days meeting target)
    let currentStreak = 0;
    const sortedSleep = [...filteredSleep].sort((a, b) => b.date.localeCompare(a.date));
    for (const entry of sortedSleep) {
      if (entry.hours >= 7) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      avgHours: avgHours.toFixed(1),
      avgQuality: avgQuality.toFixed(1),
      sleepDebt: sleepDebt.toFixed(1),
      daysTracked: filteredSleep.length,
      currentStreak,
      bestWeek: bestWeek ? format(new Date(bestWeek), 'MMM d') : null,
      bestWeekAvg: bestAvg.toFixed(1),
      worstWeek: worstWeek ? format(new Date(worstWeek), 'MMM d') : null,
      worstWeekAvg: worstAvg.toFixed(1)
    };
  }, [sleepLog, timePeriod]);

  // Sleep-Mood Correlation
  const correlation = useMemo(() => {
    if (sleepLog.length === 0 || moodLog.length === 0) {
      return { text: 'Not enough data', avgHappySleep: null, avgStressedSleep: null };
    }

    // Create a date map for mood entries
    const moodByDate = {};
    moodLog.forEach(entry => {
      moodByDate[entry.date] = entry.level;
    });

    // Calculate average sleep for different mood levels
    const happyDaysSleep = [];  // mood 4-5
    const stressedDaysSleep = []; // mood 1-2

    sleepLog.forEach(sleepEntry => {
      const mood = moodByDate[sleepEntry.date];
      if (mood !== undefined) {
        if (mood >= 4) {
          happyDaysSleep.push(sleepEntry.hours);
        } else if (mood <= 2) {
          stressedDaysSleep.push(sleepEntry.hours);
        }
      }
    });

    if (happyDaysSleep.length === 0 || stressedDaysSleep.length === 0) {
      return { text: 'Log more mood entries for correlation', avgHappySleep: null, avgStressedSleep: null };
    }

    const avgHappySleep = happyDaysSleep.reduce((a, b) => a + b, 0) / happyDaysSleep.length;
    const avgStressedSleep = stressedDaysSleep.reduce((a, b) => a + b, 0) / stressedDaysSleep.length;

    return {
      text: `On happy days: ${avgHappySleep.toFixed(1)}h avg vs stressed days: ${avgStressedSleep.toFixed(1)}h avg`,
      avgHappySleep: avgHappySleep.toFixed(1),
      avgStressedSleep: avgStressedSleep.toFixed(1),
      difference: (avgHappySleep - avgStressedSleep).toFixed(1)
    };
  }, [sleepLog, moodLog]);

  // Sleep-Productivity Correlation
  const productivityCorrelation = useMemo(() => {
    if (sleepLog.length === 0 || completedTasks.length === 0) {
      return { text: 'Not enough data' };
    }

    // Group completed tasks by date
    const tasksByDate = {};
    completedTasks.forEach(task => {
      const date = task.completedAt?.split('T')[0];
      if (date) {
        tasksByDate[date] = (tasksByDate[date] || 0) + 1;
      }
    });

    // Find sleep entries with corresponding productivity data
    const wellRestedDays = []; // 7+ hours
    const tiredDays = []; // <6 hours

    sleepLog.forEach(sleepEntry => {
      const tasksCompleted = tasksByDate[sleepEntry.date] || 0;
      if (sleepEntry.hours >= 7) {
        wellRestedDays.push(tasksCompleted);
      } else if (sleepEntry.hours < 6) {
        tiredDays.push(tasksCompleted);
      }
    });

    if (wellRestedDays.length === 0 || tiredDays.length === 0) {
      return { text: 'Need more variety in sleep data' };
    }

    const avgWellRested = wellRestedDays.reduce((a, b) => a + b, 0) / wellRestedDays.length;
    const avgTired = tiredDays.reduce((a, b) => a + b, 0) / tiredDays.length;

    return {
      text: `Well-rested: ${avgWellRested.toFixed(1)} tasks/day vs tired: ${avgTired.toFixed(1)} tasks/day`,
      avgWellRested: avgWellRested.toFixed(1),
      avgTired: avgTired.toFixed(1),
      difference: ((avgWellRested / Math.max(avgTired, 0.1)) * 100 - 100).toFixed(0)
    };
  }, [sleepLog, completedTasks]);

  // Chart data
  const getChartData = () => {
    const today = new Date();
    let dates = [];
    let labels = [];

    if (timePeriod === 'Week') {
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        dates.push(format(date, 'yyyy-MM-dd'));
        labels.push(format(date, 'EEE'));
      }
    } else if (timePeriod === 'Month') {
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        dates.push(format(date, 'yyyy-MM-dd'));
        const day = date.getDate();
        labels.push([1, 5, 10, 15, 20, 25, 30].includes(day) ? day.toString() : '');
      }
    } else {
      // All Time - show all dates
      const sortedDates = [...sleepLog].sort((a, b) => a.date.localeCompare(b.date));
      dates = sortedDates.map(e => e.date);
      labels = dates.map((d, i) => i % Math.ceil(dates.length / 10) === 0 ? format(new Date(d), 'M/d') : '');
    }

    // Create a map for quick lookup
    const sleepByDate = {};
    sleepLog.forEach(e => {
      sleepByDate[e.date] = e;
    });

    const moodByDate = {};
    moodLog.forEach(e => {
      moodByDate[e.date] = e.level;
    });

    const hoursData = dates.map(date => sleepByDate[date]?.hours || null);
    const qualityData = dates.map(date => sleepByDate[date]?.quality || null);
    const moodData = dates.map(date => moodByDate[date] || null);

    return {
      labels,
      datasets: [
        {
          label: 'Sleep Hours',
          data: hoursData,
          borderColor: '#a855f7',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#a855f7',
          spanGaps: true,
          yAxisID: 'y'
        },
        {
          label: 'Mood',
          data: moodData,
          borderColor: '#eab308',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#eab308',
          spanGaps: true,
          yAxisID: 'y1'
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#9195a0',
          usePointStyle: true,
          pointStyle: 'line',
          padding: 15,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 14, 20, 0.95)',
        titleColor: '#9195a0',
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            if (context.dataset.label === 'Sleep Hours') {
              return `Sleep: ${context.parsed.y}h`;
            } else if (context.dataset.label === 'Mood') {
              const level = context.parsed.y;
              return `Mood: ${moodLabels[level] || level}`;
            }
            return context.parsed.y;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: true, color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#9195a0', font: { size: 11 } },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 0,
        max: 12,
        ticks: {
          color: '#a855f7',
          stepSize: 2,
          callback: (value) => `${value}h`
        },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 1,
        max: 5,
        ticks: {
          color: '#eab308',
          stepSize: 1,
          callback: (value) => moodLabels[value] || ''
        },
        grid: { drawOnChartArea: false },
      },
    },
    animation: {
      duration: 300,
      easing: 'easeInOut',
    },
  };

  if (sleepLog.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
        <div className="flex items-center gap-3 mb-6">
          <Moon className="text-purple-400" size={28} />
          <h3 className="text-xl font-bold text-text-primary">Sleep Analytics</h3>
        </div>
        <div className="text-center py-12">
          <Moon size={48} className="mx-auto text-text-tertiary mb-4" />
          <p className="text-text-secondary">Start logging your sleep to see analytics!</p>
          <p className="text-text-tertiary text-sm mt-2">Track patterns, correlations, and insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
      {/* Header with Time Period Selector */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Moon className="text-purple-400" size={28} />
          <h3 className="text-xl font-bold text-text-primary">Sleep Analytics</h3>
        </div>

        <div className="flex gap-2">
          {['Week', 'Month', 'All Time'].map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                timePeriod === period
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500'
                  : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary"
          >
            <p className="text-xs text-text-tertiary mb-1">Avg Sleep</p>
            <p className="text-2xl font-bold text-purple-400">{stats.avgHours}h</p>
            <p className="text-xs text-text-tertiary">{stats.daysTracked} days tracked</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary"
          >
            <p className="text-xs text-text-tertiary mb-1">Sleep Debt</p>
            <p className={`text-2xl font-bold ${parseFloat(stats.sleepDebt) > 5 ? 'text-red-500' : parseFloat(stats.sleepDebt) > 0 ? 'text-orange-500' : 'text-green-glow'}`}>
              {stats.sleepDebt}h
            </p>
            <p className="text-xs text-text-tertiary">vs {SLEEP_TARGET}h target</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary"
          >
            <p className="text-xs text-text-tertiary mb-1 flex items-center gap-1">
              <Trophy size={12} className="text-yellow-500" />
              Goal Streak
            </p>
            <p className="text-2xl font-bold text-yellow-500">{stats.currentStreak}</p>
            <p className="text-xs text-text-tertiary">nights at 7+ hours</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary"
          >
            <p className="text-xs text-text-tertiary mb-1">Avg Quality</p>
            <p className="text-2xl font-bold text-text-primary">{stats.avgQuality}/4</p>
            <p className="text-xs text-text-tertiary">
              {parseFloat(stats.avgQuality) >= 3 ? 'Good' : parseFloat(stats.avgQuality) >= 2 ? 'Fair' : 'Needs work'}
            </p>
          </motion.div>
        </div>
      )}

      {/* Correlation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Sleep-Mood Correlation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-yellow-500" />
            <p className="text-sm font-medium text-text-primary">Sleep-Mood Link</p>
          </div>
          {correlation.avgHappySleep ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Happy days avg:</span>
                <span className="text-sm font-bold text-green-glow">{correlation.avgHappySleep}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Stressed days avg:</span>
                <span className="text-sm font-bold text-red-500">{correlation.avgStressedSleep}h</span>
              </div>
              <div className="pt-2 border-t border-bg-primary">
                <p className="text-xs text-text-tertiary flex items-center gap-1">
                  {parseFloat(correlation.difference) > 0 ? (
                    <><TrendingUp size={12} className="text-green-glow" /> {correlation.difference}h more on happy days</>
                  ) : (
                    <><TrendingDown size={12} className="text-red-500" /> Sleep doesn't correlate with mood</>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">{correlation.text}</p>
          )}
        </motion.div>

        {/* Sleep-Productivity Correlation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-green-glow" />
            <p className="text-sm font-medium text-text-primary">Sleep-Productivity Link</p>
          </div>
          {productivityCorrelation.avgWellRested ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Well-rested (7h+):</span>
                <span className="text-sm font-bold text-green-glow">{productivityCorrelation.avgWellRested} tasks/day</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Tired (&lt;6h):</span>
                <span className="text-sm font-bold text-orange-500">{productivityCorrelation.avgTired} tasks/day</span>
              </div>
              <div className="pt-2 border-t border-bg-primary">
                <p className="text-xs text-text-tertiary flex items-center gap-1">
                  {parseFloat(productivityCorrelation.difference) > 0 ? (
                    <><TrendingUp size={12} className="text-green-glow" /> {productivityCorrelation.difference}% more productive when rested</>
                  ) : (
                    <span>Productivity stays consistent</span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">{productivityCorrelation.text}</p>
          )}
        </motion.div>
      </div>

      {/* Best/Worst Weeks */}
      {stats && stats.bestWeek && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-green-glow/10 rounded-xl p-4 border border-green-glow/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-glow" />
              <p className="text-xs text-green-glow font-medium">Best Week</p>
            </div>
            <p className="text-lg font-bold text-green-glow">{stats.bestWeekAvg}h avg</p>
            <p className="text-xs text-text-tertiary">Week of {stats.bestWeek}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-red-500/10 rounded-xl p-4 border border-red-500/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-500" />
              <p className="text-xs text-red-500 font-medium">Worst Week</p>
            </div>
            <p className="text-lg font-bold text-red-500">{stats.worstWeekAvg}h avg</p>
            <p className="text-xs text-text-tertiary">Week of {stats.worstWeek}</p>
          </motion.div>
        </div>
      )}

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary"
      >
        <h4 className="text-sm font-medium text-text-primary mb-4">Sleep & Mood Trends</h4>
        <div className="h-[250px]">
          <Line data={getChartData()} options={chartOptions} />
        </div>
      </motion.div>
    </div>
  );
};

export default SleepAnalytics;
