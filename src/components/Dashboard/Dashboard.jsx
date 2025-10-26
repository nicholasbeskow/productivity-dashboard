import { useState, useEffect } from 'react';
import { Check, Circle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CircularProgress from './CircularProgress';
import QuoteWidget from './QuoteWidget';

const Dashboard = ({ setActiveTab }) => {
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

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

    // Listen for task changes
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
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        let newStatus;
        if (task.status === 'not-started') {
          newStatus = 'in-progress';
        } else if (task.status === 'in-progress') {
          newStatus = 'complete';
        } else {
          newStatus = 'not-started';
        }
        return { ...task, status: newStatus };
      }
      return task;
    });

    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    window.dispatchEvent(new Event('storage'));
  };

  // Sort and limit tasks for dashboard
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
    .slice(0, 7);

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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
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
                  {displayTasks.map((task) => {
                    const taskIsOverdue = isOverdue(task);
                    const isExpanded = expandedTaskId === task.id;

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        className={`bg-bg-tertiary rounded-lg p-3 border transition-all cursor-pointer ${
                          taskIsOverdue ? 'border-red-500/50' : 'border-bg-primary hover:border-green-glow/30'
                        }`}
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(task.id);
                            }}
                            className="hover:scale-110 transition-transform"
                          >
                            {getStatusIcon(task.status)}
                          </button>

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
                                {taskIsOverdue && <AlertCircle size={10} />}
                                <Clock size={10} />
                                {formatDate(task.dueDate)}
                              </p>
                            )}
                          </div>

                          {/* Status & Expand */}
                          <div className="flex items-center gap-2">
                            {taskIsOverdue && (
                              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded font-semibold">
                                OVERDUE
                              </span>
                            )}
                            {task.description && (
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown size={16} className="text-text-tertiary" />
                              </motion.div>
                            )}
                          </div>
                        </div>

                        {/* Expandable Description */}
                        <AnimatePresence>
                          {isExpanded && task.description && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <p className="text-sm text-text-secondary mt-3 pt-3 border-t border-bg-primary">
                                {task.description}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
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
  );
};

export default Dashboard;
