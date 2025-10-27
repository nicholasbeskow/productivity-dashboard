import { useState, useEffect } from 'react';
import { BarChart3, Flame, BookOpen, Home } from 'lucide-react';
import { motion } from 'framer-motion';
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

const StatsTab = () => {
  const [completedTasks, setCompletedTasks] = useState([]);
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

  // Calculate stats
  const calculateCurrentStreak = () => {
    if (completedTasks.length === 0) return 0;

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    let currentDate = new Date(today);
    let streak = 0;

    while (true) {
      const hasTaskOnDate = completedTasks.some(task => {
        const completedDate = new Date(task.completedAt);
        completedDate.setHours(12, 0, 0, 0);
        return completedDate.toDateString() === currentDate.toDateString();
      });

      if (hasTaskOnDate) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const calculateThisWeek = () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Get Sunday of current week
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    sunday.setHours(0, 0, 0, 0);

    // Get Saturday of current week
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    return completedTasks.filter(task => {
      const completedDate = new Date(task.completedAt);
      return completedDate >= sunday && completedDate <= saturday;
    }).length;
  };

  const calculateThisMonth = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return completedTasks.filter(task => {
      const completedDate = new Date(task.completedAt);
      return completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear;
    }).length;
  };

  const calculateMostProductiveDay = () => {
    if (completedTasks.length === 0) return 'Not enough data';

    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat

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

  const calculateAveragePerDay = () => {
    if (completedTasks.length === 0) return '0.0';

    const firstTaskDate = new Date(Math.min(...completedTasks.map(t => new Date(t.completedAt))));
    firstTaskDate.setHours(12, 0, 0, 0);

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const diffTime = today - firstTaskDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include first day

    const average = completedTasks.length / diffDays;
    return average.toFixed(1);
  };

  // Chart data calculation
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
            gradient.addColorStop(0, 'rgba(61, 214, 140, 0.2)');
            gradient.addColorStop(1, 'rgba(61, 214, 140, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#3dd68c',
          pointHoverBorderColor: '#3dd68c',
          pointHoverBorderWidth: 2,
        }]
      };
    }

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    let dates = [];
    let labels = [];
    let hours = [];

    if (timePeriod === 'Day') {
      // Today with hourly breakdown (0-23 hours)
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);

      for (let hour = 0; hour < 24; hour++) {
        hours.push(hour);
        // Show labels every 2 hours
        if (hour % 2 === 0) {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          labels.push(`${hour12}${ampm}`);
        } else {
          labels.push('');
        }
      }

      // Count tasks by hour for today - separate by academic/personal
      const academicData = hours.map(hour => {
        return completedTasks.filter(task => {
          const completedDate = new Date(task.completedAt);
          const isToday = completedDate.toDateString() === today.toDateString();
          const isAcademic = (task.taskType || 'academic') === 'academic';
          return isToday && completedDate.getHours() === hour && isAcademic;
        }).length;
      });

      const personalData = hours.map(hour => {
        return completedTasks.filter(task => {
          const completedDate = new Date(task.completedAt);
          const isToday = completedDate.toDateString() === today.toDateString();
          const isPersonal = task.taskType === 'personal';
          return isToday && completedDate.getHours() === hour && isPersonal;
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
              gradient.addColorStop(0, 'rgba(61, 214, 140, 0.2)');
              gradient.addColorStop(1, 'rgba(61, 214, 140, 0)');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#3dd68c',
            pointHoverBackgroundColor: '#3dd68c',
            pointBorderColor: '#3dd68c',
            pointHoverBorderColor: '#3dd68c',
            pointHoverBorderWidth: 2,
          },
          {
            label: 'Personal',
            data: personalData,
            borderColor: '#3b82f6',
            backgroundColor: (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, 400);
              gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
              gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#3b82f6',
            pointHoverBackgroundColor: '#3b82f6',
            pointBorderColor: '#3b82f6',
            pointHoverBorderColor: '#3b82f6',
            pointHoverBorderWidth: 2,
          }
        ]
      };
    } else if (timePeriod === 'Week') {
      // Last 7 days
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        labels.push(dayNames[date.getDay()]);
      }
    } else if (timePeriod === 'Month') {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
        // Show labels for specific days
        const dayOfMonth = date.getDate();
        if ([1, 5, 10, 15, 20, 25, 30].includes(dayOfMonth)) {
          labels.push(dayOfMonth.toString());
        } else {
          labels.push('');
        }
      }
    } else if (timePeriod === 'Semester') {
      const semesterStartDate = localStorage.getItem('semesterStartDate');
      const semesterEndDate = localStorage.getItem('semesterEndDate');

      if (!semesterStartDate || !semesterEndDate) {
        return {
          labels: ['No Data'],
          datasets: [{
            data: [0],
            borderColor: '#3dd68c',
            backgroundColor: 'rgba(61, 214, 140, 0.1)',
          }]
        };
      }

      const startDate = new Date(semesterStartDate + 'T12:00:00');
      const endDate = new Date(semesterEndDate + 'T12:00:00');
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      // Smart interval - show every ~10 days
      const interval = Math.ceil(totalDays / 10);

      for (let i = 0; i <= totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        dates.push(date);

        if (i % interval === 0 || i === totalDays) {
          labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
        } else {
          labels.push('');
        }
      }
    } else if (timePeriod === 'All Time') {
      // Find first and last completion dates
      const completionDates = completedTasks.map(t => new Date(t.completedAt));
      const firstTaskDate = new Date(Math.min(...completionDates));
      const lastTaskDate = new Date(Math.max(...completionDates));

      firstTaskDate.setHours(0, 0, 0, 0);
      lastTaskDate.setHours(23, 59, 59, 999);

      const totalDays = Math.ceil((lastTaskDate - firstTaskDate) / (1000 * 60 * 60 * 24)) + 1;

      if (totalDays <= 30) {
        // Daily view for <= 30 days
        for (let i = 0; i < totalDays; i++) {
          const date = new Date(firstTaskDate);
          date.setDate(date.getDate() + i);
          dates.push(date);

          // Show label every few days based on range
          const showLabel = i % Math.ceil(totalDays / 10) === 0 || i === totalDays - 1;
          labels.push(showLabel ? `${date.getMonth() + 1}/${date.getDate()}` : '');
        }
      } else if (totalDays <= 90) {
        // Weekly aggregation for 30-90 days
        const weeks = Math.ceil(totalDays / 7);

        for (let i = 0; i < weeks; i++) {
          const weekStart = new Date(firstTaskDate);
          weekStart.setDate(weekStart.getDate() + (i * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);

          // Store week range for filtering
          dates.push({ start: weekStart, end: weekEnd, type: 'week' });
          labels.push(`${weekStart.getMonth() + 1}/${weekStart.getDate()}`);
        }
      } else {
        // Monthly aggregation for 90+ days
        const months = Math.ceil(totalDays / 30);

        for (let i = 0; i < months; i++) {
          const monthStart = new Date(firstTaskDate);
          monthStart.setDate(monthStart.getDate() + (i * 30));
          const monthEnd = new Date(monthStart);
          monthEnd.setDate(monthEnd.getDate() + 29);
          monthEnd.setHours(23, 59, 59, 999);

          // Store month range for filtering
          dates.push({ start: monthStart, end: monthEnd, type: 'month' });

          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          labels.push(`${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`);
        }
      }
    }

    // Count tasks for each date - separate by academic/personal
    const academicData = dates.map(date => {
      return completedTasks.filter(task => {
        const completedDate = new Date(task.completedAt);
        const isAcademic = (task.taskType || 'academic') === 'academic';

        // Handle range objects (week/month aggregation)
        if (date.type === 'week' || date.type === 'month') {
          return completedDate >= date.start && completedDate <= date.end && isAcademic;
        }

        // Handle regular Date objects (daily view)
        completedDate.setHours(12, 0, 0, 0);
        return completedDate.toDateString() === date.toDateString() && isAcademic;
      }).length;
    });

    const personalData = dates.map(date => {
      return completedTasks.filter(task => {
        const completedDate = new Date(task.completedAt);
        const isPersonal = task.taskType === 'personal';

        // Handle range objects (week/month aggregation)
        if (date.type === 'week' || date.type === 'month') {
          return completedDate >= date.start && completedDate <= date.end && isPersonal;
        }

        // Handle regular Date objects (daily view)
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
            gradient.addColorStop(0, 'rgba(61, 214, 140, 0.2)');
            gradient.addColorStop(1, 'rgba(61, 214, 140, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#3dd68c',
          pointHoverBorderColor: '#3dd68c',
          pointHoverBorderWidth: 2,
        },
        {
          label: 'Personal',
          data: personalData,
          borderColor: '#3b82f6',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            return gradient;
          },
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#3b82f6',
          pointHoverBorderColor: '#3b82f6',
          pointHoverBorderWidth: 2,
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
          color: '#9195a0',
          usePointStyle: true,
          pointStyle: 'line',
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 14, 20, 0.95)',
        titleColor: '#9195a0',
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            const dates = getChartData().labels;
            return dates[index] || '';
          },
          label: (context) => {
            const count = context.parsed.y;
            const label = context.dataset.label;
            return `${label}: ${count} ${count === 1 ? 'task' : 'tasks'}`;
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
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9195a0',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9195a0',
          stepSize: 1,
          precision: 0,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    animation: {
      duration: 300,
      easing: 'easeInOut',
    },
  };

  const totalCompleted = completedTasks.length;
  const academicCount = completedTasks.filter(task => (task.taskType || 'academic') === 'academic').length;
  const personalCount = completedTasks.filter(task => task.taskType === 'personal').length;
  const currentStreak = calculateCurrentStreak();
  const thisWeek = calculateThisWeek();
  const thisMonth = calculateThisMonth();
  const mostProductiveDay = calculateMostProductiveDay();
  const averagePerDay = calculateAveragePerDay();

  // Calculate stats for selected time period
  const calculatePeriodStats = () => {
    // FIXED: Use end of day instead of noon to include all tasks completed today
    const now = new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of day

    let startDate = new Date(now);
    let periodName = '';
    let averagePeriod = 'day';

    if (timePeriod === 'Day') {
      // Today only
      startDate.setHours(0, 0, 0, 0);
      periodName = 'Today';
      averagePeriod = 'hour';
    } else if (timePeriod === 'Week') {
      // Last 7 days
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      periodName = 'Last 7 Days';
      averagePeriod = 'day';
    } else if (timePeriod === 'Month') {
      // Last 30 days
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      periodName = 'Last 30 Days';
      averagePeriod = 'day';
    } else if (timePeriod === 'Semester') {
      const semesterStartStr = localStorage.getItem('semesterStartDate');
      if (semesterStartStr) {
        startDate = new Date(semesterStartStr + 'T00:00:00');
      }
      periodName = 'This Semester';
      averagePeriod = 'day';
    } else if (timePeriod === 'All Time') {
      if (completedTasks.length > 0) {
        const firstTaskDate = new Date(Math.min(...completedTasks.map(t => new Date(t.completedAt))));
        startDate = new Date(firstTaskDate);
        startDate.setHours(0, 0, 0, 0);
      }
      periodName = 'All Time';
      averagePeriod = 'day';
    }

    // Count tasks in period
    const tasksInPeriod = completedTasks.filter(task => {
      const completedDate = new Date(task.completedAt);
      return completedDate >= startDate && completedDate <= today;
    });

    const periodTotal = tasksInPeriod.length;

    // Calculate average based on period
    let periodAverage = 0;
    if (timePeriod === 'Day') {
      // For day view, show total tasks completed today
      periodAverage = periodTotal;
    } else {
      // Use 'now' for accurate day count calculation (not end of day)
      const totalDays = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
      periodAverage = (periodTotal / totalDays).toFixed(1);
    }

    return { periodName, periodTotal, periodAverage, averagePeriod };
  };

  const periodStats = calculatePeriodStats();

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
              <BarChart3 className="text-green-glow" size={32} />
              Your Statistics
            </h2>
            <p className="text-text-secondary">
              Track your productivity and progress
            </p>
          </div>

          {/* Time Period Selector */}
          <div className="flex gap-2 flex-wrap">
            {['Day', 'Week', 'Month', 'Semester', 'All Time'].map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Card 1 - Total Tasks (with breakdown) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
          >
            <p className="text-text-secondary text-sm mb-2">Total Tasks</p>
            <div className="text-5xl font-bold text-green-glow mb-1">
              {totalCompleted}
            </div>
            <p className="text-text-secondary text-xs">
              {academicCount} Academic • {personalCount} Personal
            </p>
          </motion.div>

          {/* Card 2 - Academic Tasks */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
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

          {/* Card 3 - Personal Tasks */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
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

          {/* Card 4 - Current Streak */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
          >
            <p className="text-text-secondary text-sm mb-2 flex items-center gap-2">
              <Flame className="text-orange-500" size={18} />
              Current Streak
            </p>
            <div className="text-4xl font-bold text-text-primary mb-1">
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </div>
            <p className="text-text-tertiary text-xs">
              {currentStreak === 0 ? 'Complete a task today to start!' : 'Keep it going!'}
            </p>
          </motion.div>

          {/* Card 5 - Period Total (Dynamic) */}
          <motion.div
            key={`period-total-${timePeriod}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-bg-secondary rounded-xl p-6 border border-green-glow/50"
          >
            <p className="text-text-secondary text-sm mb-2">{periodStats.periodName}</p>
            <div className="text-4xl font-bold text-green-glow mb-1">
              {periodStats.periodTotal}
            </div>
            <p className="text-text-tertiary text-xs">
              {periodStats.periodTotal === 1 ? 'task' : 'tasks'} completed
            </p>
          </motion.div>

          {/* Card 6 - Period Average (Dynamic) */}
          <motion.div
            key={`period-avg-${timePeriod}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-bg-secondary rounded-xl p-6 border border-green-glow/50"
          >
            <p className="text-text-secondary text-sm mb-2">
              {timePeriod === 'Day' ? 'Tasks Completed' : 'Daily Average'}
            </p>
            <div className="text-4xl font-bold text-green-glow mb-1">
              {periodStats.periodAverage}
            </div>
            <p className="text-text-tertiary text-xs">
              {timePeriod === 'Day' ? 'tasks today' : `tasks per ${periodStats.averagePeriod}`}
            </p>
          </motion.div>

          {/* Card 7 - Most Productive Day */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
          >
            <p className="text-text-secondary text-sm mb-2">Most Productive Day</p>
            <div className="text-4xl font-bold text-text-primary mb-1">
              {mostProductiveDay === 'Not enough data' ? (
                <span className="text-2xl text-text-tertiary">Not enough data</span>
              ) : (
                mostProductiveDay
              )}
            </div>
            <p className="text-text-tertiary text-xs">
              Based on completion history
            </p>
          </motion.div>

          {/* Card 8 - Average Tasks Per Day */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
          >
            <p className="text-text-secondary text-sm mb-2">Daily Average</p>
            <div className="text-4xl font-bold text-text-primary mb-1">
              {averagePerDay}
            </div>
            <p className="text-text-tertiary text-xs">
              tasks per day
            </p>
          </motion.div>
        </div>

        {/* Line Chart Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
          className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
        >
          {/* Chart Title */}
          <h3 className="text-xl font-semibold text-text-primary mb-6">
            Completion Trend - {timePeriod}
          </h3>

          {/* Chart Container */}
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
            ) : timePeriod === 'Semester' && (!localStorage.getItem('semesterStartDate') || !localStorage.getItem('semesterEndDate')) ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-text-secondary text-lg mb-2">
                    Set semester dates in Settings
                  </p>
                  <p className="text-text-tertiary text-sm">
                    Configure your semester start and end dates to view this chart
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
};

export default StatsTab;
