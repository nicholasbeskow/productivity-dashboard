import { useState, memo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Circle, Clock, ExternalLink, Sparkles, AlertCircle, GripVertical, Pencil, Save, X, MoreVertical, Copy, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import backupManager from '../../utils/backupManager';

// Memoized single task card for performance
const TaskCard = memo(({ task, justCompletedId, draggedTask, dragOverTask, onDragStart, onDragOver, onDrop, onDragEnd, onStatusChange, onOpenUrl, isEditing, editForm, onStartEdit, onSaveEdit, onCancelEdit, onEditFormChange, onDuplicate, onDelete, isMenuOpen, onMenuToggle }) => {
  const isOverdue = (task) => {
    if (!task.dueDate || task.status === 'complete') return false;

    // If task has a time, check date + time; otherwise just date
    if (task.time) {
      const taskDateTime = new Date(`${task.dueDate}T${task.time}`);
      const now = new Date();
      return taskDateTime < now;
    } else {
      // No time - check date only (at noon to avoid timezone shift)
      const now = new Date();
      now.setHours(12, 0, 0, 0);
      const dueDate = new Date(task.dueDate + 'T12:00:00');
      return dueDate < now;
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

  // Helper: Convert 24-hour time to 12-hour AM/PM
  const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper: Get time remaining in hours
  const getTimeRemaining = (dateString, timeString) => {
    if (!dateString || !timeString) return null;
    const taskDateTime = new Date(`${dateString}T${timeString}`);
    const now = new Date();
    const diffMs = taskDateTime - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return diffHours;
  };

  // Smart date/time display
  const formatDateTimeDisplay = (dateString, timeString) => {
    if (!dateString) return '';

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const taskDate = new Date(dateString + 'T12:00:00');
    taskDate.setHours(0, 0, 0, 0);

    const diffTime = taskDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Format the date part
    let dateDisplay;
    if (diffDays === 0) {
      dateDisplay = 'Today';
    } else if (diffDays === 1) {
      dateDisplay = 'Tomorrow';
    } else if (diffDays < 0) {
      // Overdue - show full date
      dateDisplay = new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // Future - show full date
      dateDisplay = new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }

    // Add time if present
    if (timeString) {
      const time12 = formatTime12Hour(timeString);

      // For today's tasks, show countdown if not overdue
      if (diffDays === 0 && !taskIsOverdue) {
        const hoursRemaining = getTimeRemaining(dateString, timeString);
        if (hoursRemaining !== null && hoursRemaining > 0) {
          return `${dateDisplay} » in ${hoursRemaining} ${hoursRemaining === 1 ? 'hour' : 'hours'}`;
        }
      }

      return `${dateDisplay} » ${time12}`;
    }

    return dateDisplay;
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
      layout={!isJustCompleted}
      initial={{ opacity: 0, y: -10 }}
      animate={{
        opacity: isJustCompleted ? [1, 1, 0] : 1,
        y: 0,
        scale: draggedTask?.id === task.id ? 1.05 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: isJustCompleted ? { delay: 0.1, duration: 0.5 } : { duration: 0.2 },
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
      {/* 3-Dot Menu Button */}
      {!isEditing && (
        <div className="absolute top-3 right-3">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              const buttonRect = e.currentTarget.getBoundingClientRect();
              onMenuToggle(buttonRect);
            }}
            className="p-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-bg-primary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="More options"
          >
            <MoreVertical size={14} />
          </motion.button>
        </div>
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
                transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.03 }}
                className="absolute top-2 left-10 pointer-events-none"
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
              transition={{ duration: 0.4 }}
              className="absolute top-2 left-10 pointer-events-none"
            >
              <Sparkles className="text-green-glow" size={20} />
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

          {/* URL Input */}
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

          {/* Due Date and Time Row */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Time (optional)
              </label>
              <input
                type="time"
                value={editForm.time}
                onChange={(e) => onEditFormChange({ ...editForm, time: e.target.value })}
                className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
              />
            </div>
          </div>

          {/* Task Type Toggle */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Task Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEditFormChange({ ...editForm, taskType: 'academic' })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  editForm.taskType === 'academic'
                    ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                    : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                }`}
              >
                📚 Academic
              </button>
              <button
                type="button"
                onClick={() => onEditFormChange({ ...editForm, taskType: 'personal' })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  editForm.taskType === 'personal'
                    ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                    : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                }`}
              >
                🏠 Personal
              </button>
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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <motion.h3
                className={`text-lg font-semibold transition-all duration-300 ${
                  task.status === 'complete' ? 'text-text-secondary line-through' : 'text-text-primary'
                }`}
                animate={{ opacity: task.status === 'complete' ? 0.6 : 1 }}
              >
                {task.title}
              </motion.h3>
              {taskIsOverdue && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 flex-shrink-0">
                  <AlertCircle size={10} />
                  OVERDUE
                </span>
              )}
            </div>

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
                  {formatDateTimeDisplay(task.dueDate, task.time)}
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

const TaskList = ({ tasks, setTasks, openMenuTaskId, setOpenMenuTaskId }) => {
  const [justCompletedId, setJustCompletedId] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    url: '',
    dueDate: '',
    time: '',
    status: 'not-started',
    taskType: 'academic'
  });

  // Menu position state
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Refs for auto-scroll functionality
  const scrollIntervalRef = useRef(null);
  const isScrollingRef = useRef(false);
  const isDraggingRef = useRef(false);

  // Auto-scroll while dragging near viewport edges
  useEffect(() => {
    const handleDragOver = (e) => {
      if (!isDraggingRef.current) return;

      const edgeThreshold = 50; // pixels from edge to trigger scroll
      const scrollSpeed = 8; // pixels per frame
      const viewportHeight = window.innerHeight;

      // Find the scrollable container (the one with overflow-y-auto)
      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (!scrollContainer) return;

      // Check if near top edge
      if (e.clientY < edgeThreshold) {
        if (!isScrollingRef.current) {
          isScrollingRef.current = true;
          const scroll = () => {
            if (isDraggingRef.current && e.clientY < edgeThreshold) {
              scrollContainer.scrollBy({ top: -scrollSpeed, behavior: 'auto' });
              scrollIntervalRef.current = requestAnimationFrame(scroll);
            } else {
              isScrollingRef.current = false;
            }
          };
          scroll();
        }
      }
      // Check if near bottom edge
      else if (e.clientY > viewportHeight - edgeThreshold) {
        if (!isScrollingRef.current) {
          isScrollingRef.current = true;
          const scroll = () => {
            if (isDraggingRef.current && e.clientY > viewportHeight - edgeThreshold) {
              scrollContainer.scrollBy({ top: scrollSpeed, behavior: 'auto' });
              scrollIntervalRef.current = requestAnimationFrame(scroll);
            } else {
              isScrollingRef.current = false;
            }
          };
          scroll();
        }
      }
      // Not near any edge - stop scrolling
      else {
        if (scrollIntervalRef.current) {
          cancelAnimationFrame(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
          isScrollingRef.current = false;
        }
      }
    };

    // Close menu when scrolling
    const handleScroll = () => {
      if (openMenuTaskId) {
        setOpenMenuTaskId(null);
      }
    };

    // Add window-level dragover listener
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [openMenuTaskId, setOpenMenuTaskId]);

  const handleStatusChange = (taskId) => {
    // 1. Get the FULL list from localStorage
    const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskIndex = allTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return; // Task not found

    const task = allTasks[taskIndex];

    let newStatus;
    let completedAt = task.completedAt;

    if (task.status === 'not-started') newStatus = 'in-progress';
    else if (task.status === 'in-progress') {
      newStatus = 'complete';
      completedAt = new Date().toISOString();
    } else {
      newStatus = 'not-started';
      completedAt = null;
    }

    if (newStatus === 'complete') {
      // --- COMPLETION LOGIC ---
      setJustCompletedId(taskId); // Trigger animation

      setTimeout(() => {
        setJustCompletedId(null);

        // Find the completed task again from a fresh read
        const freshAllTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const taskToComplete = freshAllTasks.find(t => t.id === taskId);

        if (!taskToComplete) return; // Safety check

        const completedTask = { ...taskToComplete, status: 'complete', completedAt };

        // Add to completedTasks
        const existingCompleted = JSON.parse(localStorage.getItem('completedTasks') || '[]');
        localStorage.setItem('completedTasks', JSON.stringify([completedTask, ...existingCompleted]));

        // Remove from active tasks
        const activeTasks = freshAllTasks.filter(t => t.id !== taskId);
        localStorage.setItem('tasks', JSON.stringify(activeTasks));

        backupManager.saveAutoBackup();
        setTasks(activeTasks); // Update UI
      }, 700); // Wait for animation
    } else {
      // --- 'IN-PROGRESS' or 'NOT-STARTED' LOGIC ---

      // Update the task in the full array
      const updatedAllTasks = allTasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus, completedAt } : t
      );

      // 2. Save FULL list back to localStorage
      localStorage.setItem('tasks', JSON.stringify(updatedAllTasks));
      // 3. Trigger backup
      backupManager.saveAutoBackup();
      // 4. Update UI
      setTasks(updatedAllTasks);
    }
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    isDraggingRef.current = true;
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
    isDraggingRef.current = false;

    // Stop auto-scrolling
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
      isScrollingRef.current = false;
    }
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

    // Backup after save
    backupManager.saveAutoBackup();

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
      time: task.time || '',
      status: task.status,
      taskType: task.taskType || 'academic'
    });
    setOpenMenuTaskId(null); // Close menu when editing starts
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditForm({
      title: '',
      description: '',
      url: '',
      dueDate: '',
      time: '',
      status: 'not-started',
      taskType: 'academic'
    });
  };

  const handleSaveEdit = (taskId) => {
    if (!editForm.title.trim()) return;

    // CRITICAL FIX: Read from localStorage to get FULL unfiltered array
    // Don't map over 'tasks' prop as it may be filtered
    const storedTasks = localStorage.getItem('tasks');
    const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

    const updatedTasks = fullTasksArray.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          url: editForm.url.trim() || null,
          dueDate: editForm.dueDate || null,
          time: editForm.time || null,
          status: editForm.status,
          taskType: editForm.taskType
        };
      }
      return task;
    });

    // Save full array to localStorage first
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));

    // Backup after save
    backupManager.saveAutoBackup();

    // Then update parent state with full array (parent will filter for display)
    setTasks(updatedTasks);
    handleCancelEdit();
  };

  const handleDuplicate = (taskId) => {
    // 1. Read FULL list from localStorage
    const storedTasks = localStorage.getItem('tasks');
    const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

    const taskToDuplicate = fullTasksArray.find(t => t.id === taskId);
    if (!taskToDuplicate) return;

    const duplicatedTask = {
      ...taskToDuplicate,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'not-started',
      completedAt: null,
      createdAt: new Date().toISOString(),
      title: `${taskToDuplicate.title} (Copy)`,
      customPriority: taskToDuplicate.customPriority ? taskToDuplicate.customPriority + 0.5 : 0.5 // Place it just below
    };

    // 2. Modify FULL list - add duplicated task after the original
    const originalIndex = fullTasksArray.findIndex(t => t.id === taskId);
    const updatedTasks = [...fullTasksArray];
    updatedTasks.splice(originalIndex + 1, 0, duplicatedTask);

    // 3. Save FULL list to localStorage
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    // 4. Trigger backup
    backupManager.saveAutoBackup();

    // 5. Update UI
    setTasks(updatedTasks);
  };

  const handleDelete = (taskId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this task? This cannot be undone.'
    );

    if (!confirmed) return;

    // Read from localStorage to get full array
    const storedTasks = localStorage.getItem('tasks');
    const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

    // Remove the task
    const updatedTasks = fullTasksArray.filter(t => t.id !== taskId);

    // Save to localStorage
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));

    // Backup after save
    backupManager.saveAutoBackup();

    // Update parent state
    setTasks(updatedTasks);
  };

  const handleMenuToggle = (task, buttonRect) => {
    const clickedTaskId = task.id;

    // Calculate menu position
    const top = buttonRect.bottom + 8;
    const left = buttonRect.right - 192; // 192px = w-48

    setMenuPosition({ top, left });

    // Use functional update form to get the *current* state
    setOpenMenuTaskId(prevOpenId => {
      if (prevOpenId === clickedTaskId) {
        // Case 1: Clicked the *same* button. Close it.
        return null;
      } else {
        // Case 2: Clicked a *new* button. Open it.
        return clickedTaskId;
      }
    });
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
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              isMenuOpen={openMenuTaskId === task.id}
              onMenuToggle={(buttonRect) => handleMenuToggle(task, buttonRect)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Portal-based dropdown menu - renders outside DOM hierarchy */}
      {openMenuTaskId && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="fixed z-30 w-48 bg-bg-secondary rounded-lg border border-bg-primary shadow-xl overflow-hidden"
            style={{
              position: 'absolute',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
          >
            <button
              onClick={() => {
                const task = tasks.find(t => t.id === openMenuTaskId);
                if (task) handleStartEdit(task);
                setOpenMenuTaskId(null);
              }}
              className="w-full px-4 py-2 text-left text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-2"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={() => {
                handleDuplicate(openMenuTaskId);
                setOpenMenuTaskId(null);
              }}
              className="w-full px-4 py-2 text-left text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-2"
            >
              <Copy size={14} />
              Duplicate
            </button>
            <div className="border-t border-bg-primary" />
            <button
              onClick={() => {
                handleDelete(openMenuTaskId);
                setOpenMenuTaskId(null);
              }}
              className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default TaskList;
