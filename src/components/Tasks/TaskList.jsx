import { useState } from 'react';
import { Check, Circle, Clock, ExternalLink, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TaskList = ({ tasks, setTasks }) => {
  const [justCompletedId, setJustCompletedId] = useState(null);

  const handleStatusChange = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const wasInProgress = task && task.status === 'in-progress';

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
          setTimeout(() => setJustCompletedId(null), 1500);
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

  const handleOpenUrl = (url) => {
    if (!url) return;

    // Check if we're in Electron environment
    if (window.require) {
      try {
        const { shell } = window.require('electron');
        shell.openExternal(url);
      } catch (error) {
        console.error('Error opening URL in Electron:', error);
        // Fallback to window.open
        window.open(url, '_blank');
      }
    } else {
      // Running in browser
      window.open(url, '_blank');
    }
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl p-8 border border-bg-tertiary text-center">
        <p className="text-text-secondary">No tasks yet. Create your first task above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const isJustCompleted = justCompletedId === task.id;

        return (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: isJustCompleted ? [1, 1.02, 1] : 1,
            }}
            transition={{
              duration: 0.3,
              scale: { duration: 0.5, ease: "easeInOut" }
            }}
            className={`relative bg-bg-secondary rounded-xl p-4 border border-bg-tertiary hover:border-green-glow/30 transition-all ${
              task.status === 'complete' ? 'opacity-75' : ''
            }`}
          >
            {/* Confetti Effect */}
            <AnimatePresence>
              {isJustCompleted && (
                <>
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{
                        opacity: 1,
                        x: 0,
                        y: 0,
                        scale: 1,
                      }}
                      animate={{
                        opacity: 0,
                        x: (Math.random() - 0.5) * 100,
                        y: (Math.random() - 0.5) * 100,
                        scale: 0,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.8,
                        ease: "easeOut",
                        delay: i * 0.05,
                      }}
                      className="absolute top-4 left-8 pointer-events-none"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: i % 3 === 0 ? '#3dd68c' : i % 3 === 1 ? '#2aba73' : '#4fe39f',
                      }}
                    />
                  ))}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 1] }}
                    transition={{ duration: 0.6 }}
                    className="absolute top-2 left-6 pointer-events-none"
                  >
                    <Sparkles className="text-green-glow" size={24} />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="flex items-start gap-4">
              {/* Status Button */}
              <motion.button
                onClick={() => handleStatusChange(task.id)}
                className="mt-1 relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={`Click to change status (currently: ${getStatusLabel(task.status)})`}
              >
                <motion.div
                  animate={{
                    rotate: task.status === 'complete' ? 360 : 0,
                  }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  {getStatusIcon(task.status)}
                </motion.div>

                {/* Animated checkmark fill */}
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
              <div className="flex-1">
                <motion.h3
                  className={`text-lg font-semibold mb-1 transition-all duration-300 ${
                    task.status === 'complete' ? 'text-text-secondary line-through' : 'text-text-primary'
                  }`}
                  animate={{
                    opacity: task.status === 'complete' ? 0.6 : 1,
                  }}
                >
                  {task.title}
                </motion.h3>

                {task.description && (
                  <p className="text-text-secondary text-sm mb-2">{task.description}</p>
                )}

                {/* URL Link */}
                {task.url && (
                  <div className="mb-2">
                    <button
                      onClick={() => handleOpenUrl(task.url)}
                      className="inline-flex items-center gap-1.5 text-sm text-green-glow hover:text-green-glow/80 transition-colors group"
                    >
                      <ExternalLink size={14} className="group-hover:scale-110 transition-transform" />
                      <span className="underline">Open Link</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-text-tertiary flex-wrap">
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
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
                    animate={{
                      scale: isJustCompleted ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {getStatusLabel(task.status)}
                  </motion.span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default TaskList;
