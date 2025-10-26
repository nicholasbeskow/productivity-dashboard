import { useState, memo } from 'react';
import { Check, Circle, Clock, ExternalLink, Sparkles, AlertCircle, GripVertical, Pencil, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Memoized single task card for performance
const TaskCard = memo(({ task, justCompletedId, draggedTask, dragOverTask, onDragStart, onDragOver, onDrop, onDragEnd, onStatusChange, onOpenUrl, isEditing, editForm, onStartEdit, onSaveEdit, onCancelEdit, onEditFormChange }) => {
  const isOverdue = (task) => {
    if (!task.dueDate || task.status === 'complete') return false;
    // Parse dates at noon to avoid timezone shift issues
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const dueDate = new Date(task.dueDate + 'T12:00:00');
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
    // Parse date at noon local time to avoid timezone shift
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      draggable={!isEditing}
      onDragStart={(e) => !isEditing && onDragStart(e, task)}
      onDragOver={(e) => !isEditing && onDragOver(e, task)}
      onDragEnd={onDragEnd}
      onDrop={(e) => !isEditing && onDrop(e, task)}
      className={`relative bg-bg-secondary rounded-xl p-4 border transition-all ${isEditing ? 'cursor-default' : 'cursor-move'} ${glowClass} ${
        task.status === 'complete' ? 'opacity-75 border-bg-tertiary' :
        dragOverTask?.id === task.id ? 'border-green-glow' :
        taskIsOverdue ? 'border-red-500' : 'border-bg-tertiary'
      } ${draggedTask?.id === task.id ? 'opacity-50' : ''} ${!isEditing && 'hover:border-green-glow/30'}`}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      {/* Edit Button */}
      {!isEditing && (
        <motion.button
          onClick={() => onStartEdit(task)}
          className={`absolute p-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-bg-primary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all ${
            taskIsOverdue ? 'top-3 right-20' : 'top-3 right-3'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Edit task"
        >
          <Pencil size={14} />
        </motion.button>
      )}

      {/* Overdue Badge */}
      {taskIsOverdue && !isEditing && (
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

      {isEditing ? (
        /* Edit Mode */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Title Input */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => onEditFormChange({ ...editForm, title: e.target.value })}
              placeholder="Enter task title"
              className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
              autoFocus
            />
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => onEditFormChange({ ...editForm, description: e.target.value })}
              placeholder="Enter task description (optional)"
              rows={3}
              className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow resize-none transition-colors"
            />
          </div>

          {/* URL and Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Related Link
              </label>
              <input
                type="url"
                value={editForm.url}
                onChange={(e) => onEditFormChange({ ...editForm, url: e.target.value })}
                placeholder="https://example.com"
                className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={editForm.dueDate}
                onChange={(e) => onEditFormChange({ ...editForm, dueDate: e.target.value })}
                className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
              />
            </div>
          </div>

          {/* Status Select */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Status
            </label>
            <select
              value={editForm.status}
              onChange={(e) => onEditFormChange({ ...editForm, status: e.target.value })}
              className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
            >
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onSaveEdit(task.id)}
              disabled={!editForm.title.trim()}
              className="flex-1 bg-green-glow hover:bg-green-glow/90 disabled:bg-green-glow/50 disabled:cursor-not-allowed text-bg-primary font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>
            <button
              onClick={onCancelEdit}
              className="px-6 bg-bg-tertiary hover:bg-bg-primary border border-bg-primary hover:border-red-500/50 text-text-primary font-semibold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </motion.div>
      ) : (
        /* View Mode */
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <div className="mt-1 text-text-tertiary hover:text-green-glow transition-colors cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical size={20} />
          </div>

          {/* Status Button */}
          <motion.button
            onClick={() => onStatusChange(task.id)}
            className={`mt-1 relative flex-shrink-0 ${getCheckboxClass()}`}
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
      )}
    </motion.div>
  );
});

TaskCard.displayName = 'TaskCard';

const TaskList = ({ tasks, setTasks }) => {
  const [justCompletedId, setJustCompletedId] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    url: '',
    dueDate: '',
    status: 'not-started'
  });

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

    console.log('[TaskList] Drag from index', draggedIndex, 'to', dropIndex);

    const newTasks = [...tasks];
    const [removed] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(dropIndex, 0, removed);

    // Update customPriority based on new order - ALL tasks get new priority
    const updatedTasks = newTasks.map((task, index) => ({
      ...task,
      customPriority: newTasks.length - index, // Higher number = higher priority
    }));

    console.log('[TaskList] Updated priorities:', updatedTasks.map(t => ({ title: t.title, priority: t.customPriority })));

    // Save immediately to localStorage
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    console.log('[TaskList] Saved to localStorage');

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

  const handleStartEdit = (task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description || '',
      url: task.url || '',
      dueDate: task.dueDate || '',
      status: task.status
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditForm({
      title: '',
      description: '',
      url: '',
      dueDate: '',
      status: 'not-started'
    });
  };

  const handleSaveEdit = (taskId) => {
    if (!editForm.title.trim()) return;

    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          url: editForm.url.trim() || null,
          dueDate: editForm.dueDate || null,
          status: editForm.status
        };
      }
      return task;
    });

    setTasks(updatedTasks);
    handleCancelEdit();
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
              isEditing={editingTaskId === task.id}
              editForm={editForm}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onEditFormChange={setEditForm}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default TaskList;
