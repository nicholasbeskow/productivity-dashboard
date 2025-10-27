import { useState, useEffect } from 'react';
import { BarChart3, Flame } from 'lucide-react';
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

    if (timePeriod === 'Week') {
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
      const firstTaskDate = new Date(Math.min(...completedTasks.map(t => new Date(t.completedAt))));
      firstTaskDate.setHours(12, 0, 0, 0);

      const totalDays = Math.ceil((today - firstTaskDate) / (1000 * 60 * 60 * 24));

      if (totalDays < 30) {
        // Show all days
        for (let i = 0; i <= totalDays; i++) {
          const date = new Date(firstTaskDate);
          date.setDate(firstTaskDate.getDate() + i);
          dates.push(date);
          labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
        }
      } else if (totalDays < 90) {
        // Show weekly markers
        for (let i = 0; i <= totalDays; i++) {
          const date = new Date(firstTaskDate);
          date.setDate(firstTaskDate.getDate() + i);
          dates.push(date);

          if (i % 7 === 0 || i === totalDays) {
            labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
          } else {
            labels.push('');
          }
        }
      } else {
        // Show monthly markers
        const interval = Math.ceil(totalDays / 12);
        for (let i = 0; i <= totalDays; i++) {
          const date = new Date(firstTaskDate);
          date.setDate(firstTaskDate.getDate() + i);
          dates.push(date);

          if (i % interval === 0 || i === totalDays) {
            labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
          } else {
            labels.push('');
          }
        }
      }
    }

    // Count tasks for each date
    const data = dates.map(date => {
      return completedTasks.filter(task => {
        const completedDate = new Date(task.completedAt);
        completedDate.setHours(12, 0, 0, 0);
        return completedDate.toDateString() === date.toDateString();
      }).length;
    });

    return {
      labels,
      datasets: [{
        data,
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
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(10, 14, 20, 0.95)',
        titleColor: '#9195a0',
        bodyColor: '#3dd68c',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            const dates = getChartData().labels;
            return dates[index] || '';
          },
          label: (context) => {
            const count = context.parsed.y;
            return `${count} ${count === 1 ? 'task' : 'tasks'}`;
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
  const currentStreak = calculateCurrentStreak();
  const thisWeek = calculateThisWeek();
  const thisMonth = calculateThisMonth();
  const mostProductiveDay = calculateMostProductiveDay();
  const averagePerDay = calculateAveragePerDay();

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <BarChart3 className="text-green-glow" size={32} />
            Your Statistics
          </h2>
          <p className="text-text-secondary">
            Track your productivity and progress
          </p>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Card 1 - Total Completed (Most Prominent) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
            className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
          >
            <p className="text-text-secondary text-sm mb-2">Total Completed</p>
            <div className="text-5xl font-bold text-green-glow mb-1">
              {totalCompleted}
            </div>
            <p className="text-text-tertiary text-xs">
              {totalCompleted === 1 ? 'task' : 'tasks'} completed all time
            </p>
          </motion.div>

          {/* Card 2 - Current Streak */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
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

          {/* Card 3 - This Week */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
          >
            <p className="text-text-secondary text-sm mb-2">This Week</p>
            <div className="text-4xl font-bold text-text-primary mb-1">
              {thisWeek}
            </div>
            <p className="text-text-tertiary text-xs">
              {thisWeek === 1 ? 'task' : 'tasks'} completed this week
            </p>
          </motion.div>

          {/* Card 4 - This Month */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
          >
            <p className="text-text-secondary text-sm mb-2">This Month</p>
            <div className="text-4xl font-bold text-text-primary mb-1">
              {thisMonth}
            </div>
            <p className="text-text-tertiary text-xs">
              {thisMonth === 1 ? 'task' : 'tasks'} completed this month
            </p>
          </motion.div>

          {/* Card 5 - Most Productive Day */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
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

          {/* Card 6 - Average Tasks Per Day */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary"
        >
          {/* Time Period Selector */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-text-primary">
              Completion Trend
            </h3>
            <div className="flex gap-2">
              {['Week', 'Month', 'Semester', 'All Time'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timePeriod === period
                      ? 'bg-green-glow bg-opacity-20 text-green-glow'
                      : 'text-text-secondary hover:bg-bg-tertiary'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

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
