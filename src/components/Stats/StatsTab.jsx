import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Activity, Heart, ArrowLeft, TrendingUp, TrendingDown, Flame, BookOpen, Home, Smile, Moon, Trophy, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';
import { subDays, format } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

// Sleep target hours
const SLEEP_TARGET = 7.5;

const StatsTab = () => {
  const [activeSection, setActiveSection] = useState('main'); // 'main', 'productivity', 'wellbeing', 'mood', 'sleep'
  const [completedTasks, setCompletedTasks] = useState([]);
  const [moodLog, setMoodLog] = useState([]);
  const [sleepLog, setSleepLog] = useState([]);
  const [timePeriod, setTimePeriod] = useState('Week');

  // Load completed tasks from localStorage
  useEffect(() => {
    const loadCompletedTasks = () => {
      const stored = localStorage.getItem('completedTasks');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCompletedTasks(parsed);
        } catch (error) {
          console.error('Error loading completed tasks:', error);
          setCompletedTasks([]);
        }
      } else {
        setCompletedTasks([]);
      }
    };

    loadCompletedTasks();

    // Listen for stats reset
    const handleStatsReset = () => {
      setCompletedTasks([]);
    };

    window.addEventListener('statsReset', handleStatsReset);
    window.addEventListener('storage', loadCompletedTasks);

    return () => {
      window.removeEventListener('statsReset', handleStatsReset);
      window.removeEventListener('storage', loadCompletedTasks);
    };
  }, []);

  // Load mood log from localStorage
  useEffect(() => {
    const loadMoodLog = () => {
      const stored = localStorage.getItem('moodLog');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMoodLog(parsed);
        } catch (error) {
          console.error('Error loading mood log:', error);
          setMoodLog([]);
        }
      } else {
        setMoodLog([]);
      }
    };

    loadMoodLog();

    // Listen for storage changes
    window.addEventListener('storage', loadMoodLog);
    window.addEventListener('moodDataUpdated', loadMoodLog);

    return () => {
      window.removeEventListener('storage', loadMoodLog);
      window.removeEventListener('moodDataUpdated', loadMoodLog);
    };
  }, []);

  // Load sleep log from localStorage
  useEffect(() => {
    const loadSleepLog = () => {
      const stored = localStorage.getItem('sleepLog');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSleepLog(parsed);
        } catch (error) {
          console.error('Error loading sleep log:', error);
          setSleepLog([]);
        }
      } else {
        setSleepLog([]);
      }
    };

    loadSleepLog();
    window.addEventListener('storage', loadSleepLog);
    window.addEventListener('sleepDataUpdated', loadSleepLog);
    return () => {
      window.removeEventListener('storage', loadSleepLog);
      window.removeEventListener('sleepDataUpdated', loadSleepLog);
    };
  }, []);

  // Moods configuration
  const moodsConfig = {
    5: { label: 'Great', color: '#eab308' },
    4: { label: 'Good', color: '#3dd68c' },
    3: { label: 'Okay', color: '#60a5fa' },
    2: { label: 'Down', color: '#f97316' },
    1: { label: 'Rocky', color: '#ef4444' }
  };

  // Calculate mood/productivity correlation (All Time)
  const correlationStats = useMemo(() => {
    if (!moodLog.length || !completedTasks.length) {
      return { text: 'Not enough data', value: null };
    }

    const goodMoodDays = new Set();
    const badMoodDays = new Set();

    moodLog.forEach(entry => {
      if (entry.level >= 4) goodMoodDays.add(entry.date);
      else if (entry.level <= 2) badMoodDays.add(entry.date);
    });

    // Count tasks for both categories
    let goodDayTaskCount = 0;
    let badDayTaskCount = 0;

    completedTasks.forEach(task => {
      const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
      if (goodMoodDays.has(completedDate)) {
        goodDayTaskCount++;
      } else if (badMoodDays.has(completedDate)) {
        badDayTaskCount++;
      }
    });

    // SCENARIO 1: Data for BOTH (Standard Comparison)
    if (goodMoodDays.size > 0 && badMoodDays.size > 0) {
      const avgTasksOnGoodDays = goodDayTaskCount / goodMoodDays.size;
      const avgTasksOnBadDays = badDayTaskCount / badMoodDays.size;

      if (avgTasksOnBadDays > 0) {
        const multiplier = avgTasksOnGoodDays / avgTasksOnBadDays;
        if (!isFinite(multiplier)) return { text: 'Not enough data', value: null };
        return {
          text: 'more tasks on good days',
          value: `${multiplier.toFixed(1)}x`,
        };
      }

      if (avgTasksOnGoodDays > 0) {
        return {
          text: 'avg tasks on good days (vs 0 on bad)',
          value: `${avgTasksOnGoodDays.toFixed(1)}`,
        };
      }
      return { text: 'No task/mood overlap found', value: null };
    }

    // SCENARIO 2: Good Days ONLY (Fallback)
    if (goodMoodDays.size > 0 && badMoodDays.size === 0) {
       const avgTasksOnGoodDays = goodDayTaskCount / goodMoodDays.size;
       return {
         text: 'avg tasks on good days (log bad days to compare)',
         value: `${avgTasksOnGoodDays.toFixed(1)}`
       };
    }

    // SCENARIO 3: Bad Days ONLY (Fallback)
    if (badMoodDays.size > 0 && goodMoodDays.size === 0) {
       const avgTasksOnBadDays = badDayTaskCount / badMoodDays.size;
       return {
         text: 'avg tasks on bad days (log good days to compare)',
         value: `${avgTasksOnBadDays.toFixed(1)}`
       };
    }

    return { text: 'Log more good/bad days', value: null };

  }, [completedTasks, moodLog]);

  // Calculate sleep statistics
  const sleepStats = useMemo(() => {
    if (sleepLog.length === 0) {
      return null;
    }

    const today = new Date();
    let startDate = new Date();

    switch (timePeriod) {
      case 'Day':
        startDate = subDays(today, 1);
        break;
      case 'Week':
        startDate = subDays(today, 6);
        break;
      case 'Month':
        startDate = subDays(today, 29);
        break;
      case 'Semester':
      case 'All Time':
        startDate = new Date(0);
        break;
      default:
        break;
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    const filteredSleep = sleepLog.filter(e => e.date >= startDateStr && e.date <= todayStr);

    if (filteredSleep.length === 0) return null;

    const totalHours = filteredSleep.reduce((acc, e) => acc + (e.totalSleep ?? e.hours), 0);
    const avgHours = totalHours / filteredSleep.length;

    const totalQuality = filteredSleep.reduce((acc, e) => acc + e.quality, 0);
    const avgQuality = totalQuality / filteredSleep.length;

    // Calculate sleep debt for past 7 days using cumulative approach
    const last7DaysData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = sleepLog.find(e => e.date === dateStr);
      if (entry) {
        last7DaysData.push({
          date: dateStr,
          sleep: entry.totalSleep ?? entry.hours
        });
      }
    }

    let cumulativeDebt = 0;
    last7DaysData.forEach(day => {
      if (day.sleep < SLEEP_TARGET) {
        // Deficit: add to debt
        cumulativeDebt += (SLEEP_TARGET - day.sleep);
      } else {
        // Surplus: reduce debt (but don't go below 0)
        const surplus = day.sleep - SLEEP_TARGET;
        cumulativeDebt = Math.max(0, cumulativeDebt - surplus);
      }
    });

    const sleepDebt = cumulativeDebt;

    // Calculate streak
    let currentStreak = 0;
    const sortedSleep = [...sleepLog].sort((a, b) => b.date.localeCompare(a.date));
    for (const entry of sortedSleep) {
      if ((entry.totalSleep ?? entry.hours) >= 7) {
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
      currentStreak
    };
  }, [sleepLog, timePeriod]);

  // Sleep-Mood Correlation
  const sleepMoodCorrelation = useMemo(() => {
    if (sleepLog.length === 0 || moodLog.length === 0) {
      return { text: 'Not enough data', avgHappySleep: null, avgStressedSleep: null };
    }

    const moodByDate = {};
    moodLog.forEach(entry => {
      moodByDate[entry.date] = entry.level;
    });

    const happyDaysSleep = [];
    const stressedDaysSleep = [];

    sleepLog.forEach(sleepEntry => {
      const mood = moodByDate[sleepEntry.date];
      const sleep = sleepEntry.totalSleep ?? sleepEntry.hours;
      if (mood !== undefined) {
        if (mood >= 4) {
          happyDaysSleep.push(sleep);
        } else if (mood <= 2) {
          stressedDaysSleep.push(sleep);
        }
      }
    });

    if (happyDaysSleep.length === 0 || stressedDaysSleep.length === 0) {
      return { text: 'Log more entries', avgHappySleep: null, avgStressedSleep: null };
    }

    const avgHappySleep = happyDaysSleep.reduce((a, b) => a + b, 0) / happyDaysSleep.length;
    const avgStressedSleep = stressedDaysSleep.reduce((a, b) => a + b, 0) / stressedDaysSleep.length;

    return {
      text: `${avgHappySleep.toFixed(1)}h on good vs ${avgStressedSleep.toFixed(1)}h on bad days`,
      avgHappySleep: avgHappySleep.toFixed(1),
      avgStressedSleep: avgStressedSleep.toFixed(1),
      difference: (avgHappySleep - avgStressedSleep).toFixed(1)
    };
  }, [sleepLog, moodLog]);

  // Sleep-Productivity Link
  const sleepProductivityLink = useMemo(() => {
    if (sleepLog.length === 0 || completedTasks.length === 0) {
      return { text: 'Not enough data', value: null };
    }

    const sleepByDate = {};
    sleepLog.forEach(entry => {
      sleepByDate[entry.date] = entry.totalSleep ?? entry.hours;
    });

    const goodSleepDays = new Set();
    const badSleepDays = new Set();

    sleepLog.forEach(entry => {
      const sleep = entry.totalSleep ?? entry.hours;
      if (sleep >= 7) goodSleepDays.add(entry.date);
      else if (sleep < 6) badSleepDays.add(entry.date);
    });

    if (goodSleepDays.size === 0 || badSleepDays.size === 0) {
      return { text: 'Log more sleep variation', value: null };
    }

    let goodSleepTaskCount = 0;
    let badSleepTaskCount = 0;

    completedTasks.forEach(task => {
      const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
      if (goodSleepDays.has(completedDate)) {
        goodSleepTaskCount++;
      } else if (badSleepDays.has(completedDate)) {
        badSleepTaskCount++;
      }
    });

    const avgTasksOnGoodSleep = goodSleepTaskCount / goodSleepDays.size;
    const avgTasksOnBadSleep = badSleepTaskCount / badSleepDays.size;

    if (avgTasksOnBadSleep > 0) {
      const multiplier = avgTasksOnGoodSleep / avgTasksOnBadSleep;
      // Guard against infinity or NaN
      if (!isFinite(multiplier)) {
        return { text: 'Not enough data', value: null };
      }
      return {
        text: 'more tasks with good sleep',
        value: `${multiplier.toFixed(1)}x`,
      };
    }

    return { text: 'No clear pattern', value: null };
  }, [sleepLog, completedTasks]);

  // Helper function to calculate average mood
  const calculateAverageMood = (moods) => {
    if (moods.length === 0) return null;
    const sum = moods.reduce((acc, entry) => acc + entry.level, 0);
    return sum / moods.length;
  };

  // Calculate all-time average mood
  const calculateAllTimeAverageMood = () => {
    const avg = calculateAverageMood(moodLog);
    if (avg === null) return { value: 'N/A', label: 'No data' };
    const roundedAvg = Math.round(avg);
    return {
      value: avg.toFixed(1),
      label: moodsConfig[roundedAvg]?.label || 'Unknown'
    };
  };

  // Calculate most productive day
  const calculateMostProductiveDay = () => {
    if (completedTasks.length === 0) return 'Not enough data';

    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    completedTasks.forEach(task => {
      const completedDate = new Date(task.completedAt);
      const dayOfWeek = completedDate.getDay();
      dayCounts[dayOfWeek]++;
    });

    const maxCount = Math.max(...dayCounts);
    if (maxCount === 0) return 'Not enough data';

    const mostProductiveDayIndex = dayCounts.indexOf(maxCount);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return dayNames[mostProductiveDayIndex];
  };

  // Calculate stats for selected time period
  const calculatePeriodStats = () => {
    const now = new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let startDate = new Date(now);
    let periodName = '';

    if (timePeriod === 'Day') {
      startDate.setHours(0, 0, 0, 0);
      periodName = 'Today';
    } else if (timePeriod === 'Week') {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      periodName = 'Last 7 Days';
    } else if (timePeriod === 'Month') {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      periodName = 'Last 30 Days';
    } else if (timePeriod === 'Semester') {
      const semesterStartStr = localStorage.getItem('semesterStartDate');
      if (semesterStartStr) {
        startDate = new Date(semesterStartStr + 'T00:00:00');
      }
      periodName = 'This Semester';
    } else if (timePeriod === 'All Time') {
      if (completedTasks.length > 0) {
        const firstTaskDate = new Date(Math.min(...completedTasks.map(t => new Date(t.completedAt))));
        startDate = new Date(firstTaskDate);
        startDate.setHours(0, 0, 0, 0);
      }
      periodName = 'All Time';
    }

    const tasksInPeriod = completedTasks.filter(task => {
      const completedDate = new Date(task.completedAt);
      return completedDate >= startDate && completedDate <= today;
    });

    const periodTotal = tasksInPeriod.length;

    let periodAverage = 0;
    if (timePeriod === 'Day') {
      periodAverage = periodTotal;
    } else {
      const totalDays = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
      periodAverage = (periodTotal / totalDays).toFixed(1);
    }

    // Calculate mood average for period
    const moodsInPeriod = moodLog.filter(entry => {
      const entryDate = new Date(entry.date + 'T12:00:00');
      return entryDate >= startDate && entryDate <= today;
    });

    const periodMoodAvg = calculateAverageMood(moodsInPeriod);
    let periodMoodValue = 'N/A';
    let periodMoodLabel = 'No data';
    if (periodMoodAvg !== null) {
      periodMoodValue = periodMoodAvg.toFixed(1);
      const roundedAvg = Math.round(periodMoodAvg);
      periodMoodLabel = moodsConfig[roundedAvg]?.label || 'Unknown';
    }

    return { periodName, periodTotal, periodAverage, periodMoodValue, periodMoodLabel };
  };

  const periodStats = calculatePeriodStats();
  const allTimeAverageMood = calculateAllTimeAverageMood();
  const totalCompleted = completedTasks.length;
  const academicCount = completedTasks.filter(task => (task.taskType || 'academic') === 'academic').length;
  const personalCount = completedTasks.filter(task => task.taskType === 'personal').length;
  const mostProductiveDay = calculateMostProductiveDay();

  // Chart data calculation for completion trend
  const getChartData = () => {
    if (completedTasks.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          borderColor: '#3dd68c',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(61, 214, 140, 0.3)');
            gradient.addColorStop(1, 'rgba(61, 214, 140, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 8,
        }]
      };
    }

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    let dates = [];
    let labels = [];

    if (timePeriod === 'Week') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        labels.push(dayNames[date.getDay()]);
      }
    } else if (timePeriod === 'Month') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        const dayOfMonth = date.getDate();
        if ([1, 5, 10, 15, 20, 25, 30].includes(dayOfMonth)) {
          labels.push(dayOfMonth.toString());
        } else {
          labels.push('');
        }
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        labels.push(format(date, 'MM/dd'));
      }
    }

    const academicData = dates.map(date => {
      return completedTasks.filter(task => {
        const completedDate = new Date(task.completedAt);
        const isAcademic = (task.taskType || 'academic') === 'academic';
        completedDate.setHours(12, 0, 0, 0);
        return completedDate.toDateString() === date.toDateString() && isAcademic;
      }).length;
    });

    const personalData = dates.map(date => {
      return completedTasks.filter(task => {
        const completedDate = new Date(task.completedAt);
        const isPersonal = task.taskType === 'personal';
        completedDate.setHours(12, 0, 0, 0);
        return completedDate.toDateString() === date.toDateString() && isPersonal;
      }).length;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Academic',
          data: academicData,
          borderColor: '#3dd68c',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(61, 214, 140, 0.3)');
            gradient.addColorStop(1, 'rgba(61, 214, 140, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgba(61, 214, 140, 0.8)',
          pointBorderColor: 'rgba(255, 255, 255, 0.3)',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#3dd68c',
          pointHoverBorderColor: 'rgba(255, 255, 255, 0.5)',
          pointHoverBorderWidth: 3,
        },
        {
          label: 'Personal',
          data: personalData,
          borderColor: '#3b82f6',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgba(59, 130, 246, 0.8)',
          pointBorderColor: 'rgba(255, 255, 255, 0.3)',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#3b82f6',
          pointHoverBorderColor: 'rgba(255, 255, 255, 0.5)',
          pointHoverBorderWidth: 3,
        }
      ]
    };
  };

  // Mood chart data calculation
  const getMoodChartData = () => {
    if (moodLog.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Average Mood',
          data: [],
          borderColor: '#eab308',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(234, 179, 8, 0.3)');
            gradient.addColorStop(1, 'rgba(234, 179, 8, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 8,
          spanGaps: true,
        }]
      };
    }

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    let dates = [];
    let labels = [];

    if (timePeriod === 'Week') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        labels.push(dayNames[date.getDay()]);
      }
    } else if (timePeriod === 'Month') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        const dayOfMonth = date.getDate();
        if ([1, 5, 10, 15, 20, 25, 30].includes(dayOfMonth)) {
          labels.push(dayOfMonth.toString());
        } else {
          labels.push('');
        }
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        labels.push(format(date, 'MM/dd'));
      }
    }

    const moodData = dates.map(date => {
      const moodsForDate = moodLog.filter(entry => {
        const entryDate = new Date(entry.date + 'T12:00:00');
        return entryDate.toDateString() === date.toDateString();
      });

      const avg = calculateAverageMood(moodsForDate);
      return avg;
    });

    return {
      labels,
      datasets: [{
        label: 'Average Mood',
        data: moodData,
        borderColor: '#eab308',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(234, 179, 8, 0.3)');
          gradient.addColorStop(1, 'rgba(234, 179, 8, 0)');
          return gradient;
        },
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgba(234, 179, 8, 0.8)',
        pointBorderColor: 'rgba(255, 255, 255, 0.3)',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#eab308',
        pointHoverBorderColor: 'rgba(255, 255, 255, 0.5)',
        pointHoverBorderWidth: 3,
        spanGaps: true,
      }]
    };
  };

  // Sleep quality distribution pie chart (4 categories only) - Monochromatic Purple Theme
  const getSleepQualityData = () => {
    if (sleepLog.length === 0) {
      return {
        labels: ['Poor', 'Fair', 'Good', 'Excellent'],
        datasets: [{
          label: 'Nights',
          data: [0, 0, 0, 0],
          backgroundColor: [
            'rgba(243, 232, 255, 0.7)', // Pale White/Lilac - Poor
            'rgba(216, 180, 254, 0.75)', // Soft Lavender - Fair
            'rgba(168, 85, 247, 0.8)',   // Bright Purple - Good
            'rgba(124, 58, 237, 0.85)',  // Vibrant Deep Violet - Excellent
          ],
          borderColor: [
            'rgba(243, 232, 255, 1)',
            'rgba(216, 180, 254, 1)',
            'rgba(168, 85, 247, 1)',
            'rgba(124, 58, 237, 1)',
          ],
          borderWidth: 3,
          hoverBackgroundColor: [
            'rgba(243, 232, 255, 0.9)',
            'rgba(216, 180, 254, 0.95)',
            'rgba(168, 85, 247, 1)',
            'rgba(124, 58, 237, 1)',
          ],
          hoverBorderColor: [
            'rgba(243, 232, 255, 1)',
            'rgba(216, 180, 254, 1)',
            'rgba(168, 85, 247, 1)',
            'rgba(124, 58, 237, 1)',
          ],
          hoverBorderWidth: 4,
        }]
      };
    }

    // Filter sleep log based on time period
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    let filteredSleepLog = sleepLog;

    if (timePeriod === 'Week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6);
      const weekAgoStr = format(weekAgo, 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      filteredSleepLog = sleepLog.filter(entry => entry.date >= weekAgoStr && entry.date <= todayStr);
    } else if (timePeriod === 'Month') {
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 29);
      const monthAgoStr = format(monthAgo, 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      filteredSleepLog = sleepLog.filter(entry => entry.date >= monthAgoStr && entry.date <= todayStr);
    }
    // 'All Time' uses all sleepLog

    // Map 1-5 quality to 4 categories: 1=Poor, 2=Fair, 3-4=Good, 5=Excellent
    const qualityCounts = [0, 0, 0, 0];
    filteredSleepLog.forEach(entry => {
      const quality = entry.quality;
      if (quality === 1) {
        qualityCounts[0]++; // Poor
      } else if (quality === 2) {
        qualityCounts[1]++; // Fair
      } else if (quality === 3 || quality === 4) {
        qualityCounts[2]++; // Good
      } else if (quality === 5) {
        qualityCounts[3]++; // Excellent
      }
    });

    return {
      labels: ['Poor', 'Fair', 'Good', 'Excellent'],
      datasets: [{
        label: 'Nights',
        data: qualityCounts,
        backgroundColor: [
          'rgba(243, 232, 255, 0.7)', // Pale White/Lilac - Poor
          'rgba(216, 180, 254, 0.75)', // Soft Lavender - Fair
          'rgba(168, 85, 247, 0.8)',   // Bright Purple - Good
          'rgba(124, 58, 237, 0.85)',  // Vibrant Deep Violet - Excellent
        ],
        borderColor: [
          'rgba(243, 232, 255, 1)',
          'rgba(216, 180, 254, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(124, 58, 237, 1)',
        ],
        borderWidth: 3,
        hoverBackgroundColor: [
          'rgba(243, 232, 255, 0.9)',
          'rgba(216, 180, 254, 0.95)',
          'rgba(168, 85, 247, 1)',
          'rgba(124, 58, 237, 1)',
        ],
        hoverBorderColor: [
          'rgba(243, 232, 255, 1)',
          'rgba(216, 180, 254, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(124, 58, 237, 1)',
        ],
        hoverBorderWidth: 4,
      }]
    };
  };

  // Sleep & Mood trends chart
  const getSleepMoodTrendsData = () => {
    if (sleepLog.length === 0 && moodLog.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    let dates = [];
    let labels = [];

    if (timePeriod === 'Week') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        labels.push(dayNames[date.getDay()]);
      }
    } else if (timePeriod === 'Month') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        const dayOfMonth = date.getDate();
        if ([1, 5, 10, 15, 20, 25, 30].includes(dayOfMonth)) {
          labels.push(dayOfMonth.toString());
        } else {
          labels.push('');
        }
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        labels.push(format(date, 'MM/dd'));
      }
    }

    // Sleep data
    const sleepData = dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const sleepEntry = sleepLog.find(entry => entry.date === dateStr);
      return sleepEntry ? (sleepEntry.totalSleep ?? sleepEntry.hours) : null;
    });

    // Mood data
    const moodData = dates.map(date => {
      const moodsForDate = moodLog.filter(entry => {
        const entryDate = new Date(entry.date + 'T12:00:00');
        return entryDate.toDateString() === date.toDateString();
      });
      const avg = calculateAverageMood(moodsForDate);
      return avg;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Sleep (hours)',
          data: sleepData,
          borderColor: '#a78bfa',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(167, 139, 250, 0.3)');
            gradient.addColorStop(1, 'rgba(167, 139, 250, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgba(167, 139, 250, 0.8)',
          pointBorderColor: 'rgba(255, 255, 255, 0.3)',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#a78bfa',
          pointHoverBorderColor: 'rgba(255, 255, 255, 0.5)',
          pointHoverBorderWidth: 3,
          spanGaps: true,
          yAxisID: 'y-sleep',
        },
        {
          label: 'Mood (1-5)',
          data: moodData,
          borderColor: '#eab308',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(234, 179, 8, 0.3)');
            gradient.addColorStop(1, 'rgba(234, 179, 8, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgba(234, 179, 8, 0.8)',
          pointBorderColor: 'rgba(255, 255, 255, 0.3)',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#eab308',
          pointHoverBorderColor: 'rgba(255, 255, 255, 0.5)',
          pointHoverBorderWidth: 3,
          spanGaps: true,
          yAxisID: 'y-mood',
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#e6e8ea',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 12,
            weight: '500',
          },
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 14, 20, 0.95)',
        titleColor: '#e6e8ea',
        bodyColor: '#9195a0',
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.05)',
          lineWidth: 1,
        },
        ticks: {
          color: '#9195a0',
          font: {
            size: 11,
          },
        },
        border: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        beginAtZero: true,
        grace: '15%',
        ticks: {
          color: '#9195a0',
          stepSize: 1,
          precision: 0,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          lineWidth: 1,
        },
        border: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    animation: {
      duration: 500,
      easing: 'easeInOutQuart',
    },
  };

  const moodChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        min: 0.5,
        max: 5.5,
        ticks: {
          ...chartOptions.scales.y.ticks,
          stepSize: 1,
          callback: function(value) {
            // Only show labels for 1-5
            return value >= 1 && value <= 5 ? value : '';
          }
        },
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        onClick: null, // Disable legend item toggling
        labels: {
          color: '#ffffff',
          padding: 18,
          font: {
            size: 13,
            weight: '500',
            family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
          },
          boxWidth: 18,
          boxHeight: 18,
          borderRadius: 4,
          usePointStyle: true,
          pointStyle: 'circle',
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0];
                const backgroundColor = dataset.backgroundColor[i];
                const borderColor = dataset.borderColor[i];
                return {
                  text: label,
                  fillStyle: backgroundColor,
                  strokeStyle: borderColor,
                  lineWidth: 2,
                  fontColor: '#ffffff',
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 14, 20, 0.98)',
        titleColor: '#c084fc',
        bodyColor: '#e6e8ea',
        padding: 14,
        cornerRadius: 12,
        borderColor: 'rgba(168, 85, 247, 0.3)',
        borderWidth: 2,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} nights (${percentage}%)`;
          }
        }
      },
      datalabels: {
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return percentage > 5 ? `${percentage}%` : ''; // Only show if > 5%
        },
        color: (context) => {
          // Use white for darker purples, dark purple for light colors
          const index = context.dataIndex;
          return index <= 1 ? '#6d28d9' : '#ffffff';
        },
        font: {
          weight: 'bold',
          size: 15,
          family: "'Inter', sans-serif",
        },
        textShadowBlur: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
      },
    },
    animation: {
      duration: 600,
      easing: 'easeInOutQuart',
      animateRotate: true,
      animateScale: true,
    },
  };

  const sleepMoodTrendsOptions = {
    ...chartOptions,
    scales: {
      x: chartOptions.scales.x,
      'y-sleep': {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        max: 13,
        ticks: {
          color: '#a78bfa',
          stepSize: 2,
        },
        grid: {
          color: 'rgba(167, 139, 250, 0.1)',
          lineWidth: 1,
        },
        border: {
          color: 'rgba(167, 139, 250, 0.3)',
        },
      },
      'y-mood': {
        type: 'linear',
        position: 'right',
        min: 0.5,
        max: 5.5,
        ticks: {
          color: '#eab308',
          stepSize: 1,
          callback: function(value) {
            // Only show labels for 1-5
            return value >= 1 && value <= 5 ? value : '';
          }
        },
        grid: {
          display: false,
        },
        border: {
          color: 'rgba(234, 179, 8, 0.3)',
        },
      },
    },
  };

  // MAIN SELECTION SCREEN
  if (activeSection === 'main') {
    return (
      <div className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-text-primary mb-3 flex items-center gap-3">
              <BarChart3 className="text-green-glow" size={40} />
              Your Statistics
            </h2>
            <p className="text-text-secondary text-lg">
              Choose a category to explore your insights
            </p>
          </div>

          {/* Category Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Productivity Button */}
            <motion.button
              onClick={() => setActiveSection('productivity')}
              className="glass-panel p-12 hover:bg-glass-overlay transition-all duration-300 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-green-glow/10 flex items-center justify-center group-hover:bg-green-glow/20 transition-colors duration-300">
                  <Activity className="text-green-glow" size={48} />
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-text-primary mb-2">Productivity</h3>
                  <p className="text-text-secondary">
                    Track your tasks and completion trends
                  </p>
                </div>
                <div className="mt-4 px-6 py-2 rounded-full bg-green-glow/10 border border-green-glow/30">
                  <span className="text-green-glow font-semibold">{totalCompleted} Tasks Completed</span>
                </div>
              </div>
            </motion.button>

            {/* Wellbeing Button */}
            <motion.button
              onClick={() => setActiveSection('wellbeing')}
              className="glass-panel p-12 hover:bg-glass-overlay transition-all duration-300 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-purple-400/10 flex items-center justify-center group-hover:bg-purple-400/20 transition-colors duration-300">
                  <Heart className="text-purple-400" size={48} />
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-text-primary mb-2">Wellbeing</h3>
                  <p className="text-text-secondary">
                    Monitor your mood and sleep patterns
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <div className="px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                    <span className="text-yellow-500 font-semibold text-sm">{moodLog.length} Mood Logs</span>
                  </div>
                  <div className="px-4 py-2 rounded-full bg-purple-400/10 border border-purple-400/30">
                    <span className="text-purple-400 font-semibold text-sm">{sleepLog.length} Sleep Logs</span>
                  </div>
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // WELLBEING SELECTION SCREEN
  if (activeSection === 'wellbeing') {
    return (
      <div className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-12 flex items-center gap-4">
            <button
              onClick={() => setActiveSection('main')}
              className="relative z-[51] no-drag p-2 rounded-lg hover:bg-glass-surface transition-colors"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              <ArrowLeft className="text-text-secondary hover:text-text-primary" size={24} />
            </button>
            <div>
              <h2 className="text-4xl font-bold text-text-primary flex items-center gap-3">
                <Heart className="text-purple-400" size={40} />
                Wellbeing
              </h2>
              <p className="text-text-secondary text-lg">
                Choose a category to explore your wellbeing insights
              </p>
            </div>
          </div>

          {/* Mood & Sleep Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Mood Button */}
            <motion.button
              onClick={() => setActiveSection('mood')}
              className="glass-panel p-12 hover:bg-glass-overlay transition-all duration-300 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors duration-300">
                  <Smile className="text-yellow-500" size={48} />
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-text-primary mb-2">Mood</h3>
                  <p className="text-text-secondary">
                    Track your emotional patterns and correlations
                  </p>
                </div>
                <div className="mt-4 px-6 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                  <span className="text-yellow-500 font-semibold">{moodLog.length} Mood Entries</span>
                </div>
              </div>
            </motion.button>

            {/* Sleep Button */}
            <motion.button
              onClick={() => setActiveSection('sleep')}
              className="glass-panel p-12 hover:bg-glass-overlay transition-all duration-300 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-purple-400/10 flex items-center justify-center group-hover:bg-purple-400/20 transition-colors duration-300">
                  <Moon className="text-purple-400" size={48} />
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-text-primary mb-2">Sleep</h3>
                  <p className="text-text-secondary">
                    Monitor your sleep quality and habits
                  </p>
                </div>
                <div className="mt-4 px-6 py-2 rounded-full bg-purple-400/10 border border-purple-400/30">
                  <span className="text-purple-400 font-semibold">{sleepLog.length} Sleep Logs</span>
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // PRODUCTIVITY SECTION
  if (activeSection === 'productivity') {
    return (
      <div className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveSection('main')}
                className="no-drag p-2 rounded-lg hover:bg-glass-surface transition-colors"
              >
                <ArrowLeft className="text-text-secondary hover:text-text-primary" size={24} />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                  <Activity className="text-green-glow" size={32} />
                  Productivity
                </h2>
                <p className="text-text-secondary">
                  Track your task completion and progress
                </p>
              </div>
            </div>

            {/* Time Period Selector */}
            <div className="flex gap-2 flex-wrap">
              {['Day', 'Week', 'Month', 'Semester', 'All Time'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  style={{ WebkitAppRegion: 'no-drag' }}
                  className={`relative z-[51] no-drag px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timePeriod === period
                      ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                      : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 justify-items-center">
            {/* Total Tasks */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2">Total Tasks</p>
              <div className="text-5xl font-bold text-white mb-1">
                {totalCompleted}
              </div>
              <p className="text-text-tertiary text-xs">
                all time completions
              </p>
            </motion.div>

            {/* Academic Tasks */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2 flex items-center gap-2">
                <BookOpen className="text-green-glow" size={18} />
                Academic Tasks
              </p>
              <div className="text-4xl font-bold text-green-glow mb-1">
                {academicCount}
              </div>
              <p className="text-text-tertiary text-xs">
                {academicCount === 1 ? 'task' : 'tasks'} completed
              </p>
            </motion.div>

            {/* Personal Tasks */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2 flex items-center gap-2">
                <Home className="text-blue-500" size={18} />
                Personal Tasks
              </p>
              <div className="text-4xl font-bold text-blue-500 mb-1">
                {personalCount}
              </div>
              <p className="text-text-tertiary text-xs">
                {personalCount === 1 ? 'task' : 'tasks'} completed
              </p>
            </motion.div>

            {/* Tasks for Selected Timeframe */}
            <motion.div
              key={`period-total-${timePeriod}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 border border-green-glow/50 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2"># Tasks ({periodStats.periodName})</p>
              <div className="text-4xl font-bold text-white mb-1">
                {periodStats.periodTotal}
              </div>
              <p className="text-text-tertiary text-xs">
                {periodStats.periodTotal === 1 ? 'task' : 'tasks'} completed
              </p>
            </motion.div>

            {/* Daily Average for Selected Timeframe */}
            <motion.div
              key={`period-avg-${timePeriod}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 border border-green-glow/50 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2">
                {timePeriod === 'Day' ? 'Tasks Completed' : 'Daily Average'}
              </p>
              <div className="text-4xl font-bold text-white mb-1">
                {periodStats.periodAverage}
              </div>
              <p className="text-text-tertiary text-xs">
                {timePeriod === 'Day' ? 'tasks today' : `tasks per day`}
              </p>
            </motion.div>

            {/* Most Productive Day */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2 flex items-center gap-2">
                <Trophy className="text-yellow-500" size={18} />
                Most Productive Day
              </p>
              <div className="text-3xl font-bold text-text-primary mb-1">
                {mostProductiveDay === 'Not enough data' ? (
                  <span className="text-xl text-text-tertiary">Not enough data</span>
                ) : (
                  mostProductiveDay
                )}
              </div>
              <p className="text-text-tertiary text-xs">
                Based on completion history
              </p>
            </motion.div>
          </div>

          {/* Completion Trend Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel p-6"
          >
            <h3 className="text-xl font-semibold text-text-primary mb-4">
              Completion Trend - {timePeriod}
            </h3>

            <div className="h-[400px]">
              {completedTasks.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-text-secondary text-lg mb-2">
                      Complete tasks to see your progress!
                    </p>
                    <p className="text-text-tertiary text-sm">
                      Your completion trend will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <Line data={getChartData()} options={chartOptions} />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // MOOD SECTION
  if (activeSection === 'mood') {
    return (
      <div className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveSection('wellbeing')}
                className="relative z-[51] no-drag p-2 rounded-lg hover:bg-glass-surface transition-colors"
                style={{ WebkitAppRegion: 'no-drag' }}
              >
                <ArrowLeft className="text-text-secondary hover:text-text-primary" size={24} />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                  <Smile className="text-yellow-500" size={32} />
                  Mood
                </h2>
                <p className="text-text-secondary">
                  Track your emotional patterns and correlations
                </p>
              </div>
            </div>

            {/* Time Period Selector */}
            <div className="flex gap-2 flex-wrap">
              {['Day', 'Week', 'Month', 'Semester', 'All Time'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  style={{ WebkitAppRegion: 'no-drag' }}
                  className={`relative z-[51] no-drag px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timePeriod === period
                      ? 'bg-yellow-500 bg-opacity-20 text-yellow-500 border border-yellow-500'
                      : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Mood Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 justify-items-center">
            {/* All Time Average Mood */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2">All Time Average Mood</p>
              <div className="text-4xl font-bold text-yellow-500 mb-1">
                {allTimeAverageMood.value}
              </div>
              <p className="text-text-tertiary text-xs">
                {allTimeAverageMood.label}
              </p>
            </motion.div>

            {/* Average Mood (Selected Timeframe) */}
            <motion.div
              key={`period-mood-${timePeriod}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 border border-yellow-500/50 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2">
                Average Mood ({periodStats.periodName})
              </p>
              <div className="text-4xl font-bold text-yellow-500 mb-1">
                {periodStats.periodMoodValue}
              </div>
              <p className="text-text-tertiary text-xs">
                {periodStats.periodMoodLabel}
              </p>
            </motion.div>

            {/* Mood Correlation (All Time) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2">Mood Correlation</p>
              <div className="text-4xl font-bold text-text-primary mb-1">
                {correlationStats.value ? (
                  <span className="text-yellow-500">{correlationStats.value}</span>
                ) : (
                  <span className="text-2xl text-text-tertiary">No Data</span>
                )}
              </div>
              <p className="text-text-tertiary text-xs">
                {correlationStats.text}
              </p>
            </motion.div>
          </div>

          {/* Mood Trend Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel p-6"
          >
            <h3 className="text-xl font-semibold text-text-primary mb-4">
              Mood Trend - {timePeriod}
            </h3>

            <div className="h-[400px]">
              {moodLog.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-text-secondary text-lg mb-2">
                      Log moods to see your trend!
                    </p>
                    <p className="text-text-tertiary text-sm">
                      Your mood trend will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <Line data={getMoodChartData()} options={moodChartOptions} />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // SLEEP SECTION
  if (activeSection === 'sleep') {
    return (
      <div className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveSection('wellbeing')}
                className="relative z-[51] no-drag p-2 rounded-lg hover:bg-glass-surface transition-colors"
                style={{ WebkitAppRegion: 'no-drag' }}
              >
                <ArrowLeft className="text-text-secondary hover:text-text-primary" size={24} />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                  <Moon className="text-purple-400" size={32} />
                  Sleep
                </h2>
                <p className="text-text-secondary">
                  Monitor your sleep quality and habits
                </p>
              </div>
            </div>

            {/* Time Period Selector */}
            <div className="flex gap-2 flex-wrap">
              {['Day', 'Week', 'Month', 'Semester', 'All Time'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  style={{ WebkitAppRegion: 'no-drag' }}
                  className={`relative z-[51] no-drag px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timePeriod === period
                      ? 'bg-purple-400 bg-opacity-20 text-purple-400 border border-purple-400'
                      : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 justify-items-center">
            {/* Average Sleep (Selected Timeframe) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 border border-purple-400/50 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2">Average Sleep ({periodStats.periodName})</p>
              <div className="text-4xl font-bold text-purple-400 mb-1">
                {sleepStats ? `${sleepStats.avgHours}h` : 'N/A'}
              </div>
              <p className="text-text-tertiary text-xs">
                {sleepStats ? `${sleepStats.daysTracked} nights tracked` : 'Start logging sleep'}
              </p>
            </motion.div>

            {/* Sleep Goal Streak */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2 flex items-center gap-2">
                <Trophy className="text-purple-400" size={18} />
                Sleep Goal Streak
              </p>
              <div className="text-4xl font-bold text-purple-400 mb-1">
                {sleepStats ? sleepStats.currentStreak : 0}
              </div>
              <p className="text-text-tertiary text-xs">
                nights at 7+ hours
              </p>
            </motion.div>

            {/* Sleep Debt (past 7 days) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2 flex items-center gap-2">
                <TrendingDown className="text-orange-500" size={18} />
                Sleep Debt (7 days)
              </p>
              <div className={`text-4xl font-bold mb-1 ${
                sleepStats && parseFloat(sleepStats.sleepDebt) === 0 ? 'text-green-glow' :
                sleepStats && parseFloat(sleepStats.sleepDebt) > 5 ? 'text-red-500' :
                'text-orange-500'
              }`}>
                {sleepStats ? `${sleepStats.sleepDebt}h` : 'N/A'}
              </div>
              <p className="text-text-tertiary text-xs">
                vs {SLEEP_TARGET}h target
              </p>
            </motion.div>

            {/* Sleep-Mood Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2">Sleep-Mood Link</p>
              {sleepMoodCorrelation.avgHappySleep ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-glow font-bold text-2xl">{sleepMoodCorrelation.avgHappySleep}h</span>
                    <span className="text-text-tertiary text-xs">happy</span>
                    <span className="text-text-tertiary mx-1">vs</span>
                    <span className="text-red-500 font-bold text-2xl">{sleepMoodCorrelation.avgStressedSleep}h</span>
                    <span className="text-text-tertiary text-xs">stressed</span>
                  </div>
                  <p className="text-text-tertiary text-xs flex items-center gap-1">
                    {parseFloat(sleepMoodCorrelation.difference) > 0 ? (
                      <><TrendingUp size={12} className="text-green-glow" /> {sleepMoodCorrelation.difference}h more on good days</>
                    ) : (
                      'No clear pattern'
                    )}
                  </p>
                </>
              ) : (
                <p className="text-text-tertiary text-sm">{sleepMoodCorrelation.text}</p>
              )}
            </motion.div>

            {/* Sleep-Productivity Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6 w-full max-w-sm"
            >
              <p className="text-text-secondary text-sm mb-2 flex items-center gap-2">
                <Target className="text-green-glow" size={18} />
                Sleep-Productivity Link
              </p>
              <div className="text-4xl font-bold text-text-primary mb-1">
                {sleepProductivityLink.value ? (
                  <span className="text-green-glow">{sleepProductivityLink.value}</span>
                ) : (
                  <span className="text-2xl text-text-tertiary">No Data</span>
                )}
              </div>
              <p className="text-text-tertiary text-xs">
                {sleepProductivityLink.text}
              </p>
            </motion.div>
          </div>

          {/* Sleep Quality Distribution & Sleep/Mood Trends Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Sleep Quality Distribution (Pie Chart) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6"
            >
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Sleep Quality Distribution
              </h3>

              <div className="h-[350px]">
                {sleepLog.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-text-secondary text-lg mb-2">
                        Log sleep to see distribution!
                      </p>
                      <p className="text-text-tertiary text-sm">
                        Your sleep quality distribution will appear here
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="h-full flex items-center justify-center"
                    style={{
                      filter: 'drop-shadow(0 8px 24px rgba(124, 58, 237, 0.35)) drop-shadow(0 0 40px rgba(168, 85, 247, 0.15))',
                    }}
                  >
                    <div className="w-full h-full relative">
                      <Pie data={getSleepQualityData()} options={pieChartOptions} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Sleep & Mood Trends */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-6"
            >
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Sleep & Mood Trends
              </h3>

              <div className="h-[350px]">
                {sleepLog.length === 0 && moodLog.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-text-secondary text-lg mb-2">
                        Log sleep and mood to see trends!
                      </p>
                      <p className="text-text-tertiary text-sm">
                        Combined visualization will appear here
                      </p>
                    </div>
                  </div>
                ) : (
                  <Line data={getSleepMoodTrendsData()} options={sleepMoodTrendsOptions} />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StatsTab;
