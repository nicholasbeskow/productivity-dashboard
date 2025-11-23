import { useState, useEffect, useMemo } from 'react';
import { Moon, TrendingUp, TrendingDown, AlertTriangle, Trophy, Target, Zap, Lock, Sparkles, Calendar, Clock, ArrowRight } from 'lucide-react';
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
import { subDays, format, startOfWeek, subMonths } from 'date-fns';

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

// Tier thresholds
const TIER_THRESHOLDS = {
  TIER_1: 0,   // < 7 days
  TIER_2: 7,   // 7-13 days
  TIER_3: 14,  // 14-29 days
  TIER_4: 30   // 30+ days
};

// Quality labels
const qualityLabels = {
  4: 'Excellent',
  3: 'Good',
  2: 'Fair',
  1: 'Poor'
};

const qualityColors = {
  4: '#eab308', // yellow - Excellent (matches mood "Great")
  3: '#3dd68c', // green - Good (matches mood "Good")
  2: '#f97316', // orange - Fair (matches mood "Down")
  1: '#ef4444'  // red - Poor (matches mood "Rocky")
};

// Tier colors for inline styles (fixes dynamic Tailwind class issue)
const tierColors = {
  1: '#60a5fa', // blue-400
  2: '#eab308', // yellow-500
  3: '#a855f7', // purple-400
  4: '#3dd68c'  // green-glow
};

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
    window.addEventListener('sleepDataUpdated', loadData);
    window.addEventListener('moodDataUpdated', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
      window.removeEventListener('sleepDataUpdated', loadData);
      window.removeEventListener('moodDataUpdated', loadData);
    };
  }, []);

  // Mood labels for reference
  const moodLabels = {
    5: 'Great',
    4: 'Good',
    3: 'Okay',
    2: 'Down',
    1: 'Rocky'
  };

  // Calculate unique days logged (for tier calculation)
  const daysLogged = useMemo(() => {
    const uniqueDates = new Set(sleepLog.map(e => e.date));
    return uniqueDates.size;
  }, [sleepLog]);

  // Determine current tier
  const currentTier = useMemo(() => {
    if (daysLogged >= TIER_THRESHOLDS.TIER_4) return 4;
    if (daysLogged >= TIER_THRESHOLDS.TIER_3) return 3;
    if (daysLogged >= TIER_THRESHOLDS.TIER_2) return 2;
    return 1;
  }, [daysLogged]);

  // Get tier info
  const getTierInfo = (tier) => {
    switch (tier) {
      case 1:
        return {
          name: 'Getting Started',
          message: `Keep logging! You need at least 7 days of data to see sleep-mood correlations. You're at ${daysLogged}/7 days.`,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          nextUnlock: 'Sleep-Mood Correlations',
          nextAt: 7
        };
      case 2:
        return {
          name: 'Early Insights',
          message: 'Early insights available! Accuracy will improve as you continue tracking.',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          nextUnlock: 'Weekly Comparisons & Predictions',
          nextAt: 14
        };
      case 3:
        return {
          name: 'Advanced Analytics',
          message: 'Great data! Unlocking advanced insights.',
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/30',
          nextUnlock: 'Monthly Trends & Full Analytics',
          nextAt: 30
        };
      case 4:
        return {
          name: 'Full Analytics',
          message: 'Full analytics unlocked!',
          color: 'text-green-glow',
          bgColor: 'bg-green-glow/10',
          borderColor: 'border-green-glow/30',
          nextUnlock: null,
          nextAt: null
        };
      default:
        return {};
    }
  };

  const tierInfo = getTierInfo(currentTier);

  // Calculate statistics
  const stats = useMemo(() => {
    if (sleepLog.length === 0) return null;

    const today = new Date();
    let startDate = new Date();

    switch (timePeriod) {
      case 'Week':
        startDate = subDays(today, 6); // 7 days including today
        break;
      case 'Month':
        startDate = subDays(today, 29); // 30 days including today
        break;
      case 'All Time':
        startDate = new Date(0);
        break;
      default:
        break;
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    // Include today if logged, 7 days total (today + 6 days ago)
    const filteredSleep = sleepLog.filter(e => e.date >= startDateStr && e.date <= todayStr);

    if (filteredSleep.length === 0) return null;

    // Calculate averages (use totalSleep for new entries, fall back to hours for legacy)
    const totalHours = filteredSleep.reduce((acc, e) => acc + (e.totalSleep ?? e.hours), 0);
    const avgHours = totalHours / filteredSleep.length;

    const totalQuality = filteredSleep.reduce((acc, e) => acc + e.quality, 0);
    const avgQuality = totalQuality / filteredSleep.length;

    // Calculate sleep debt
    const targetTotal = filteredSleep.length * SLEEP_TARGET;
    const sleepDebt = Math.max(0, targetTotal - totalHours);

    // Best and worst weeks (Tier 3+)
    const weeklyAverages = {};
    filteredSleep.forEach(entry => {
      const weekStart = format(startOfWeek(new Date(entry.date)), 'yyyy-MM-dd');
      if (!weeklyAverages[weekStart]) {
        weeklyAverages[weekStart] = { hours: [], quality: [] };
      }
      weeklyAverages[weekStart].hours.push(entry.totalSleep ?? entry.hours);
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
      if ((entry.totalSleep ?? entry.hours) >= 7) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Quality distribution for pie chart
    const qualityDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
    filteredSleep.forEach(entry => {
      qualityDistribution[entry.quality] = (qualityDistribution[entry.quality] || 0) + 1;
    });

    // Check for sleep warning (3+ nights < 6 hours) - Tier 3+
    let sleepWarning = null;
    const last3Nights = sleepLog
      .filter(e => e.date >= format(subDays(today, 3), 'yyyy-MM-dd'))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);

    if (last3Nights.length >= 3) {
      const avgLast3 = last3Nights.reduce((acc, e) => acc + (e.totalSleep ?? e.hours), 0) / last3Nights.length;
      if (avgLast3 < 6) {
        sleepWarning = `You've averaged ${avgLast3.toFixed(1)} hours for 3+ nights. This typically precedes overwhelmed days.`;
      }
    }

    // Monthly comparison (Tier 4+)
    let monthComparison = null;
    if (currentTier >= 4) {
      const lastMonthStart = format(subMonths(today, 1), 'yyyy-MM-dd');
      const thisMonthStart = format(subDays(today, 29), 'yyyy-MM-dd'); // 30 days including today
      // Include today if logged
      const thisMonthSleep = sleepLog.filter(e => e.date >= thisMonthStart && e.date <= todayStr);
      const lastMonthSleep = sleepLog.filter(e => e.date >= lastMonthStart && e.date < thisMonthStart);

      if (thisMonthSleep.length > 0 && lastMonthSleep.length > 0) {
        const thisMonthAvg = thisMonthSleep.reduce((a, e) => a + (e.totalSleep ?? e.hours), 0) / thisMonthSleep.length;
        const lastMonthAvg = lastMonthSleep.reduce((a, e) => a + (e.totalSleep ?? e.hours), 0) / lastMonthSleep.length;
        monthComparison = {
          thisMonth: thisMonthAvg.toFixed(1),
          lastMonth: lastMonthAvg.toFixed(1),
          difference: (thisMonthAvg - lastMonthAvg).toFixed(1)
        };
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
      worstWeekAvg: worstAvg !== Infinity ? worstAvg.toFixed(1) : null,
      qualityDistribution,
      sleepWarning,
      monthComparison
    };
  }, [sleepLog, timePeriod, currentTier]);

  // Sleep-Mood Correlation (Tier 2+)
  const correlation = useMemo(() => {
    if (currentTier < 2 || sleepLog.length === 0 || moodLog.length === 0) {
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
      if (mood !== undefined) {
        if (mood >= 4) {
          happyDaysSleep.push(sleepEntry.totalSleep ?? sleepEntry.hours);
        } else if (mood <= 2) {
          stressedDaysSleep.push(sleepEntry.totalSleep ?? sleepEntry.hours);
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
  }, [sleepLog, moodLog, currentTier]);

  // Sleep-Productivity Correlation (Tier 2+)
  const productivityCorrelation = useMemo(() => {
    if (currentTier < 2 || sleepLog.length === 0 || completedTasks.length === 0) {
      return { text: 'Not enough data' };
    }

    const tasksByDate = {};
    completedTasks.forEach(task => {
      const date = task.completedAt?.split('T')[0];
      if (date) {
        tasksByDate[date] = (tasksByDate[date] || 0) + 1;
      }
    });

    const wellRestedDays = [];
    const tiredDays = [];

    sleepLog.forEach(sleepEntry => {
      const tasksCompleted = tasksByDate[sleepEntry.date] || 0;
      const sleep = sleepEntry.totalSleep ?? sleepEntry.hours;
      if (sleep >= 7) {
        wellRestedDays.push(tasksCompleted);
      } else if (sleep < 6) {
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
  }, [sleepLog, completedTasks, currentTier]);

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
      const sortedDates = [...sleepLog].sort((a, b) => a.date.localeCompare(b.date));
      dates = sortedDates.map(e => e.date);
      labels = dates.map((d, i) => i % Math.ceil(dates.length / 10) === 0 ? format(new Date(d), 'M/d') : '');
    }

    const sleepByDate = {};
    sleepLog.forEach(e => {
      sleepByDate[e.date] = e;
    });

    const moodByDate = {};
    moodLog.forEach(e => {
      moodByDate[e.date] = e.level;
    });

    const hoursData = dates.map(date => {
      const entry = sleepByDate[date];
      return entry ? (entry.totalSleep ?? entry.hours) : null;
    });
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
            gradient.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#a855f7',
          pointHoverBorderColor: '#a855f7',
          pointHoverBorderWidth: 2,
          spanGaps: true,
          yAxisID: 'y'
        },
        ...(currentTier >= 2 ? [{
          label: 'Mood',
          data: moodData,
          borderColor: '#eab308',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(234, 179, 8, 0.15)');
            gradient.addColorStop(1, 'rgba(234, 179, 8, 0)');
            return gradient;
          },
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#eab308',
          pointHoverBorderColor: '#eab308',
          pointHoverBorderWidth: 2,
          spanGaps: true,
          yAxisID: 'y1'
        }] : [])
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
        bodyColor: '#e4e5e9',
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            if (context.dataset.label === 'Sleep Hours') {
              return ` Sleep: ${context.parsed.y}h`;
            } else if (context.dataset.label === 'Mood') {
              const level = context.parsed.y;
              return ` Mood: ${moodLabels[level] || level}`;
            }
            return context.parsed.y;
          },
          labelColor: (context) => {
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: context.dataset.borderColor,
            };
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
      ...(currentTier >= 2 ? {
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
        }
      } : {})
    },
    animation: {
      duration: 300,
      easing: 'easeInOut',
    },
  };

  // Quality Pie Chart Component - premium styling with gradients and glow
  // No animation - renders instantly for snappy performance
  const QualityPieChart = ({ distribution, total }) => {
    const [hoveredSegment, setHoveredSegment] = useState(null);

    if (!distribution || total === 0) return null;

    const size = 180;
    const center = size / 2;
    const radius = 70;
    const innerRadius = 40; // Donut hole for modern look

    // Quality order: Excellent first (most positive)
    const qualities = [4, 3, 2, 1];

    // Gradient color pairs for each quality level (matching mood tracker colors)
    const gradientColors = {
      4: { start: '#fbbf24', end: '#eab308' }, // yellow - Excellent (matches mood "Great")
      3: { start: '#4fe39f', end: '#3dd68c' }, // green - Good (matches mood "Good")
      2: { start: '#fb923c', end: '#f97316' }, // orange - Fair (matches mood "Down")
      1: { start: '#f87171', end: '#ef4444' }  // red - Poor (matches mood "Rocky")
    };

    // Calculate pie segments
    const segments = [];
    let currentAngle = -90; // Start from top

    qualities.forEach((quality) => {
      const count = distribution[quality] || 0;
      if (count === 0) return;

      const percentage = (count / total) * 100;
      const angle = (percentage / 100) * 360;

      segments.push({
        quality,
        count,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: qualityColors[quality],
        gradient: gradientColors[quality]
      });

      currentAngle += angle;
    });

    // Convert angle to radians
    const toRadians = (angle) => (angle * Math.PI) / 180;

    // Create arc path for pie segment
    const createArcPath = (startAngle, endAngle, outerR, innerR) => {
      const startOuter = {
        x: center + outerR * Math.cos(toRadians(startAngle)),
        y: center + outerR * Math.sin(toRadians(startAngle))
      };
      const endOuter = {
        x: center + outerR * Math.cos(toRadians(endAngle)),
        y: center + outerR * Math.sin(toRadians(endAngle))
      };
      const startInner = {
        x: center + innerR * Math.cos(toRadians(endAngle)),
        y: center + innerR * Math.sin(toRadians(endAngle))
      };
      const endInner = {
        x: center + innerR * Math.cos(toRadians(startAngle)),
        y: center + innerR * Math.sin(toRadians(startAngle))
      };

      const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

      return `
        M ${startOuter.x} ${startOuter.y}
        A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}
        L ${startInner.x} ${startInner.y}
        A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}
        Z
      `;
    };

    return (
      <div className="flex items-center gap-6">
        {/* Pie Chart with glow container */}
        <div
          className="relative"
          style={{
            width: size,
            height: size,
            filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.15))'
          }}
        >
          <svg width={size} height={size}>
            {/* Gradient definitions */}
            <defs>
              {qualities.map((quality) => (
                <linearGradient
                  key={`gradient-${quality}`}
                  id={`pieGradient-${quality}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={gradientColors[quality].start} />
                  <stop offset="100%" stopColor={gradientColors[quality].end} />
                </linearGradient>
              ))}
              {/* Glow filter for hover */}
              <filter id="pieGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background circle for empty space */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="#1a1f2e"
            />
            <circle
              cx={center}
              cy={center}
              r={innerRadius}
              fill="#0d1117"
            />

            {/* Pie segments */}
            {segments.map((segment, index) => {
              const isHovered = hoveredSegment === segment.quality;
              const hoverRadius = isHovered ? radius + 4 : radius;

              return (
                <path
                  key={segment.quality}
                  d={createArcPath(segment.startAngle, segment.endAngle, hoverRadius, innerRadius)}
                  fill={`url(#pieGradient-${segment.quality})`}
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 12px ${segment.color}80)` : `drop-shadow(0 0 6px ${segment.color}40)`,
                    cursor: 'pointer',
                    transition: 'filter 0.2s ease-out'
                  }}
                  onMouseEnter={() => setHoveredSegment(segment.quality)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              );
            })}

            {/* Inner circle overlay for clean donut look */}
            <circle
              cx={center}
              cy={center}
              r={innerRadius - 1}
              fill="#0d1117"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-text-primary">{total}</span>
            <span className="text-xs text-text-tertiary">nights</span>
          </div>
        </div>

        {/* Legend with hover interaction */}
        <div className="flex flex-col gap-2.5">
          {qualities.map((quality) => {
            const count = distribution[quality] || 0;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            const color = qualityColors[quality];
            const isHovered = hoveredSegment === quality;

            return (
              <div
                key={quality}
                className={`flex items-center gap-2.5 px-2 py-1 rounded-lg transition-all duration-200 cursor-pointer ${isHovered ? 'bg-bg-primary' : ''}`}
                onMouseEnter={() => setHoveredSegment(quality)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div
                  className="w-3 h-3 rounded-full transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${gradientColors[quality].start}, ${gradientColors[quality].end})`,
                    boxShadow: isHovered ? `0 0 10px ${color}80` : `0 0 4px ${color}40`
                  }}
                />
                <span className={`text-xs w-16 transition-colors duration-200 ${isHovered ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {qualityLabels[quality]}
                </span>
                <span
                  className="text-xs font-semibold transition-all duration-200"
                  style={{
                    color: isHovered ? color : `${color}cc`,
                    textShadow: isHovered ? `0 0 8px ${color}60` : 'none'
                  }}
                >
                  {percentage}%
                </span>
                {isHovered && count > 0 && (
                  <span className="text-[10px] text-text-tertiary ml-1">
                    ({count} {count === 1 ? 'night' : 'nights'})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Locked feature card component
  const LockedFeature = ({ title, unlocksAt }) => (
    <div className="bg-bg-tertiary/50 rounded-xl p-4 border border-bg-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-bg-primary/60 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="text-center">
          <Lock size={20} className="mx-auto text-text-tertiary mb-2" />
          <p className="text-xs text-text-tertiary">Unlocks at {unlocksAt} days</p>
        </div>
      </div>
      <div className="opacity-30">
        <p className="text-sm font-medium text-text-primary mb-2">{title}</p>
        <div className="h-8 bg-bg-primary rounded" />
      </div>
    </div>
  );

  // Progress bar component with inline styles (fixes Tailwind dynamic class issue)
  // No width animation - renders instantly for snappy performance
  const ProgressBar = ({ current, target, tierLevel = 1 }) => {
    const percentage = Math.min((current / target) * 100, 100);
    const barColor = tierColors[tierLevel] || tierColors[1];

    return (
      <div className="w-full h-2.5 bg-bg-primary rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 10px ${barColor}60, 0 0 20px ${barColor}30`,
          }}
        />
      </div>
    );
  };

  // Recent sleep log component
  const RecentSleepLog = () => {
    const recentEntries = [...sleepLog]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    if (recentEntries.length === 0) return null;

    return (
      <div className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary">
        <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
          <Clock size={14} className="text-purple-400" />
          Recent Sleep Entries
        </h4>
        <div className="space-y-2">
          {recentEntries.map((entry) => {
            const total = entry.totalSleep ?? entry.hours;
            const hasNap = entry.napDuration && entry.napDuration > 0;

            return (
              <div key={entry.date} className="flex items-center justify-between py-2 border-b border-bg-primary last:border-0">
                <span className="text-sm text-text-secondary">
                  {format(new Date(entry.date), 'MMM d')}
                </span>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-medium text-purple-400">{total}h</span>
                    {hasNap && (
                      <span className="text-[10px] text-text-tertiary ml-1">
                        ({entry.nightSleep}h + {entry.napDuration}h nap)
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full`} style={{ backgroundColor: `${qualityColors[entry.quality]}20`, color: qualityColors[entry.quality] }}>
                    {qualityLabels[entry.quality]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Empty state
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
          <div>
            <h3 className="text-xl font-bold text-text-primary">Sleep Analytics</h3>
            <p className={`text-xs ${tierInfo.color}`}>{tierInfo.name}</p>
          </div>
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

      {/* Tier Progress Banner */}
      <div
        className={`mb-6 p-4 rounded-xl ${tierInfo.bgColor} border ${tierInfo.borderColor}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className={`text-sm font-medium ${tierInfo.color} mb-1`}>{tierInfo.message}</p>
            {tierInfo.nextUnlock && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                  <span>Progress to next tier</span>
                  <span>{daysLogged}/{tierInfo.nextAt} days</span>
                </div>
                <ProgressBar current={daysLogged} target={tierInfo.nextAt} tierLevel={currentTier} />
                <p className="text-xs text-text-tertiary mt-2 flex items-center gap-1">
                  <ArrowRight size={12} />
                  Next unlock: {tierInfo.nextUnlock}
                </p>
              </div>
            )}
          </div>
          {currentTier === 4 && (
            <Trophy size={32} className="text-yellow-500" />
          )}
        </div>
      </div>

      {/* Tier 3+ Sleep Warning */}
      {currentTier >= 3 && stats?.sleepWarning && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 mt-0.5" />
          <p className="text-sm text-red-400">{stats.sleepWarning}</p>
        </div>
      )}

      {/* Stats Cards - Always shown */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary">
            <p className="text-xs text-text-tertiary mb-1">Avg Sleep</p>
            <p className="text-2xl font-bold text-purple-400">{stats.avgHours}h</p>
            <p className="text-xs text-text-tertiary">{stats.daysTracked} days tracked</p>
          </div>

          <div className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary">
            <p className="text-xs text-text-tertiary mb-1">Sleep Debt</p>
            <p className={`text-2xl font-bold ${parseFloat(stats.sleepDebt) > 5 ? 'text-red-500' : parseFloat(stats.sleepDebt) > 0 ? 'text-orange-500' : 'text-green-glow'}`}>
              {stats.sleepDebt}h
            </p>
            <p className="text-xs text-text-tertiary">vs {SLEEP_TARGET}h target</p>
          </div>

          <div className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary">
            <p className="text-xs text-text-tertiary mb-1 flex items-center gap-1">
              <Trophy size={12} className="text-yellow-500" />
              Goal Streak
            </p>
            <p className="text-2xl font-bold text-yellow-500">{stats.currentStreak}</p>
            <p className="text-xs text-text-tertiary">nights at 7+ hours</p>
          </div>

          <div className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary">
            <p className="text-xs text-text-tertiary mb-1">Avg Quality</p>
            <p className="text-2xl font-bold text-text-primary">{stats.avgQuality}/4</p>
            <p className="text-xs text-text-tertiary">
              {parseFloat(stats.avgQuality) >= 3 ? 'Good' : parseFloat(stats.avgQuality) >= 2 ? 'Fair' : 'Needs work'}
            </p>
          </div>
        </div>
      )}

      {/* Tier 1: Quality Distribution & Recent Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Quality Rings - Always shown */}
        {stats && stats.qualityDistribution && (
          <div className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary">
            <h4 className="text-sm font-medium text-text-primary mb-4">Sleep Quality Distribution</h4>
            <div className="flex justify-center">
              <QualityPieChart
                distribution={stats.qualityDistribution}
                total={stats.daysTracked}
              />
            </div>
          </div>
        )}

        {/* Recent Sleep Log - Always shown */}
        <div>
          <RecentSleepLog />
        </div>
      </div>

      {/* Tier 2+: Correlation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {currentTier >= 2 ? (
          <>
            {/* Sleep-Mood Correlation */}
            <div className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary relative">
              {currentTier === 2 && (
                <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full">
                  Limited data
                </span>
              )}
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
            </div>

            {/* Sleep-Productivity Correlation */}
            <div className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary relative">
              {currentTier === 2 && (
                <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full">
                  Limited data
                </span>
              )}
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
            </div>
          </>
        ) : (
          <>
            <LockedFeature title="Sleep-Mood Correlation" unlocksAt={7} />
            <LockedFeature title="Sleep-Productivity Link" unlocksAt={7} />
          </>
        )}
      </div>

      {/* Tier 3+: Best/Worst Weeks & Sleep Debt Tracking */}
      {currentTier >= 3 && stats && stats.bestWeek && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-glow/10 rounded-xl p-4 border border-green-glow/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-glow" />
              <p className="text-xs text-green-glow font-medium">Best Week</p>
            </div>
            <p className="text-lg font-bold text-green-glow">{stats.bestWeekAvg}h avg</p>
            <p className="text-xs text-text-tertiary">Week of {stats.bestWeek}</p>
          </div>

          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-500" />
              <p className="text-xs text-red-500 font-medium">Worst Week</p>
            </div>
            <p className="text-lg font-bold text-red-500">{stats.worstWeekAvg}h avg</p>
            <p className="text-xs text-text-tertiary">Week of {stats.worstWeek}</p>
          </div>
        </div>
      )}

      {/* Tier 3: Preview of locked features */}
      {currentTier === 3 && (
        <div className="mb-6">
          <LockedFeature title="Month-over-Month Comparison" unlocksAt={30} />
        </div>
      )}

      {/* Tier 4: Monthly Comparison */}
      {currentTier >= 4 && stats?.monthComparison && (
        <div className="mb-6 bg-bg-tertiary rounded-xl p-4 border border-bg-primary">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-purple-400" />
            <p className="text-sm font-medium text-text-primary">Month-over-Month</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-text-tertiary mb-1">This Month</p>
              <p className="text-lg font-bold text-purple-400">{stats.monthComparison.thisMonth}h</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-tertiary mb-1">Last Month</p>
              <p className="text-lg font-bold text-text-secondary">{stats.monthComparison.lastMonth}h</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-tertiary mb-1">Change</p>
              <p className={`text-lg font-bold flex items-center justify-center gap-1 ${parseFloat(stats.monthComparison.difference) >= 0 ? 'text-green-glow' : 'text-red-500'}`}>
                {parseFloat(stats.monthComparison.difference) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {stats.monthComparison.difference}h
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart - Tier 2+ gets mood overlay */}
      <div className="bg-bg-tertiary rounded-xl p-4 border border-bg-primary">
        <h4 className="text-sm font-medium text-text-primary mb-4">
          {currentTier >= 2 ? 'Sleep & Mood Trends' : 'Sleep Trends'}
        </h4>
        <div className="h-[250px]">
          <Line data={getChartData()} options={chartOptions} />
        </div>
      </div>

      {/* Tier 1: What's Coming */}
      {currentTier === 1 && (
        <div className="mt-6 p-4 bg-bg-tertiary rounded-xl border border-bg-primary">
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-yellow-500" />
            Coming Soon as You Track More
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-text-tertiary">
              <Lock size={12} />
              <span>Sleep-Mood Correlations (7 days)</span>
            </div>
            <div className="flex items-center gap-2 text-text-tertiary">
              <Lock size={12} />
              <span>Productivity Insights (7 days)</span>
            </div>
            <div className="flex items-center gap-2 text-text-tertiary">
              <Lock size={12} />
              <span>Weekly Comparisons (14 days)</span>
            </div>
            <div className="flex items-center gap-2 text-text-tertiary">
              <Lock size={12} />
              <span>Monthly Trends (30 days)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SleepAnalytics;
