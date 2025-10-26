import { useState, useEffect, memo } from 'react';
import { Check, Circle, Clock, AlertCircle, ChevronDown, Sparkles, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CircularProgress from './CircularProgress';
import QuoteWidget from './QuoteWidget';

// Memoized task card component for performance
const TaskCard = memo(({ task, isExpanded, justCompletedId, onToggleExpand, onStatusChange, onOpenUrl }) => {
  const isOverdue = (task) => {
    if (!task.dueDate || task.status === 'complete') return false;
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    return dueDate < now;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <Check size={18} className="text-green-glow" />;
      case 'in-progress':
        return <Clock size={18} className="text-yellow-500" />;
      default:
        return <Circle size={18} className="text-text-tertiary" />;
    }
  };

  const getCardGlow = (task, isOverdue) => {
    if (isOverdue) {
      return 'task-glow-overdue';
    }
    switch (task.status) {
      case 'complete':
        return 'task-glow-complete';
      case 'in-progress':
        return 'task-glow-in-progress';
      default:
        return 'task-glow-not-started';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const taskIsOverdue = isOverdue(task);
  const isJustCompleted = justCompletedId === task.id;
  const glowClass = getCardGlow(task, taskIsOverdue);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{
        opacity: isJustCompleted ? [1, 1, 0] : 1,
        y: 0,
        scale: isJustCompleted ? [1, 1.02, 1] : 1,
      }}
      exit={{ opacity: 0, scale: 0.9, height: 0 }}
      transition={{
        layout: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
        opacity: isJustCompleted ? { delay: 1.2, duration: 0.3 } : { duration: 0.2 },
        scale: { duration: 0.4, ease: "easeInOut" }
      }}
      className={`relative bg-bg-tertiary rounded-lg p-3 border transition-all cursor-pointer ${glowClass} ${
        taskIsOverdue ? 'border-red-500/50' : 'border-bg-primary hover:border-green-glow/30'
      }`}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      onClick={() => onToggleExpand(task.id)}
    >
      {/* Confetti Effect */}
      <AnimatePresence>
        {isJustCompleted && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: (Math.random() - 0.5) * 80,
                  y: (Math.random() - 0.5) * 80,
                  scale: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.05 }}
                className="absolute top-2 left-8 pointer-events-none"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i % 3 === 0 ? '#3dd68c' : i % 3 === 1 ? '#2aba73' : '#4fe39f',
                  willChange: 'transform, opacity',
                }}
              />
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 1] }}
              transition={{ duration: 0.6 }}
              className="absolute top-1 left-6 pointer-events-none"
            >
              <Sparkles className="text-green-glow" size={20} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Checkbox */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(task.id);
            }}
            className="flex-shrink-0"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {getStatusIcon(task.status)}
          </motion.button>

          {/* Task Info */}
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${
              task.status === 'complete'
                ? 'text-text-secondary line-through'
                : 'text-text-primary'
            }`}>
              {task.title}
            </p>
            {task.dueDate && (
              <p className={`text-xs flex items-center gap-1 mt-0.5 ${
                taskIsOverdue ? 'text-red-500 font-semibold' : 'text-text-tertiary'
              }`}>
                {taskIsOverdue ? <AlertCircle size={10} /> : <Clock size={10} />}
                {formatDate(task.dueDate)}
              </p>
            )}
          </div>
        </div>

        {/* Status & Expand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {taskIsOverdue && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded font-semibold">
              OVERDUE
            </span>
          )}
          {(task.description || task.url) && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <ChevronDown size={16} className="text-text-tertiary" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence mode="wait">
        {isExpanded && (task.description || task.url) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
            style={{ willChange: 'height, opacity' }}
          >
            <div className="mt-3 pt-3 border-t border-bg-primary space-y-2">
              {task.description && (
                <p className="text-sm text-text-secondary">
                  {task.description}
                </p>
              )}
              {task.url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUrl(task.url);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-green-glow hover:text-green-glow/80 transition-colors group"
                >
                  <ExternalLink size={14} className="group-hover:scale-110 transition-transform" />
                  <span className="underline">Open Link</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

TaskCard.displayName = 'TaskCard';

const Dashboard = ({ setActiveTab }) => {
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [justCompletedId, setJustCompletedId] = useState(null);

  useEffect(() => {
    const calculateProgress = () => {
      const semesterStartDate = localStorage.getItem('semesterStartDate') || '2025-08-25';
      const semesterEndDate = localStorage.getItem('semesterEndDate') || '2025-12-11';

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const startDate = new Date(semesterStartDate + 'T12:00:00');
      const endDate = new Date(semesterEndDate + 'T12:00:00');

      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const notStartedYet = today < startDate;

      if (notStartedYet) {
        setDaysRemaining(-1);
        setProgressPercentage(0);
      } else {
        setDaysRemaining(diffDays);

        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
        const percentage = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100);
        setProgressPercentage(percentage);
      }
    };

    calculateProgress();

    const handleStorageChange = () => {
      calculateProgress();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('semesterDatesChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('semesterDatesChanged', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const loadTasks = () => {
      const storedTasks = localStorage.getItem('tasks');
      if (storedTasks) {
        try {
          const parsedTasks = JSON.parse(storedTasks);
          setTasks(parsedTasks);
        } catch (error) {
          console.error('Error loading tasks:', error);
          setTasks([]);
        }
      }
    };

    loadTasks();

    const handleTasksChange = () => {
      loadTasks();
    };

    window.addEventListener('storage', handleTasksChange);

    return () => {
      window.removeEventListener('storage', handleTasksChange);
    };
  }, []);

  const isOverdue = (task) => {
    if (!task.dueDate || task.status === 'complete') return false;
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    return dueDate < now;
  };

  const handleStatusChange = (taskId) => {
    const task = tasks.find(t => t.id === taskId);

    if (task && task.status === 'in-progress') {
      // Trigger celebration animation
      setJustCompletedId(taskId);

      // After animation, delete task and save to completedTasks
      setTimeout(() => {
        const completedTask = { ...task, status: 'complete', completedAt: new Date().toISOString() };
        const existingCompleted = JSON.parse(localStorage.getItem('completedTasks') || '[]');
        localStorage.setItem('completedTasks', JSON.stringify([completedTask, ...existingCompleted]));

        // Remove from active tasks
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        setTasks(updatedTasks);
        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
        window.dispatchEvent(new Event('storage'));
        setJustCompletedId(null);
      }, 1500);
    }

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        let newStatus;
        if (t.status === 'not-started') {
          newStatus = 'in-progress';
        } else if (t.status === 'in-progress') {
          newStatus = 'complete';
        } else {
          newStatus = 'not-started';
        }
        return { ...t, status: newStatus };
      }
      return t;
    });

    setTasks(updatedTasks);
    if (task && task.status !== 'in-progress') {
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleOpenUrl = (url) => {
    if (!url) return;
    if (window.require) {
      try {
        const { shell } = window.require('electron');
        shell.openExternal(url);
      } catch (error) {
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  // Sort and limit tasks for dashboard - show top 5
  const displayTasks = tasks
    .sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      if (aOverdue && bOverdue) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }

      const aHasPriority = (a.customPriority ?? 0) > 0;
      const bHasPriority = (b.customPriority ?? 0) > 0;

      if (aHasPriority && !bHasPriority) return -1;
      if (!aHasPriority && bHasPriority) return 1;

      if (aHasPriority && bHasPriority) {
        return (b.customPriority ?? 0) - (a.customPriority ?? 0);
      }

      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .slice(0, 5); // Show up to 5 tasks

  return (
    <>
      <style>
        {`
          @keyframes pulse-red-glow {
            0%, 100% {
              box-shadow: 0 0 20px rgba(255, 50, 50, 0.4);
            }
            50% {
              box-shadow: 0 0 35px rgba(255, 50, 50, 0.7);
            }
          }

          .task-glow-not-started {
            box-shadow: 0 0 12px rgba(255, 100, 100, 0.25);
          }

          .task-glow-not-started:hover {
            box-shadow: 0 0 18px rgba(255, 100, 100, 0.4);
          }

          .task-glow-in-progress {
            box-shadow: 0 0 18px rgba(255, 200, 100, 0.4);
          }

          .task-glow-in-progress:hover {
            box-shadow: 0 0 24px rgba(255, 200, 100, 0.6);
          }

          .task-glow-complete {
            box-shadow: 0 0 12px rgba(61, 214, 140, 0.25);
          }

          .task-glow-complete:hover {
            box-shadow: 0 0 18px rgba(61, 214, 140, 0.4);
          }

          .task-glow-overdue {
            animation: pulse-red-glow 2s ease-in-out infinite;
          }

          .task-glow-overdue:hover {
            animation: pulse-red-glow 2s ease-in-out infinite;
            box-shadow: 0 0 40px rgba(255, 50, 50, 0.8) !important;
          }
        `}
      </style>
      <div className="h-full p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header with Circular Progress */}
          <div className="mb-8 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-text-primary mb-2">
                Welcome Back! 👋
              </h2>
              <p className="text-text-secondary mb-4">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <QuoteWidget />
            </div>

            {daysRemaining !== null && (
              <CircularProgress
                daysRemaining={daysRemaining}
                progressPercentage={progressPercentage}
              />
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task List */}
            <div className="lg:col-span-2 bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Today's Tasks
              </h3>

              {displayTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-2">No tasks yet!</p>
                  <button
                    onClick={() => setActiveTab && setActiveTab('tasks')}
                    className="text-green-glow hover:underline text-sm"
                  >
                    Create your first task →
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {displayTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isExpanded={expandedTaskId === task.id}
                          justCompletedId={justCompletedId}
                          onToggleExpand={(id) => setExpandedTaskId(expandedTaskId === id ? null : id)}
                          onStatusChange={handleStatusChange}
                          onOpenUrl={handleOpenUrl}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={() => setActiveTab && setActiveTab('tasks')}
                    className="w-full mt-4 text-green-glow hover:text-green-glow/80 text-sm font-medium flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-bg-tertiary transition-all"
                  >
                    View All Tasks →
                  </button>
                </>
              )}
            </div>

            {/* Timer Placeholder */}
            <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Pomodoro Timer
              </h3>
              <div className="flex items-center justify-center h-32">
                <div className="text-6xl font-bold text-green-glow">
                  50:00
                </div>
              </div>
              <p className="text-text-tertiary text-sm mt-4 text-center">
                Timer coming in Week 4
              </p>
            </div>

            {/* Calendar Placeholder */}
            <div className="lg:col-span-3 bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Calendar
              </h3>
              <div className="h-64 bg-bg-tertiary rounded-lg flex items-center justify-center">
                <p className="text-text-tertiary">
                  Calendar view coming in Week 2
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
