import { useState, useEffect, memo } from 'react';
import { Check, Circle, Clock, AlertCircle, Sparkles, ExternalLink, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CircularProgress from './CircularProgress';

// Memoized task card component for performance
const TaskCard = memo(({ task, isExpanded, justCompletedId, onToggleExpand, onStatusChange, onOpenUrl, draggedTask, dragOverTask, onDragStart, onDragOver, onDrop, onDragEnd }) => {
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

  // Determine checkbox class based on status
  const getCheckboxClass = () => {
    if (taskIsOverdue) return 'checkbox-overdue';
    if (task.status === 'complete') return 'checkbox-complete';
    if (task.status === 'in-progress') return 'checkbox-in-progress';
    return 'checkbox-not-started';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{
        opacity: isJustCompleted ? [1, 1, 0] : 1,
        y: 0,
        scale: isJustCompleted ? [1, 1.02, 1] : draggedTask?.id === task.id ? 1.05 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: isJustCompleted ? { delay: 1.2, duration: 0.3 } : { duration: 0.2 },
        scale: { duration: 0.4, ease: "easeInOut" },
        exit: { duration: 0.3 }
      }}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragOver={(e) => onDragOver(e, task)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, task)}
      className={`relative bg-bg-tertiary rounded-lg p-3 border transition-all cursor-move ${glowClass} ${
        taskIsOverdue ? 'border-red-500/50' :
        dragOverTask?.id === task.id ? 'border-green-glow' :
        'border-bg-primary hover:border-green-glow/30'
      } ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      onClick={() => (task.description || task.url) && !draggedTask && onToggleExpand(task.id)}
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
          {/* Drag Handle */}
          <div className="text-text-tertiary hover:text-green-glow transition-colors cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical size={16} />
          </div>

          {/* Checkbox */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(task.id);
            }}
            className={`flex-shrink-0 ${getCheckboxClass()}`}
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
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (task.description || task.url) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: "easeOut"
            }}
            className="overflow-hidden"
            style={{ willChange: 'height, opacity', transform: 'translateZ(0)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-3 pt-3 border-t border-bg-primary space-y-2"
            >
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

TaskCard.displayName = 'TaskCard';

const Dashboard = ({ setActiveTab }) => {
  const [userName, setUserName] = useState('');
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [justCompletedId, setJustCompletedId] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);

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

  // Load and listen for user name changes
  useEffect(() => {
    const loadUserName = () => {
      setUserName(localStorage.getItem('userName') || '');
    };

    loadUserName();

    const handleUserNameChange = () => {
      loadUserName();
    };

    window.addEventListener('userNameChanged', handleUserNameChange);

    return () => {
      window.removeEventListener('userNameChanged', handleUserNameChange);
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

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    setExpandedTaskId(null); // Collapse expanded task when dragging starts
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e, task) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTask && task.id !== draggedTask.id) {
      setDragOverTask(task);
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverTask(null);
  };

  const handleDrop = (e, dropTask) => {
    e.preventDefault();

    if (!draggedTask || draggedTask.id === dropTask.id) {
      handleDragEnd();
      return;
    }

    // Reorder tasks
    const draggedIndex = tasks.findIndex(t => t.id === draggedTask.id);
    const dropIndex = tasks.findIndex(t => t.id === dropTask.id);

    const newTasks = [...tasks];
    const [removed] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(dropIndex, 0, removed);

    // Update customPriority based on new order
    const updatedTasks = newTasks.map((task, index) => ({
      ...task,
      customPriority: newTasks.length - index, // Higher number = higher priority
    }));

    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    window.dispatchEvent(new Event('storage'));
    handleDragEnd();
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

  // Format user name - capitalize first letter of each word
  const formatUserName = (name) => {
    if (!name || name.trim() === '') return '';
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formattedName = formatUserName(userName);
  const welcomeMessage = formattedName ? `Welcome Back, ${formattedName}! 👋` : 'Welcome Back! 👋';

  return (
    <>
      <style>
        {`
          .task-glow-not-started {
            box-shadow: 0 0 15px rgba(100, 200, 255, 0.35);
            transition: box-shadow 200ms ease-in-out;
          }

          .task-glow-not-started:hover {
            box-shadow: 0 0 20px rgba(100, 200, 255, 0.5);
          }

          .task-glow-in-progress {
            box-shadow: 0 0 15px rgba(255, 200, 50, 0.45);
            transition: box-shadow 200ms ease-in-out;
          }

          .task-glow-in-progress:hover {
            box-shadow: 0 0 20px rgba(255, 200, 50, 0.6);
          }

          .task-glow-complete {
            box-shadow: 0 0 12px rgba(61, 214, 140, 0.25);
            transition: box-shadow 200ms ease-in-out;
          }

          .task-glow-complete:hover {
            box-shadow: 0 0 18px rgba(61, 214, 140, 0.4);
          }

          .task-glow-overdue {
            box-shadow: 0 0 20px rgba(255, 50, 50, 0.45);
            transition: box-shadow 200ms ease-in-out;
          }

          .task-glow-overdue:hover {
            box-shadow: 0 0 25px rgba(255, 50, 50, 0.65);
          }

          /* Checkbox hover effects */
          .checkbox-not-started:hover svg {
            stroke: rgb(100, 200, 255);
            stroke-width: 2.5;
            transition: stroke 200ms ease-in-out, stroke-width 200ms ease-in-out;
          }

          .checkbox-in-progress:hover svg {
            stroke: rgb(255, 200, 50);
            stroke-width: 2.5;
            transition: stroke 200ms ease-in-out, stroke-width 200ms ease-in-out;
          }

          .checkbox-overdue:hover svg {
            stroke: rgb(255, 50, 50);
            stroke-width: 2.5;
            transition: stroke 200ms ease-in-out, stroke-width 200ms ease-in-out;
          }

          .checkbox-complete:hover svg {
            stroke: rgb(61, 214, 140);
            transition: stroke 200ms ease-in-out;
          }
        `}
      </style>
      <div className="h-full p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header with Circular Progress */}
          <div className="mb-8 flex items-start justify-between">
            <div className="flex-1 mt-12">
              <h2 className="text-3xl font-bold text-text-primary mb-2">
                {welcomeMessage}
              </h2>
              <p className="text-text-secondary">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
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
                          draggedTask={draggedTask}
                          dragOverTask={dragOverTask}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
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
