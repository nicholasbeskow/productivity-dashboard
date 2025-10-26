import { useState, memo } from 'react';
import { Check, Circle, Clock, ExternalLink, Sparkles, AlertCircle, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Memoized single task card for performance
const TaskCard = memo(({ task, justCompletedId, draggedTask, dragOverTask, onDragStart, onDragOver, onDrop, onDragEnd, onStatusChange, onOpenUrl }) => {
  const isOverdue = (task) => {
    if (!task.dueDate || task.status === 'complete') return false;
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    return dueDate < now;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <Check size={20} className="text-green-glow" />;
      case 'in-progress':
        return <Clock size={20} className="text-yellow-500" />;
      default:
        return <Circle size={20} className="text-text-tertiary" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  const getCardGlow = (task, isOverdue) => {
    if (isOverdue) return 'task-glow-overdue';
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
        scale: isJustCompleted ? [1, 1.02, 1] : draggedTask?.id === task.id ? 1.05 : 1,
      }}
      exit={{ opacity: 0, scale: 0.9, height: 0 }}
      transition={{
        layout: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
        opacity: isJustCompleted ? { delay: 1.2, duration: 0.3 } : { duration: 0.2 },
        scale: { duration: 0.4, ease: "easeInOut" }
      }}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragOver={(e) => onDragOver(e, task)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, task)}
      className={`relative bg-bg-secondary rounded-xl p-4 border transition-all cursor-move ${glowClass} ${
        task.status === 'complete' ? 'opacity-75 border-bg-tertiary' :
        dragOverTask?.id === task.id ? 'border-green-glow' :
        taskIsOverdue ? 'border-red-500' : 'border-bg-tertiary'
      } ${draggedTask?.id === task.id ? 'opacity-50' : ''} hover:border-green-glow/30`}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      {/* Overdue Badge */}
      {taskIsOverdue && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1"
        >
          <AlertCircle size={12} />
          OVERDUE
        </motion.div>
      )}

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
                  x: (Math.random() - 0.5) * 100,
                  y: (Math.random() - 0.5) * 100,
                  scale: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.05 }}
                className="absolute top-4 left-12 pointer-events-none"
                style={{
                  width: 8,
                  height: 8,
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
              className="absolute top-2 left-10 pointer-events-none"
            >
              <Sparkles className="text-green-glow" size={24} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <div className="mt-1 text-text-tertiary hover:text-green-glow transition-colors cursor-grab active:cursor-grabbing flex-shrink-0">
          <GripVertical size={20} />
        </div>

        {/* Status Button */}
        <motion.button
          onClick={() => onStatusChange(task.id)}
          className="mt-1 relative flex-shrink-0"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title={`Click to change status (currently: ${getStatusLabel(task.status)})`}
        >
          <motion.div
            animate={{ rotate: task.status === 'complete' ? 360 : 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {getStatusIcon(task.status)}
          </motion.div>

          {task.status === 'complete' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, ease: "backOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-5 h-5 bg-green-glow/20 rounded-full absolute" />
            </motion.div>
          )}
        </motion.button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <motion.h3
            className={`text-lg font-semibold mb-1 transition-all duration-300 ${
              task.status === 'complete' ? 'text-text-secondary line-through' : 'text-text-primary'
            }`}
            animate={{ opacity: task.status === 'complete' ? 0.6 : 1 }}
          >
            {task.title}
          </motion.h3>

          {task.description && (
            <p className="text-text-secondary text-sm mb-2">{task.description}</p>
          )}

          {task.url && (
            <div className="mb-2">
              <button
                onClick={() => onOpenUrl(task.url)}
                className="inline-flex items-center gap-1.5 text-sm text-green-glow hover:text-green-glow/80 transition-colors group"
              >
                <ExternalLink size={14} className="group-hover:scale-110 transition-transform" />
                <span className="underline">Open Link</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-text-tertiary flex-wrap">
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${taskIsOverdue ? 'text-red-500 font-bold' : ''}`}>
                {taskIsOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                Due: {formatDate(task.dueDate)}
              </span>
            )}
            <motion.span
              className={`px-2 py-1 rounded transition-all ${
                task.status === 'complete'
                  ? 'bg-green-muted text-green-glow'
                  : task.status === 'in-progress'
                  ? 'bg-yellow-500/10 text-yellow-500'
                  : 'bg-bg-tertiary text-text-tertiary'
              }`}
              animate={{ scale: isJustCompleted ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              {getStatusLabel(task.status)}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

TaskCard.displayName = 'TaskCard';

const TaskList = ({ tasks, setTasks }) => {
  const [justCompletedId, setJustCompletedId] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);

  const handleStatusChange = (taskId) => {
    const task = tasks.find(t => t.id === taskId);

    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        let newStatus;
        let completedAt = task.completedAt;

        if (task.status === 'not-started') {
          newStatus = 'in-progress';
        } else if (task.status === 'in-progress') {
          newStatus = 'complete';
          completedAt = new Date().toISOString();
          // Trigger celebration animation
          setJustCompletedId(taskId);

          // After animation, delete task and save to completedTasks
          setTimeout(() => {
            setJustCompletedId(null);

            // Save to completedTasks in localStorage
            const completedTask = { ...task, status: 'complete', completedAt };
            const existingCompleted = JSON.parse(localStorage.getItem('completedTasks') || '[]');
            localStorage.setItem('completedTasks', JSON.stringify([completedTask, ...existingCompleted]));

            // Remove from active tasks
            setTasks(prev => prev.filter(t => t.id !== taskId));
          }, 1500);
        } else {
          newStatus = 'not-started';
          completedAt = null;
        }

        return { ...task, status: newStatus, completedAt };
      }
      return task;
    });

    setTasks(updatedTasks);
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
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
    handleDragEnd();
  };

  const handleOpenUrl = (url) => {
    if (!url) return;

    // Check if we're in Electron environment
    if (window.require) {
      try {
        const { shell } = window.require('electron');
        shell.openExternal(url);
      } catch (error) {
        console.error('Error opening URL in Electron:', error);
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl p-8 border border-bg-tertiary text-center">
        <p className="text-text-secondary">No tasks yet. Create your first task above!</p>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes pulse-red-glow {
            0%, 100% {
              box-shadow: 0 0 25px rgba(255, 50, 50, 0.5);
            }
            50% {
              box-shadow: 0 0 40px rgba(255, 50, 50, 0.8);
            }
          }

          .task-glow-not-started {
            box-shadow: 0 0 15px rgba(255, 100, 100, 0.3);
          }

          .task-glow-not-started:hover {
            box-shadow: 0 0 20px rgba(255, 100, 100, 0.45);
          }

          .task-glow-in-progress {
            box-shadow: 0 0 20px rgba(255, 200, 100, 0.45);
          }

          .task-glow-in-progress:hover {
            box-shadow: 0 0 25px rgba(255, 200, 100, 0.65);
          }

          .task-glow-complete {
            box-shadow: 0 0 15px rgba(61, 214, 140, 0.3);
          }

          .task-glow-complete:hover {
            box-shadow: 0 0 20px rgba(61, 214, 140, 0.45);
          }

          .task-glow-overdue {
            animation: pulse-red-glow 2s ease-in-out infinite;
          }

          .task-glow-overdue:hover {
            animation: pulse-red-glow 2s ease-in-out infinite;
            box-shadow: 0 0 45px rgba(255, 50, 50, 0.9) !important;
          }
        `}
      </style>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              justCompletedId={justCompletedId}
              draggedTask={draggedTask}
              dragOverTask={dragOverTask}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onStatusChange={handleStatusChange}
              onOpenUrl={handleOpenUrl}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default TaskList;
