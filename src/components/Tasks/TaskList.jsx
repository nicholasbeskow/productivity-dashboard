import { useState, memo, useRef, useEffect, useCallback, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, Circle, Clock, ExternalLink, Sparkles, AlertCircle, GripVertical, Pencil, Save, X, MoreVertical, Copy, Trash2, FileText, Folder, Repeat, ArrowUp, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import backupManager from '../../utils/backupManager';
import { calculateNextDueDate } from '../../utils/recurrenceHelpers';
import { isTaskOverdue } from '../../utils/taskHelpers';
import { createNextRecurrence } from '../../utils/recurringTaskService';
import { parseLocalDateAtNoon } from '../../utils/dateHelpers';
import { formatDateTimeDisplay, formatTime12Hour, getTimeRemaining, formatDate } from '../../utils/dateFormatting';
import TaskForm from './TaskForm';

// Memoized single task card for performance
const TaskCard = memo(forwardRef(({ task, justCompletedId, draggedTask, dragOverTask, onDragStart, onDragOver, onDrop, onDragEnd, onStatusChange, onOpenUrl, isEditing, editForm, onStartEdit, onSaveEdit, onCancelEdit, onEditFormChange, onDuplicate, isMenuOpen, onMenuToggle, isEditingTemplate, onDeleteTask }, ref) => {
  // State for attachment drag-and-drop
  const [draggedAttachmentIndex, setDraggedAttachmentIndex] = useState(null);
  const [dragOverAttachmentIndex, setDragOverAttachmentIndex] = useState(null);

  // State for attachment dropdown
  const [isAttachmentsMenuOpen, setIsAttachmentsMenuOpen] = useState(false);

  const handleOpenFile = async (filePath) => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('shell:open-path', filePath);
      if (!result.success) {
        console.error('Failed to open file:', result.error);
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const handleAttachmentClick = (e) => {
    e.stopPropagation();
    if (task.attachments && task.attachments.length === 1) {
      handleOpenFile(task.attachments[0]);
    } else if (task.attachments && task.attachments.length > 1) {
      setIsAttachmentsMenuOpen(!isAttachmentsMenuOpen);
    }
  };

  // Handlers for attachment drag-and-drop
  const handleAttachmentDragStart = (e, index) => {
    setDraggedAttachmentIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAttachmentDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedAttachmentIndex !== null && draggedAttachmentIndex !== index) {
      setDragOverAttachmentIndex(index);
    }
  };

  const handleAttachmentDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedAttachmentIndex === null || draggedAttachmentIndex === dropIndex) {
      setDraggedAttachmentIndex(null);
      setDragOverAttachmentIndex(null);
      return;
    }

    const items = Array.from(editForm.attachments);
    const [reorderedItem] = items.splice(draggedAttachmentIndex, 1);
    items.splice(dropIndex, 0, reorderedItem);

    onEditFormChange({ ...editForm, attachments: items });
    setDraggedAttachmentIndex(null);
    setDragOverAttachmentIndex(null);
  };

  const handleAttachmentDragEnd = () => {
    setDraggedAttachmentIndex(null);
    setDragOverAttachmentIndex(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <Check size={20} className="text-green-glow" />;
      case 'in-progress':
        return <Clock size={20} className="text-yellow-500" />;
      default:
        return <Circle size={20} className="text-white/40" />;
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



  const taskIsOverdue = isTaskOverdue(task);
  const isJustCompleted = justCompletedId === task.id;
  const glowClass = getCardGlow(task, taskIsOverdue);

  // Determine checkbox class based on status
  const getCheckboxClass = () => {
    if (taskIsOverdue) return 'checkbox-overdue';
    if (task.status === 'complete') return 'checkbox-complete';
    if (task.status === 'in-progress') return 'checkbox-in-progress';
    return 'checkbox-not-started';
  };

  // File attachment handlers for edit mode
  const handleEditAttachFilesClick = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('dialog:show-open-dialog');

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const currentAttachments = editForm.attachments || [];
        const newPaths = result.filePaths.filter(path => !currentAttachments.includes(path));
        onEditFormChange({ ...editForm, attachments: [...currentAttachments, ...newPaths] });
      }
    } catch (error) {
      console.error('Error attaching files:', error);
    }
  };

  const handleEditRemoveAttachment = (filePathToRemove) => {
    const updatedAttachments = (editForm.attachments || []).filter(path => path !== filePathToRemove);
    onEditFormChange({ ...editForm, attachments: updatedAttachments });
  };

  const handleEditOpenFile = async (filePath) => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('shell:open-path', filePath);
      if (!result.success) {
        console.error('Failed to open file:', result.error);
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const handleShowInFolder = async (filePath) => {
    if (!window.require) return; // Electron only
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('shell:show-item-in-folder', filePath);
      if (!result.success) {
        console.error('Failed to show item in folder:', result.error);
      }
    } catch (error) {
      console.error('Error invoking shell:show-item-in-folder:', error);
    }
  };

  const toggleWeeklyDay = (day) => {
    onEditFormChange({
      ...editForm,
      weeklyDays: {
        ...editForm.weeklyDays,
        [day]: !editForm.weeklyDays[day]
      }
    });
  };

  return (
    <motion.div
      ref={ref}
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
      className={`relative rounded-xl p-4 border transition-all ${isEditing ? 'cursor-default' : 'cursor-move'} ${glowClass} ${task.status === 'complete' ? 'opacity-75 border-transparent' :
        dragOverTask?.id === task.id ? 'border-green-glow' :
          taskIsOverdue ? 'border-red-500/50' : 'border-transparent'
        } ${draggedTask?.id === task.id ? 'opacity-50' : ''} ${!isEditing && 'hover:border-green-glow/30'}`}
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
        backdropFilter: 'blur(12px) saturate(180%)',
        background: 'rgba(255, 255, 255, 0.03)'
      }}
    >
      {/* Action Buttons (Edit & More Menu) */}
      {!isEditing && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {/* Edit Button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit(task);
            }}
            className="p-1.5 rounded-lg liquid-bubble-filled text-white/70 hover:text-green-glow transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Edit task"
          >
            <Pencil size={14} />
          </motion.button>

          {/* 3-Dot Menu Button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              const buttonRect = e.currentTarget.getBoundingClientRect();
              onMenuToggle(buttonRect);
            }}
            className="p-1.5 rounded-lg liquid-bubble-filled text-white/70 hover:text-green-glow transition-all"
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
        /* Edit Mode - Using TaskForm */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <TaskForm
            initialData={task}
            onTaskCreate={(data) => onSaveEdit(task.id, data)}
          />

          {/* Action Buttons */}
          <div className="space-y-3 mt-4">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-full px-6 liquid-bubble-filled text-white font-semibold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <X size={16} />
              Cancel
            </button>

            {/* Update Task Submit Button */}
            <button
              type="submit"
              form="edit-task-form"
              className="w-full bg-green-glow hover:bg-green-glow/90 text-bg-primary font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-glow hover:shadow-glow-lg"
            >
              <Save size={16} />
              Update Task
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => {
                onDeleteTask(task);
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              {task.templateId ? 'Delete Task' : 'Delete Task'}
            </button>
          </div>
        </motion.div>
      ) : (
        /* View Mode */
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <div className="mt-1 text-white/40 hover:text-green-glow transition-colors cursor-grab active:cursor-grabbing flex-shrink-0">
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
                className={`text-lg font-semibold transition-all duration-300 ${task.status === 'complete' ? 'text-white/70 line-through' : 'text-white'
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
              {task.templateId && (
                <span className="bg-green-glow bg-opacity-20 text-green-glow text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 flex-shrink-0" title="This is a recurring task instance">
                  <Repeat size={10} />
                  RECURRING
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-white/70 text-sm mb-2">{task.description}</p>
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

            <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
              {task.dueDate && (
                <span className={`flex items-center gap-1 ${taskIsOverdue ? 'text-red-500 font-bold' : ''}`}>
                  {taskIsOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                  {formatDateTimeDisplay(task.dueDate, task.time, taskIsOverdue)}
                  {task.templateId && (
                    <Repeat size={10} className="text-white/40 ml-0.5" title="Recurring task" />
                  )}
                </span>
              )}
              <motion.span
                className={`px-2 py-1 rounded transition-all ${task.status === 'complete'
                  ? 'bg-green-muted text-green-glow'
                  : task.status === 'in-progress'
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'liquid-bubble-filled text-white/40'
                  }`}
                animate={{ scale: isJustCompleted ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {getStatusLabel(task.status)}
              </motion.span>
              {task.attachments && task.attachments.length > 0 && (
                <motion.button
                  onClick={handleAttachmentClick}
                  className={`relative flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5 ${isAttachmentsMenuOpen ? 'text-green-glow bg-white/5' : 'text-white/40 hover:text-green-glow'
                    }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Open attachment"
                >
                  <FileText size={14} />
                  <span className="text-xs">{task.attachments.length}</span>
                  {task.attachments.length > 1 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-green-glow text-[8px] font-bold text-bg-primary">
                      +
                    </span>
                  )}
                </motion.button>
              )}

              {/* Attachment Menu Dropdown */}
              <AnimatePresence>
                {isAttachmentsMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsAttachmentsMenuOpen(false); }} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute bottom-full right-0 mb-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50 flex flex-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-2 border-b border-white/5 bg-white/5">
                        <span className="text-xs font-semibold text-white/70">Attached Files</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {task.attachments.map((filePath, index) => {
                          const fileName = filePath.split(/[\\/]/).pop();
                          return (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenFile(filePath);
                                setIsAttachmentsMenuOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                              title={filePath}
                            >
                              <FileText size={14} className="text-green-glow flex-shrink-0" />
                              <span className="truncate">{fileName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}));

TaskCard.displayName = 'TaskCard';

const TaskList = ({ tasks, setTasks, openMenuTaskId, setOpenMenuTaskId }) => {
  const [justCompletedId, setJustCompletedId] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    url: '',
    dueDate: '',
    time: '',
    status: 'not-started',
    taskType: 'academic',
    attachments: [],
    recurrence: 'daily',
    weeklyDays: {
      sunday: false,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
    }
  });

  // Menu position state
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Ref for completion timeouts map to handle multiple concurrent completions independently
  const completionTimeoutsRef = useRef(new Map());

  // Refs for auto-scroll functionality
  const scrollIntervalRef = useRef(null);
  const isScrollingRef = useRef(false);
  const isDraggingRef = useRef(false);

  // Auto-scroll while dragging near viewport edges
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      completionTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      completionTimeoutsRef.current.clear();
    };
  }, []);


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
    // Clear any existing timeout for this specific task
    if (completionTimeoutsRef.current.has(taskId)) {
      clearTimeout(completionTimeoutsRef.current.get(taskId));
      completionTimeoutsRef.current.delete(taskId);
    }

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

      // Immediately mark as complete in localStorage to prevent double-completion
      const updatedAllTasks = allTasks.map(t =>
        t.id === taskId ? { ...t, status: 'complete', completedAt } : t
      );
      localStorage.setItem('tasks', JSON.stringify(updatedAllTasks));
      setTasks(updatedAllTasks); // Update UI immediately

      setJustCompletedId(taskId); // Trigger animation

      const timeoutId = setTimeout(() => {
        if (justCompletedId === taskId) {
          setJustCompletedId(null);
        }

        // Find the completed task again from a fresh read
        const freshAllTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const taskToComplete = freshAllTasks.find(t => t.id === taskId);

        if (!taskToComplete) {
          completionTimeoutsRef.current.delete(taskId);
          return; // Safety check
        }

        const completedTask = { ...taskToComplete, status: 'complete', completedAt };

        // Add to completedTasks (for stats tracking)
        const existingCompleted = JSON.parse(localStorage.getItem('completedTasks') || '[]');
        localStorage.setItem('completedTasks', JSON.stringify([completedTask, ...existingCompleted]));

        // Remove from active tasks
        let activeTasks = freshAllTasks.filter(t => t.id !== taskId);

        // --- RECURRING TASK: Create next occurrence ---
        // Refactored to use createNextRecurrence helper
        if (taskToComplete.templateId) {
          const { nextTask, insertIndex } = createNextRecurrence(taskToComplete, activeTasks);

          if (nextTask) {
            // Insert at the right position
            activeTasks.splice(insertIndex, 0, nextTask);

            // Recalculate all priorities to maintain order
            activeTasks = activeTasks.map((t, index) => ({
              ...t,
              customPriority: activeTasks.length - index,
            }));
          }
        }

        localStorage.setItem('tasks', JSON.stringify(activeTasks));

        backupManager.saveAutoBackup();
        setTasks(activeTasks); // Update UI

        // Clean up map
        completionTimeoutsRef.current.delete(taskId);
      }, 700); // Wait for animation

      completionTimeoutsRef.current.set(taskId, timeoutId);
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
    // IMPORTANT: Read from localStorage to get the FULL list, not just the filtered 'tasks' prop
    // This prevents data loss when reordering tasks while a filter is active
    const fullTasks = JSON.parse(localStorage.getItem('tasks') || '[]');

    const draggedIndex = fullTasks.findIndex(t => t.id === draggedTask.id);
    const dropIndex = fullTasks.findIndex(t => t.id === dropTask.id);

    if (draggedIndex === -1 || dropIndex === -1) {
      console.warn('[TaskList] Could not find dragged or drop task in full list');
      handleDragEnd();
      return;
    }

    const newTasks = [...fullTasks];
    const [removed] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(dropIndex, 0, removed);

    // Update customPriority based on new order - ALL tasks get new priority
    const updatedTasks = newTasks.map((task, index) => ({
      ...task,
      customPriority: newTasks.length - index, // Higher number = higher priority
    }));


    // Save immediately to localStorage
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));

    // Backup after save
    backupManager.saveAutoBackup();

    setTasks(updatedTasks);
    handleDragEnd();

    // Dispatch storage event to update other components
    window.dispatchEvent(new Event('storage'));
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
    // Simply set the editing task - TaskForm will handle the scope selection UI
    setEditingTaskId(task.id);
    setOpenMenuTaskId(null); // Close menu when editing starts
  };

  const handleCancelEdit = () => {
    // Simply close the edit mode - TaskForm handles its own state
    setEditingTaskId(null);
  };

  const handleSaveEdit = (taskId, data) => {
    // data comes from TaskForm and includes scope property
    const { scope, ...updatedFields } = data;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if editing a recurring task with 'series' scope
    if (task.templateId && scope === 'series') {
      // NUCLEAR REBUILD: When editing series, delete old template/instances and create new ones
      // This ensures recurrence type changes work correctly

      const templates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');
      const storedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');

      // 1. DELETE OLD - Remove old template and all instances
      const newTemplates = templates.filter(t => t.id !== task.templateId);
      const newTasks = storedTasks.filter(t => t.templateId !== task.templateId);
      const newCompletedTasks = completedTasks.filter(t => t.templateId !== task.templateId);

      // 2. CREATE NEW template - only template-specific properties
      const newTemplateId = 'template-' + Date.now();
      const newTemplate = {
        id: newTemplateId,
        title: updatedFields.title,
        description: updatedFields.description || '',
        url: updatedFields.url || null,
        time: updatedFields.time || null,
        taskType: updatedFields.taskType || 'academic',
        attachments: updatedFields.attachments || [],
        recurrence: updatedFields.recurrence,
        createdAt: new Date().toISOString()
      };
      newTemplates.push(newTemplate);

      // 3. CREATE NEW instance - only instance-specific properties
      const instanceDueDate = updatedFields.dueDate || task.dueDate;
      const newInstance = {
        id: task.id,
        title: updatedFields.title,
        description: updatedFields.description || '',
        url: updatedFields.url || null,
        dueDate: instanceDueDate,
        time: updatedFields.time || null,
        taskType: updatedFields.taskType || 'academic',
        attachments: updatedFields.attachments || [],
        templateId: newTemplateId,
        recurrenceAnchor: instanceDueDate,
        customPriority: 0,
        status: task.status || 'not-started',
        createdAt: task.createdAt || new Date().toISOString(),
        completedAt: null
      };
      newTasks.push(newInstance);

      localStorage.setItem('recurringTasks', JSON.stringify(newTemplates));
      localStorage.setItem('tasks', JSON.stringify(newTasks));
      localStorage.setItem('completedTasks', JSON.stringify(newCompletedTasks));
      setTasks(newTasks);

      backupManager.saveAutoBackup();
      window.dispatchEvent(new Event('storage'));

      handleCancelEdit();
      return;
    } else {
      // Save changes to just this task instance
      const storedTasks = localStorage.getItem('tasks');
      const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

      const updatedTasks = fullTasksArray.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            ...updatedFields,
          };
        }
        return t;
      });

      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
      setTasks(updatedTasks);
      backupManager.saveAutoBackup();

    }

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
      customPriority: taskToDuplicate.customPriority ? taskToDuplicate.customPriority + 0.5 : 0.5, // Place it just below
      // IMPORTANT: Remove templateId so the duplicate is not linked to the recurring template
      templateId: undefined,
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

  const handleDeleteInstance = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this task? This cannot be undone.'
    );

    if (!confirmed) return;

    // Read from localStorage to get full array
    const storedTasks = localStorage.getItem('tasks');
    const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

    // Remove the task
    let updatedTasks = fullTasksArray.filter(t => t.id !== taskId);

    // --- BUG FIX: Generate next occurrence if it's a recurring task ---
    if (task.templateId) {
      const { nextTask, insertIndex } = createNextRecurrence(task, updatedTasks);

      if (nextTask) {
        updatedTasks.splice(insertIndex, 0, nextTask);

        // Recalculate priorities
        updatedTasks = updatedTasks.map((t, index) => ({
          ...t,
          customPriority: updatedTasks.length - index,
        }));
      }
    }

    // Save to localStorage
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));

    // Backup after save
    backupManager.saveAutoBackup();

    // Update parent state
    setTasks(updatedTasks);
  };

  const handleDeleteSeries = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.templateId) return;

    // Delete the entire template (with safety confirmation)
    const confirmDeleteTemplate = window.confirm(
      `Are you sure you want to delete the entire "${task.title}" series? This will delete the template and all future tasks.`
    );

    if (confirmDeleteTemplate) {
      const templates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');
      const updatedTemplates = templates.filter(t => t.id !== task.templateId);

      localStorage.setItem('recurringTasks', JSON.stringify(updatedTemplates));

      // Also delete all instances of this template from tasks
      const storedTasks = localStorage.getItem('tasks');
      const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];
      const updatedTasks = fullTasksArray.filter(t => t.templateId !== task.templateId);

      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
      setTasks(updatedTasks);

      backupManager.saveAutoBackup();
      window.dispatchEvent(new Event('storage'));

    }
  };

  const handleDeleteFromEdit = (task) => {
    if (task.templateId) {
      // For recurring tasks, ask which scope to delete
      const deleteScope = window.confirm(
        'Delete just this task instance?\n\nClick OK to delete this instance only.\nClick Cancel to delete the entire series.'
      );

      if (deleteScope) {
        // Delete instance
        const confirmed = window.confirm('Are you sure you want to delete this task? This cannot be undone.');
        if (confirmed) {
          const storedTasks = localStorage.getItem('tasks');
          const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];
          let updatedTasks = fullTasksArray.filter(t => t.id !== task.id);

          // --- BUG FIX: Generate next occurrence ---
          const { nextTask, insertIndex } = createNextRecurrence(task, updatedTasks);
          if (nextTask) {
            updatedTasks.splice(insertIndex, 0, nextTask);
            updatedTasks = updatedTasks.map((t, index) => ({
              ...t,
              customPriority: updatedTasks.length - index,
            }));
          }

          localStorage.setItem('tasks', JSON.stringify(updatedTasks));
          backupManager.saveAutoBackup();
          setTasks(updatedTasks);
          window.dispatchEvent(new Event('storage'));
          handleCancelEdit();
        }
      } else {
        // Delete series
        const confirmed = window.confirm(
          `Are you sure you want to delete the entire "${task.title}" series? This will delete the template and all future tasks.`
        );

        if (confirmed) {
          const templates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');
          const updatedTemplates = templates.filter(t => t.id !== task.templateId);
          localStorage.setItem('recurringTasks', JSON.stringify(updatedTemplates));

          const storedTasks = localStorage.getItem('tasks');
          const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];
          const updatedTasks = fullTasksArray.filter(t => t.templateId !== task.templateId);
          localStorage.setItem('tasks', JSON.stringify(updatedTasks));
          backupManager.saveAutoBackup();
          setTasks(updatedTasks);
          window.dispatchEvent(new Event('storage'));
          handleCancelEdit();
        }
      }
    } else {
      // Normal task delete
      const confirmed = window.confirm('Are you sure you want to delete this task? This cannot be undone.');
      if (confirmed) {
        const storedTasks = localStorage.getItem('tasks');
        const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];
        const updatedTasks = fullTasksArray.filter(t => t.id !== task.id);
        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
        backupManager.saveAutoBackup();
        setTasks(updatedTasks);
        window.dispatchEvent(new Event('storage'));
        handleCancelEdit();
      }
    }
  };

  const handleMoveToTop = (taskId) => {
    // 1. Get all tasks
    const storedTasks = localStorage.getItem('tasks');
    const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

    // 2. Find max priority
    let maxPriority = -1;
    fullTasksArray.forEach(t => {
      if (t.customPriority && typeof t.customPriority === 'number') {
        if (t.customPriority > maxPriority) maxPriority = t.customPriority;
      }
    });

    // 3. Update target task
    const updatedTasks = fullTasksArray.map(t => {
      if (t.id === taskId) {
        return { ...t, customPriority: maxPriority + 1 };
      }
      return t;
    });

    // 4. Save
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    backupManager.saveAutoBackup();
    setTasks(updatedTasks);
    window.dispatchEvent(new Event('storage'));
  };

  /* ===== SORT HELPER (Matches TasksTab.jsx) ===== */
  const compareTasks = (a, b) => {
    const aOverdue = isTaskOverdue(a);
    const bOverdue = isTaskOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aOverdue && bOverdue) return new Date(a.dueDate) - new Date(b.dueDate);

    // Ignore priorities for natural sort

    // Date/Time sort
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && b.dueDate) {
      if (a.dueDate === b.dueDate) {
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        if (a.time && b.time) {
          const aDateTime = new Date(`${a.dueDate}T${a.time}`);
          const bDateTime = new Date(`${b.dueDate}T${b.time}`);
          return aDateTime - bDateTime;
        }
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    return 0;
  };

  const handleRestoreLocation = (taskId) => {
    // 1. Get all tasks
    const storedTasks = localStorage.getItem('tasks');
    const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

    // 2. Identify target task
    const targetTask = fullTasksArray.find(t => t.id === taskId);
    if (!targetTask) return;

    // 3. Create a list of tasks WITHOUT the target, sorted by CURRENT ACTUAL ORDER (Priority > Date)
    // We need to find where it *would* land if we just Unpinned it (removed priority).
    // If everyone else is Pinned, we need to inject it into the Pinned list at the right sorted spot.

    // Let's Sort the CURRENT full list by Natural Date Order (ignoring Priorities)
    // This gives us the "Ideal Date Order"
    const naturalSorted = [...fullTasksArray].sort(compareTasks);

    // Find neighbors in Natural Order
    const naturalIndex = naturalSorted.findIndex(t => t.id === taskId);
    if (naturalIndex === -1) return; // Should not happen

    const prevTask = naturalIndex > 0 ? naturalSorted[naturalIndex - 1] : null;
    const nextTask = naturalIndex < naturalSorted.length - 1 ? naturalSorted[naturalIndex + 1] : null;

    // Now find the ACTUAL Priorities of these neighbors in the real list
    let newPriority;

    if (prevTask && nextTask) {
      const prevPrio = prevTask.customPriority ?? 0;
      const nextPrio = nextTask.customPriority ?? 0;
      // If both neighbors are 0 (unpinned), I can be 0.
      // If neighbors have priorities, I need to be between them.
      if (prevPrio === 0 && nextPrio === 0) {
        newPriority = undefined; // Unpin
      } else {
        // Calculate midpoint
        newPriority = (prevPrio + nextPrio) / 2;
      }
    } else if (prevTask) {
      // I am last in natural order
      const prevPrio = prevTask.customPriority ?? 0;
      if (prevPrio === 0) newPriority = undefined;
      else newPriority = prevPrio - 1; // Go below prev
    } else if (nextTask) {
      // I am first in natural order
      const nextPrio = nextTask.customPriority ?? 0;
      if (nextPrio === 0) newPriority = undefined;
      else newPriority = nextPrio + 1; // Go above next
    } else {
      // Alone
      newPriority = undefined;
    }

    // 5. Update Task
    const updatedTasks = fullTasksArray.map(t => {
      if (t.id === taskId) {
        if (newPriority === undefined) {
          const { customPriority, ...rest } = t;
          return rest;
        }
        return { ...t, customPriority: newPriority };
      }
      return t;
    });

    // 6. Save
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    backupManager.saveAutoBackup();
    setTasks(updatedTasks);
    window.dispatchEvent(new Event('storage'));
  };

  const handleMenuToggle = useCallback((task, buttonRect) => {
    const clickedTaskId = task.id;

    // Validate buttonRect
    if (!buttonRect || typeof buttonRect.top === 'undefined' || typeof buttonRect.bottom === 'undefined') {
      console.error('[TaskList] Invalid buttonRect provided to handleMenuToggle');
      return;
    }

    // Calculate menu position with smart positioning (above or below)
    const menuHeight = 160; // Approximate menu height in pixels
    const spaceBelow = window.innerHeight - buttonRect.bottom;

    let top;
    if (spaceBelow < menuHeight) {
      // Not enough space below - position above the button
      top = buttonRect.top - menuHeight - 8;
    } else {
      // Enough space below - position below the button
      top = buttonRect.bottom + 8;
    }

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
  }, [setOpenMenuTaskId, setMenuPosition]);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl p-8 border border-transparent text-center" style={{ backdropFilter: 'blur(12px) saturate(180%)', background: 'rgba(255, 255, 255, 0.03)' }}>
        <p className="text-white/70">No tasks yet. Create your first task above!</p>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          /* Task Card Glow Effects - Hover Only (matching Dashboard) */
          .task-glow-not-started {
            box-shadow: none;
            transition: box-shadow 200ms ease-in-out;
          }

          .task-glow-not-started:hover {
            box-shadow: 0 0 10px rgba(100, 200, 255, 0.18);
          }

          .task-glow-in-progress {
            box-shadow: none;
            transition: box-shadow 200ms ease-in-out;
          }

          .task-glow-in-progress:hover {
            box-shadow: 0 0 10px rgba(255, 200, 50, 0.2);
          }

          .task-glow-complete {
            box-shadow: none;
            transition: box-shadow 200ms ease-in-out;
          }

          .task-glow-complete:hover {
            box-shadow: 0 0 8px rgba(61, 214, 140, 0.15);
          }

          .task-glow-overdue {
            box-shadow: none;
            transition: box-shadow 200ms ease-in-out;
          }

          .task-glow-overdue:hover {
            box-shadow: 0 0 12px rgba(255, 50, 50, 0.25);
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
              isMenuOpen={openMenuTaskId === task.id}
              onMenuToggle={(buttonRect) => handleMenuToggle(task, buttonRect)}
              isEditingTemplate={isEditingTemplate}
              onDeleteTask={handleDeleteFromEdit}
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
            className="fixed z-30 w-48 rounded-lg border border-white/10 shadow-xl overflow-hidden"
            style={{
              position: 'absolute',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              backdropFilter: 'blur(12px) saturate(180%)',
              background: 'rgba(24, 24, 27, 0.6)'
            }}
          >
            <button
              onClick={() => {
                handleDuplicate(openMenuTaskId);
                setOpenMenuTaskId(null);
              }}
              className="w-full px-4 py-2 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              <Copy size={14} />
              Duplicate
            </button>
            <div className="border-t border-white/10" />
            <button
              onClick={() => {
                handleMoveToTop(openMenuTaskId);
                setOpenMenuTaskId(null);
              }}
              className="w-full px-4 py-2 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              <ArrowUp size={14} />
              Move to Top
            </button>
            <button
              onClick={() => {
                handleRestoreLocation(openMenuTaskId);
                setOpenMenuTaskId(null);
              }}
              className="w-full px-4 py-2 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              <RotateCcw size={14} />
              Restore Location
            </button>
            <div className="border-t border-white/10" />
            {/* Show split delete options for recurring tasks */}
            {tasks.find(t => t.id === openMenuTaskId)?.templateId ? (
              <>
                <button
                  onClick={() => {
                    handleDeleteInstance(openMenuTaskId);
                    setOpenMenuTaskId(null);
                  }}
                  className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete Task
                </button>
                <button
                  onClick={() => {
                    handleDeleteSeries(openMenuTaskId);
                    setOpenMenuTaskId(null);
                  }}
                  className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete Series
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  handleDeleteInstance(openMenuTaskId);
                  setOpenMenuTaskId(null);
                }}
                className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default TaskList;
