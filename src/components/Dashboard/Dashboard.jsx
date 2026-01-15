import React, { useState, useEffect, memo, useRef, useMemo, useCallback, Suspense } from 'react';
import { Clock, AlertCircle, Sparkles, ExternalLink, GripVertical, X, ArrowLeft, Pencil, Save, Trash2, FileText, Folder, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import CircularProgress from './CircularProgress';
import PomodoroTimer from './PomodoroTimer';
import MoodTracker from './MoodTracker';
import SleepTracker from './SleepTracker';
import TaskForm from '../Tasks/TaskForm';
import backupManager from '../../utils/backupManager';
import { dateToLocalISO, parseLocalDateAtNoon, getLocalISOString } from '../../utils/dateHelpers';

import { isTaskOverdue } from '../../utils/taskHelpers';
import { createNextRecurrence } from '../../utils/recurringTaskService';
import { formatDateTimeDisplay, formatTime12Hour, getTimeRemaining, formatDate } from '../../utils/dateFormatting';
import { useTasks } from '../../context/TaskContext';
import { getStatusIcon, getCardGlow, getCheckboxClass } from '../../utils/taskUIHelpers';

const SemesterCompleteModal = React.lazy(() => import('./SemesterCompleteModal'));



// ===== TASK CARD COMPONENT =====
const TaskCard = memo(React.forwardRef(({ task, justCompletedId, onViewDetails, onStatusChange, onStartEdit, draggedTask, dragOverTask, onDragStart, onDragOver, onDrop, onDragEnd }, ref) => {
  const taskIsOverdue = isTaskOverdue(task);
  const isJustCompleted = justCompletedId === task.id;
  const glowClass = getCardGlow(task, taskIsOverdue);

  const [isAttachmentsMenuOpen, setIsAttachmentsMenuOpen] = useState(false);

  // Memoize event handlers
  const handleOpenFile = useCallback(async (filePath) => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('shell:open-path', filePath);
      if (!result.success) {
        console.error('Failed to open file:', result.error);
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  }, []);

  const handleAttachmentClick = useCallback((e) => {
    e.stopPropagation();
    if (task.attachments && task.attachments.length === 1) {
      handleOpenFile(task.attachments[0]);
    } else if (task.attachments && task.attachments.length > 1) {
      setIsAttachmentsMenuOpen(prev => !prev);
    }
  }, [task.attachments, handleOpenFile]);


  const handleMouseEnter = useCallback((e) => {
    if ((task.description || task.url) && !draggedTask) {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
      e.currentTarget.style.transform = 'translateY(-2px) translateZ(0)';
    }
  }, [task.description, task.url, draggedTask]);

  const handleMouseLeave = useCallback((e) => {
    if ((task.description || task.url) && !draggedTask) {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      e.currentTarget.style.transform = 'translateZ(0)';
    }
  }, [task.description, task.url, draggedTask]);

  const handleCardClick = useCallback(() => {
    if ((task.description || task.url) && !draggedTask) {
      onViewDetails(task.id);
    }
  }, [task.description, task.url, task.id, draggedTask, onViewDetails]);

  const handleCheckboxClick = useCallback((e) => {
    e.stopPropagation();
    onStatusChange(task.id);
  }, [task.id, onStatusChange]);

  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    onStartEdit(task);
  }, [task, onStartEdit]);

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
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragOver={(e) => onDragOver(e, task)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, task)}
      className={`relative rounded-lg p-3 border transition-all ${glowClass} ${taskIsOverdue ? 'border-red-500/50' :
        dragOverTask?.id === task.id ? 'border-green-glow' :
          'border-transparent'
        } ${draggedTask?.id === task.id ? 'opacity-50' : ''} ${(task.description || task.url) && !draggedTask ? 'cursor-pointer' : 'cursor-move'}`}
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
        backdropFilter: 'blur(12px) saturate(180%)',
        background: 'rgba(255, 255, 255, 0.03)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
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
                transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.03 }}
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
              transition={{ duration: 0.4 }}
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
          <div className="text-white/40 hover:text-green-glow transition-colors cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical size={16} />
          </div>

          {/* Checkbox */}
          <motion.button
            onClick={handleCheckboxClick}
            className={`flex-shrink-0 ${getCheckboxClass(task, taskIsOverdue)}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {getStatusIcon(task.status)}
          </motion.button>

          {/* Task Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className={`font-medium truncate ${task.status === 'complete'
                ? 'text-white/70 line-through'
                : 'text-white'
                }`}>
                {task.title}
              </p>
              {taskIsOverdue && (
                <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5 flex-shrink-0">
                  <AlertCircle size={8} />
                  OVERDUE
                </span>
              )}
            </div>
            {task.dueDate && (
              <p className={`text-xs flex items-center gap-1 ${taskIsOverdue ? 'text-red-500 font-semibold' : 'text-white/40'
                }`}>
                {taskIsOverdue ? <AlertCircle size={10} /> : <Clock size={10} />}
                {formatDateTimeDisplay(task.dueDate, task.time, taskIsOverdue)}
                {task.templateId && (
                  <Repeat size={10} className="text-white/40 ml-0.5" title="Recurring task" />
                )}
              </p>
            )}
          </div>
        </div>

        {/* Attachment Icon Button */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="relative">
            <motion.button
              onClick={handleAttachmentClick}
              className="relative p-1.5 rounded-lg bg-glass-overlay hover:bg-glass-surface border border-bg-secondary hover:border-green-glow/50 text-white/40 hover:text-green-glow transition-all flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={`Open first attachment (${task.attachments.length} total)`}
            >
              <FileText size={14} />
              {(() => {
                const additionalFiles = task.attachments.length - 1;
                if (additionalFiles > 0) {
                  return (
                    <span className="absolute -top-1.5 -right-1.5 bg-green-glow text-bg-primary text-[10px] font-bold px-1 rounded-full leading-none">
                      +{additionalFiles}
                    </span>
                  );
                }
                return null;
              })()}
            </motion.button>

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
        )}

        {/* Edit Button */}
        <motion.button
          onClick={handleEditClick}
          className="p-1.5 rounded-lg liquid-bubble-filled text-white/70 hover:text-green-glow transition-all flex-shrink-0"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Edit task"
        >
          <Pencil size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}));

TaskCard.displayName = 'TaskCard';

const Dashboard = ({ setActiveTab }) => {
  // Use centralized task context
  const { tasks, setTasks, changeStatus: contextChangeStatus, reorderTask, moveToTop, restoreLocation, duplicateTask, deleteTask: contextDeleteTask } = useTasks();

  const [userName, setUserName] = useState('');
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [breakDaysLeft, setBreakDaysLeft] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all');
  const [detailViewTaskId, setDetailViewTaskId] = useState(null);
  const [justCompletedId, setJustCompletedId] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    url: '',
    dueDate: '',
    time: '',
    status: 'not-started',
    taskType: 'academic',
    attachments: []
  });
  // Edit scope ref for recurring tasks (synced with TaskForm)
  const editScopeRef = useRef('instance'); // Keep ref for internal logic if needed, but primary UI driver is now state
  const [editScope, setEditScope] = useState('instance');
  // Ref for scrollable container
  const scrollContainerRef = useRef(null);
  // State for attachment drag-and-drop
  const [draggedAttachmentIndex, setDraggedAttachmentIndex] = useState(null);
  const [dragOverAttachmentIndex, setDragOverAttachmentIndex] = useState(null);

  // Ref for completion timeouts map to handle multiple concurrent completions independently
  const completionTimeoutsRef = useRef(new Map());

  // Semester End Modal state
  const [showSemesterEndModal, setShowSemesterEndModal] = useState(false);
  const [nextBreakStartDefault, setNextBreakStartDefault] = useState('');

  // Check for semester end on mount
  useEffect(() => {
    const checkSemesterEnd = () => {
      const semesterEndDate = localStorage.getItem('semesterEndDate') || '2025-12-11';
      const breakStartDate = localStorage.getItem('breakStartDate') || '';

      const today = parseLocalDateAtNoon(getLocalISOString());
      const endDate = parseLocalDateAtNoon(semesterEndDate);

      // Show modal if semester has ended and no break has been set
      if (today > endDate && !breakStartDate) {
        // Calculate default values for next semester
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        setNextBreakStartDefault(dateToLocalISO(nextDay));

        setShowSemesterEndModal(true);
      }
    };

    checkSemesterEnd();
  }, []);

  useEffect(() => {
    const calculateProgress = () => {
      const breakStartDate = localStorage.getItem('breakStartDate') || '';
      const semesterStartDate = localStorage.getItem('semesterStartDate') || '2025-08-25';
      const semesterEndDate = localStorage.getItem('semesterEndDate') || '2025-12-11';

      const today = parseLocalDateAtNoon(getLocalISOString());

      const startDate = parseLocalDateAtNoon(semesterStartDate);
      const endDate = parseLocalDateAtNoon(semesterEndDate);

      // Auto-Shutoff Logic: If semester has started and break mode is active, turn it off
      if (today >= startDate && breakStartDate) {
        localStorage.removeItem('breakStartDate');
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('semesterDatesChanged'));
        // Re-read to ensure we have the updated value
        return; // Exit and let the event trigger a recalculation
      }

      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const notStartedYet = today < startDate;

      if (notStartedYet) {
        setDaysRemaining(-1);

        // If breakStartDate exists, calculate break progress
        if (breakStartDate) {
          const breakStart = parseLocalDateAtNoon(breakStartDate);

          // Calculate days until semester starts
          const daysUntilStart = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
          setBreakDaysLeft(daysUntilStart);

          // Calculate progress percentage based on break duration
          const totalBreakDays = Math.ceil((startDate - breakStart) / (1000 * 60 * 60 * 24));
          const breakDaysPassed = Math.ceil((today - breakStart) / (1000 * 60 * 60 * 24));
          const percentage = Math.min(Math.max((breakDaysPassed / totalBreakDays) * 100, 0), 100);
          setProgressPercentage(percentage);
        } else {
          setBreakDaysLeft(null);
          setProgressPercentage(0);
        }
      } else {
        setDaysRemaining(diffDays);
        setBreakDaysLeft(null);

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
  // NOTE: Task loading is now handled by TaskContext - removed duplicated loadTasks logic

  // Load task filter from localStorage
  useEffect(() => {
    const savedFilter = localStorage.getItem('taskFilter') || 'all';
    setTaskFilter(savedFilter);
  }, []);

  const handleFilterChange = (filter) => {
    setTaskFilter(filter);
    localStorage.setItem('taskFilter', filter);
    window.dispatchEvent(new Event('taskFilterChanged'));
  };

  // Using the isTaskOverdue utility function defined at the top of the file



  const handleStatusChange = useCallback((taskId) => {
    // Clear any existing timeout for this specific task
    if (completionTimeoutsRef.current.has(taskId)) {
      clearTimeout(completionTimeoutsRef.current.get(taskId));
      completionTimeoutsRef.current.delete(taskId);
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Calculate the new status
    let newStatus;
    let completedAt = task.completedAt;

    if (task.status === 'not-started') {
      newStatus = 'in-progress';
    } else if (task.status === 'in-progress') {
      newStatus = 'complete';
      completedAt = new Date().toISOString();
    } else {
      newStatus = 'not-started';
      completedAt = null;
    }

    // OPTIMISTIC UI UPDATE
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status: newStatus, completedAt };
      }
      return t;
    });
    setTasks(updatedTasks);

    // Save the optimistic update to localStorage immediately
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));

    // If just moved to complete, start the timer logic
    if (newStatus === 'complete') {
      setJustCompletedId(taskId);

      // Capture the completed task data for the timeout
      const completedTask = { ...task, status: 'complete', completedAt };

      const timeoutId = setTimeout(() => {
        // Clear animation state
        setJustCompletedId(null);

        // Update completed tasks list
        const existingCompleted = JSON.parse(localStorage.getItem('completedTasks') || '[]');
        localStorage.setItem('completedTasks', JSON.stringify([completedTask, ...existingCompleted]));

        // Read fresh tasks from localStorage
        const freshTasks = JSON.parse(localStorage.getItem('tasks') || '[]');

        // Remove from active tasks list
        let activeTasks = freshTasks.filter(t => t.id !== taskId);

        // Create recurrence if needed
        if (completedTask.templateId) {
          const { nextTask, insertIndex } = createNextRecurrence(completedTask, activeTasks);
          if (nextTask) {
            // Find tasks with the SAME due date (and optionally time) to place near them
            const sameDateTasks = activeTasks.filter(t =>
              t.dueDate === nextTask.dueDate && !isTaskOverdue(t)
            );

            // Further filter to same time if the new task has a time
            const sameTimeTasks = nextTask.time
              ? sameDateTasks.filter(t => t.time === nextTask.time)
              : sameDateTasks;

            let newPriority;

            if (sameTimeTasks.length > 0) {
              // Use the average priority of same-date/time tasks
              const avgPriority = sameTimeTasks.reduce((sum, t) => sum + (t.customPriority ?? 0), 0) / sameTimeTasks.length;
              // Slight offset to avoid exact collision
              newPriority = avgPriority - 0.01;
            } else if (sameDateTasks.length > 0) {
              // No same-time tasks, but same-date tasks exist
              const avgPriority = sameDateTasks.reduce((sum, t) => sum + (t.customPriority ?? 0), 0) / sameDateTasks.length;
              newPriority = avgPriority - 0.01;
            } else {
              // No similar tasks - fall back to neighbor-based calculation
              const beforeTask = activeTasks[insertIndex - 1];
              const afterTask = activeTasks[insertIndex];

              if (beforeTask && afterTask) {
                newPriority = ((beforeTask.customPriority ?? 0) + (afterTask.customPriority ?? 0)) / 2;
              } else if (beforeTask) {
                newPriority = (beforeTask.customPriority ?? 0) - 1;
              } else if (afterTask) {
                newPriority = (afterTask.customPriority ?? 0) + 1;
              } else {
                newPriority = 1;
              }
            }

            const newTaskWithPriority = { ...nextTask, customPriority: newPriority };
            activeTasks.splice(insertIndex, 0, newTaskWithPriority);
          }
        }

        // Save everything
        setTasks(activeTasks);
        localStorage.setItem('tasks', JSON.stringify(activeTasks));
        backupManager.saveAutoBackup();
        window.dispatchEvent(new Event('storage'));

        // Clean up map
        completionTimeoutsRef.current.delete(taskId);
      }, 700);

      completionTimeoutsRef.current.set(taskId, timeoutId);
    } else {
      // For non-completion updates, trigger backup
      backupManager.saveAutoBackup();
      window.dispatchEvent(new Event('storage'));
    }
  }, [tasks]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      completionTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      completionTimeoutsRef.current.clear();
    };
  }, []);

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

  const handleDragStart = useCallback((e, task) => {
    setDraggedTask(task);
    setDetailViewTaskId(null); // Close detail view when dragging starts
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  }, []);

  const handleDragOver = useCallback((e, task) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTask && task.id !== draggedTask.id) {
      setDragOverTask(task);
    }
  }, [draggedTask]);

  const handleDragEnd = useCallback(() => {
    setDraggedTask(null);
    setDragOverTask(null);
  }, []);

  // Sort and limit tasks for dashboard - show top 5
  // Memoized to prevent expensive recalculation on every render
  const displayTasks = useMemo(() => {
    return tasks
      .filter(task => {
        // Type Filter
        if (taskFilter === 'academic' && (task.taskType || 'academic') !== 'academic') return false;
        if (taskFilter === 'personal' && task.taskType !== 'personal') return false;
        return true;
      })
      .sort((a, b) => {
        // 1. Primary Split: Overdue tasks always at the top
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);

        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        // 2. Secondary Sort: Custom Priority (Highest first)
        const priorityA = a.customPriority ?? 0;
        const priorityB = b.customPriority ?? 0;

        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }

        // 3. Tie-breakers

        // Due Date (Earliest first)
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }

        // Creation Date (Newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
      .slice(0, 5);
  }, [tasks, taskFilter]);

  const handleDrop = useCallback((e, dropTask) => {
    e.preventDefault();

    if (!draggedTask || draggedTask.id === dropTask.id) {
      handleDragEnd();
      return;
    }

    // The 'displayTasks' is the SORTED/FILTERED list that the user sees
    // We need to calculate the new priority for draggedTask based on its position
    // relative to dropTask in the VISIBLE list

    // Find the indices in the VISIBLE (sorted/filtered) list
    const visibleDragIndex = displayTasks.findIndex(t => t.id === draggedTask.id);
    const visibleDropIndex = displayTasks.findIndex(t => t.id === dropTask.id);

    if (visibleDragIndex === -1 || visibleDropIndex === -1) {

      handleDragEnd();
      return;
    }

    // Determine the new priority for the dragged task
    // If dragging DOWN (visibleDragIndex < visibleDropIndex): place AFTER dropTask
    // If dragging UP (visibleDragIndex > visibleDropIndex): place BEFORE dropTask

    let newPriority;
    const dropTaskPriority = dropTask.customPriority ?? 0;
    const dropTaskOverdue = isTaskOverdue(dropTask);

    if (visibleDragIndex < visibleDropIndex) {
      // Dragging DOWN - place AFTER dropTask
      const taskAfterDrop = displayTasks[visibleDropIndex + 1];
      const afterPriority = taskAfterDrop?.customPriority ?? (dropTaskPriority - 1);
      newPriority = (dropTaskPriority + afterPriority) / 2;
    } else {
      // Dragging UP - place BEFORE dropTask
      const taskBeforeDrop = displayTasks[visibleDropIndex - 1];

      // Check if we're crossing the overdue/non-overdue boundary
      // If taskBeforeDrop is overdue but dropTask is not, we're at the top of non-overdue section
      const crossingBoundary = taskBeforeDrop && isTaskOverdue(taskBeforeDrop) && !dropTaskOverdue;

      let beforePriority;
      if (!taskBeforeDrop || crossingBoundary) {
        // No task before, or crossing overdue boundary - use a priority ABOVE dropTask
        beforePriority = dropTaskPriority + 1;
      } else {
        beforePriority = taskBeforeDrop.customPriority ?? (dropTaskPriority + 1);
      }

      newPriority = (beforePriority + dropTaskPriority) / 2;
    }



    // Update only the dragged task's priority in the full task list
    const updatedTasks = tasks.map(t => {
      if (t.id === draggedTask.id) {
        return { ...t, customPriority: newPriority };
      }
      return t;
    });

    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));

    // Backup after save
    backupManager.saveAutoBackup();

    window.dispatchEvent(new Event('storage'));
    handleDragEnd();
  }, [draggedTask, tasks, displayTasks, handleDragEnd]);

  const handleStartEdit = (task) => {
    setIsEditingDetail(true);
    editScopeRef.current = 'instance'; // Reset to default scope
    setEditForm({
      title: task.title,
      description: task.description || '',
      url: task.url || '',
      dueDate: task.dueDate || '',
      time: task.time || '',
      status: task.status,
      taskType: task.taskType || 'academic',
      attachments: task.attachments || []
    });
  };

  const handleCancelEdit = () => {
    setIsEditingDetail(false);
    setDetailViewTaskId(null); // Close detail view, return to main dashboard
    setEditForm({
      title: '',
      description: '',
      url: '',
      dueDate: '',
      time: '',
      status: 'not-started',
      taskType: 'academic',
      attachments: []
    });
    // Scroll to top when returning to main dashboard
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // File attachment handlers for detail/edit view
  const handleAttachFilesClick = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('dialog:show-open-dialog');

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const currentAttachments = editForm.attachments || [];
        const newPaths = result.filePaths.filter(path => !currentAttachments.includes(path));
        setEditForm({ ...editForm, attachments: [...currentAttachments, ...newPaths] });
      }
    } catch (error) {
      console.error('Error attaching files:', error);
    }
  };

  const handleRemoveAttachment = (filePathToRemove) => {
    const updatedAttachments = (editForm.attachments || []).filter(path => path !== filePathToRemove);
    setEditForm({ ...editForm, attachments: updatedAttachments });
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

    setEditForm(prev => ({ ...prev, attachments: items }));
    setDraggedAttachmentIndex(null);
    setDragOverAttachmentIndex(null);
  };

  const handleAttachmentDragEnd = () => {
    setDraggedAttachmentIndex(null);
    setDragOverAttachmentIndex(null);
  };

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

  const handleDeleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if this is a recurring task instance
    if (task.templateId) {
      // Use editScopeRef to determine whether to delete instance or series
      // Use editScope state to determine whether to delete instance or series
      if (editScope === 'instance') {
        // Delete just this instance
        const storedTasks = localStorage.getItem('tasks');
        const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

        let updatedTasks = fullTasksArray.filter(t => t.id !== taskId);

        // --- BUG FIX: Generate next occurrence when deleting an instance ---
        // This prevents the series from disappearing from view
        const { nextTask, insertIndex } = createNextRecurrence(task, updatedTasks);

        if (nextTask) {
          updatedTasks.splice(insertIndex, 0, nextTask);

          // Calculate fractional priority for ONLY the new task
          // This preserves the order of all other tasks
          const prevTask = updatedTasks[insertIndex - 1];
          const nextTaskObj = updatedTasks[insertIndex + 1];

          const prevPriority = prevTask ? prevTask.customPriority : (nextTaskObj ? nextTaskObj.customPriority + 200000 : 200000);
          const nextPriority = nextTaskObj ? nextTaskObj.customPriority : (prevTask ? prevTask.customPriority - 200000 : 0);

          nextTask.customPriority = (prevPriority + nextPriority) / 2;
        }

        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
        backupManager.saveAutoBackup();
        setTasks(updatedTasks);

        // Close detail view
        setDetailViewTaskId(null);
        setIsEditingDetail(false);

        window.dispatchEvent(new Event('storage'));
      } else {
        // Delete the entire template (with safety confirmation)
        const confirmDeleteTemplate = window.confirm(
          `Are you sure you want to delete the entire "${task.title}" template? This will stop it from generating new tasks.`
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


          // Close detail view
          setDetailViewTaskId(null);
          setIsEditingDetail(false);
        }
      }
    } else {
      // Normal task - delete with confirmation
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

      // Update state
      setTasks(updatedTasks);

      // Close detail view
      setDetailViewTaskId(null);
      setIsEditingDetail(false);

      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleSaveEdit = (taskId) => {
    if (!editForm.title.trim()) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if this is a recurring task instance
    if (task.templateId) {
      // Use editScopeRef to determine whether to edit instance or series
      if (editScopeRef.current === 'instance') {
        // Edit just this instance
        const storedTasks = localStorage.getItem('tasks');
        const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

        const updatedTasks = fullTasksArray.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              title: editForm.title.trim(),
              description: editForm.description.trim(),
              url: editForm.url.trim() || null,
              dueDate: editForm.dueDate || null,
              time: editForm.time || null,
              status: editForm.status,
              taskType: editForm.taskType,
              attachments: editForm.attachments || []
            };
          }
          return t;
        });

        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
        backupManager.saveAutoBackup();
        setTasks(updatedTasks);
        window.dispatchEvent(new Event('storage'));

      } else {
        // Edit the template
        const templates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');
        const updatedTemplates = templates.map(template => {
          if (template.id === task.templateId) {
            return {
              ...template,
              title: editForm.title.trim(),
              description: editForm.description.trim(),
              url: editForm.url.trim() || null,
              time: editForm.time || null,
              taskType: editForm.taskType,
              attachments: editForm.attachments || []
            };
          }
          return template;
        });

        localStorage.setItem('recurringTasks', JSON.stringify(updatedTemplates));

        // Also update all existing instances of this template
        const storedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const updatedTasks = storedTasks.map(t => {
          if (t.templateId === task.templateId) {
            return {
              ...t,
              title: editForm.title.trim(),
              description: editForm.description.trim(),
              url: editForm.url.trim() || null,
              time: editForm.time || null,
              taskType: editForm.taskType,
              attachments: editForm.attachments || [],
              // Keep instance-specific fields unchanged
            };
          }
          return t;
        });

        localStorage.setItem('tasks', JSON.stringify(updatedTasks));

        // Also update completed tasks
        const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
        const updatedCompletedTasks = completedTasks.map(t => {
          if (t.templateId === task.templateId) {
            return {
              ...t,
              title: editForm.title.trim(),
              description: editForm.description.trim(),
              url: editForm.url.trim() || null,
              time: editForm.time || null,
              taskType: editForm.taskType,
              attachments: editForm.attachments || [],
              // Keep instance-specific fields unchanged
            };
          }
          return t;
        });

        localStorage.setItem('completedTasks', JSON.stringify(updatedCompletedTasks));

        // Update parent state
        setTasks(updatedTasks);

        backupManager.saveAutoBackup();
        window.dispatchEvent(new Event('storage'));

      }
    } else {
      // Normal task - save as usual
      const storedTasks = localStorage.getItem('tasks');
      const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

      const updatedTasks = fullTasksArray.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            url: editForm.url.trim() || null,
            dueDate: editForm.dueDate || null,
            time: editForm.time || null,
            status: editForm.status,
            taskType: editForm.taskType,
            attachments: editForm.attachments || []
          };
        }
        return t;
      });

      // Save full array to localStorage
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));

      // Backup after save
      backupManager.saveAutoBackup();

      // Update state with full array
      setTasks(updatedTasks);

      window.dispatchEvent(new Event('storage'));
    }

    handleCancelEdit();
  };

  const handleStartEditFromCard = (task) => {
    setDetailViewTaskId(task.id);
    handleStartEdit(task);
  };

  const handleBeginBreak = (dates) => {
    const { breakStartDate, semesterStartDate, semesterEndDate } = dates;

    // Save the new semester dates and break start date
    localStorage.setItem('breakStartDate', breakStartDate);
    localStorage.setItem('semesterStartDate', semesterStartDate);
    localStorage.setItem('semesterEndDate', semesterEndDate);

    // Trigger auto-backup
    backupManager.saveAutoBackup();

    // Close modal
    setShowSemesterEndModal(false);

    // Dispatch events to update other components
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('semesterDatesChanged'));
  };



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
      <div ref={scrollContainerRef} className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header with Circular Progress */}
          <div className="mb-8 flex items-start justify-between">
            <div className="flex-1 mt-12">
              <h2 className="text-3xl font-bold text-white mb-2">
                {welcomeMessage}
              </h2>
              <p className="text-white/70">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {daysRemaining !== null && (
              <div className="relative z-[51] no-drag">
                <CircularProgress
                  daysRemaining={daysRemaining}
                  progressPercentage={progressPercentage}
                  breakDaysLeft={breakDaysLeft}
                />
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task List */}
            <div className="lg:col-span-2 glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
              {/* Header with Filter Buttons */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-xl font-semibold text-white">
                  Today's Tasks
                </h3>

                {/* Task Filter */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${taskFilter === 'all'
                      ? 'liquid-bubble-filled text-green-glow'
                      : 'bg-zinc-800/20 text-white/60 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    style={taskFilter === 'all' ? { boxShadow: '0 0 12px rgba(61, 214, 140, 0.2)' } : {}}
                  >
                    All
                  </button>
                  <button
                    onClick={() => handleFilterChange('academic')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${taskFilter === 'academic'
                      ? 'liquid-bubble-filled text-green-glow'
                      : 'bg-zinc-800/20 text-white/60 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    style={taskFilter === 'academic' ? { boxShadow: '0 0 12px rgba(61, 214, 140, 0.2)' } : {}}
                  >
                    Academic
                  </button>
                  <button
                    onClick={() => handleFilterChange('personal')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${taskFilter === 'personal'
                      ? 'liquid-bubble-filled text-green-glow'
                      : 'bg-zinc-800/20 text-white/60 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    style={taskFilter === 'personal' ? { boxShadow: '0 0 12px rgba(61, 214, 140, 0.2)' } : {}}
                  >
                    Personal
                  </button>
                </div>
              </div>



              {displayTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/70 mb-2">No tasks yet!</p>
                  <button
                    onClick={() => setActiveTab && setActiveTab('tasks')}
                    className="text-green-glow hover:underline text-sm"
                  >
                    Create your first task →
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {!detailViewTaskId ? (
                    /* Task List View */
                    <motion.div
                      key="task-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {displayTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              justCompletedId={justCompletedId}
                              onViewDetails={setDetailViewTaskId}
                              onStatusChange={handleStatusChange}
                              onStartEdit={handleStartEditFromCard}
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
                        className="w-full mt-4 text-green-glow hover:text-green-glow/80 text-sm font-medium flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-glass-surface transition-all"
                      >
                        View All Tasks →
                      </button>
                    </motion.div>
                  ) : (
                    /* Detail View */
                    <motion.div
                      key="detail-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {(() => {
                        const detailTask = tasks.find(t => t.id === detailViewTaskId);
                        if (!detailTask) return null;

                        const taskIsOverdue = isTaskOverdue(detailTask);



                        return (
                          <div className="space-y-4">
                            {/* Header with Back Button and Edit Button */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => {
                                    setDetailViewTaskId(null);
                                    setIsEditingDetail(false);
                                  }}
                                  className="p-2 rounded-lg hover:bg-glass-surface transition-colors group"
                                >
                                  <ArrowLeft size={20} className="text-white/40 group-hover:text-green-glow transition-colors" />
                                </button>
                                <h4 className="text-lg font-semibold text-white">
                                  {isEditingDetail ? 'Edit Task' : 'Task Details'}
                                </h4>
                              </div>
                              {!isEditingDetail && (
                                <button
                                  onClick={() => handleStartEdit(detailTask)}
                                  className="p-2 rounded-lg liquid-bubble-filled text-white/70 hover:text-green-glow transition-all"
                                  title="Edit task"
                                >
                                  <Pencil size={16} />
                                </button>
                              )}
                            </div>

                            {/* Task Details Card or Edit Form */}
                            <div className="liquid-bubble-filled rounded-lg p-4 space-y-4">
                              {isEditingDetail ? (
                                /* Edit Form - Using TaskForm Component */
                                <div className="space-y-4">
                                  <TaskForm
                                    initialData={detailTask}
                                    onScopeChange={setEditScope}
                                    onTaskCreate={(data) => {
                                      try {
                                        const { scope, ...updatedFields } = data;

                                        // Sync edit scope from TaskForm
                                        if (scope) {
                                          editScopeRef.current = scope;
                                          setEditScope(scope);
                                        }


                                        // CASE 1: Converting plain task → recurring
                                        if (!detailTask.templateId && updatedFields.recurrence) {
                                          const newTemplateId = 'template-' + Date.now();
                                          const newTemplate = { ...updatedFields, id: newTemplateId, createdAt: new Date().toISOString() };

                                          const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                                          const updatedTasks = tasks.map(t => t.id === detailTask.id ? {
                                            ...t, ...updatedFields, templateId: newTemplateId,
                                            recurrenceAnchor: updatedFields.dueDate || t.dueDate, customPriority: 0
                                          } : t);

                                          const templates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');
                                          templates.push(newTemplate);
                                          localStorage.setItem('recurringTasks', JSON.stringify(templates));
                                          localStorage.setItem('tasks', JSON.stringify(updatedTasks));
                                          setTasks(updatedTasks);
                                          handleCancelEdit();
                                          backupManager.saveAutoBackup();
                                          window.dispatchEvent(new Event('storage'));
                                          return;
                                        }

                                        // CASE 2: Recurring → plain (remove recurrence)
                                        if (detailTask.templateId && !updatedFields.recurrence) {
                                          const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                                          const templates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');

                                          if (scope === 'series') {
                                            const newTemplates = templates.filter(t => t.id !== detailTask.templateId);
                                            const newTasks = tasks.filter(t => t.templateId !== detailTask.templateId);
                                            newTasks.push({ ...updatedFields, id: detailTask.id, recurrence: null, templateId: null, recurrenceAnchor: null, status: detailTask.status, createdAt: detailTask.createdAt, completedAt: null });
                                            localStorage.setItem('recurringTasks', JSON.stringify(newTemplates));
                                            localStorage.setItem('tasks', JSON.stringify(newTasks));
                                            setTasks(newTasks);
                                          } else {
                                            const updatedTasks = tasks.map(t => t.id === detailTask.id ? { ...t, ...updatedFields, recurrence: null, templateId: null, recurrenceAnchor: null } : t);
                                            localStorage.setItem('tasks', JSON.stringify(updatedTasks));
                                            setTasks(updatedTasks);
                                          }
                                          handleCancelEdit();
                                          backupManager.saveAutoBackup();
                                          window.dispatchEvent(new Event('storage'));
                                          return;
                                        }

                                        // CASE 3: SERIES EDIT - Nuclear rebuild (recurrence type changes)
                                        if (detailTask.templateId && scope === 'series' && updatedFields.recurrence) {
                                          const templates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');
                                          const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                                          const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');

                                          // 1. DELETE OLD - Remove old template and all instances (including completed)
                                          const newTemplates = templates.filter(t => t.id !== detailTask.templateId);
                                          const newTasks = tasks.filter(t => t.templateId !== detailTask.templateId);
                                          const newCompletedTasks = completedTasks.filter(t => t.templateId !== detailTask.templateId);

                                          // 2. CREATE NEW template - ONLY template-specific properties (no dueDate, status, etc.)
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

                                          // 3. CREATE NEW instance - ONLY instance-specific properties (no recurrence object)
                                          const instanceDueDate = updatedFields.dueDate || detailTask.dueDate;
                                          const newInstance = {
                                            id: detailTask.id,
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
                                            status: detailTask.status || 'not-started',
                                            createdAt: detailTask.createdAt || new Date().toISOString(),
                                            completedAt: null
                                          };
                                          newTasks.push(newInstance);

                                          localStorage.setItem('recurringTasks', JSON.stringify(newTemplates));
                                          localStorage.setItem('tasks', JSON.stringify(newTasks));
                                          localStorage.setItem('completedTasks', JSON.stringify(newCompletedTasks));
                                          setTasks(newTasks);
                                          handleCancelEdit();
                                          backupManager.saveAutoBackup();
                                          window.dispatchEvent(new Event('storage'));
                                          return;
                                        }

                                        // CASE 4: INSTANCE EDIT (or plain task edit)
                                        const storedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                                        const updatedTasks = storedTasks.map(t => {
                                          if (t.id === detailTask.id) {
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
                                        window.dispatchEvent(new Event('storage'));
                                        handleCancelEdit();
                                      } catch (error) {
                                        console.error('[Dashboard] Error saving task edit:', error);
                                        alert('Failed to save task changes. Please try again.');
                                      }
                                    }}
                                  />


                                  {/* Action Buttons */}
                                  <div className="space-y-3">
                                    {/* Cancel Button */}
                                    <button
                                      onClick={handleCancelEdit}
                                      className="w-full px-6 liquid-bubble-filled text-white font-semibold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                      <X size={16} />
                                      Cancel
                                    </button>

                                    {/* Edit Task Submit Button */}
                                    <button
                                      type="submit"
                                      form="edit-task-form"
                                      className="w-full bg-green-glow hover:bg-green-glow/90 text-bg-primary font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-glow hover:shadow-glow-lg"
                                    >
                                      <Save size={16} />
                                      {/* Dynamic button text based on scope */}
                                      {detailTask.templateId && editScope === 'series' ? 'Update Series' : 'Update Task'}
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                      onClick={() => handleDeleteTask(detailTask.id)}
                                      className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                      <Trash2 size={16} />
                                      {/* Dynamic delete button text based on editScope state */}
                                      {detailTask.templateId
                                        ? (editScope === 'instance' ? 'Delete Instance' : 'Delete Series')
                                        : 'Delete Task'
                                      }
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Detail View */
                                <>
                                  {/* Title */}
                                  <div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                      {detailTask.title}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`px-2 py-1 rounded text-xs ${detailTask.status === 'complete'
                                        ? 'bg-green-muted text-green-glow'
                                        : detailTask.status === 'in-progress'
                                          ? 'bg-yellow-500/10 text-yellow-500'
                                          : 'liquid-bubble-filled text-white/40'
                                        }`}>
                                        {detailTask.status === 'complete' ? 'Complete' : detailTask.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                                      </span>
                                      {taskIsOverdue && (
                                        <span className="px-2 py-1 rounded text-xs bg-red-500 text-white font-semibold">
                                          OVERDUE
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Due Date */}
                                  {detailTask.dueDate && (
                                    <div>
                                      <p className="text-sm text-white/40 mb-1">Due Date{detailTask.time && ' & Time'}</p>
                                      <p className={`text-sm font-medium ${taskIsOverdue ? 'text-red-500' : 'text-white'}`}>
                                        {formatDateTimeDisplay(detailTask.dueDate, detailTask.time, taskIsOverdue)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Description */}
                                  {detailTask.description && (
                                    <div>
                                      <p className="text-sm text-white/40 mb-1">Description</p>
                                      <p className="text-sm text-white/70 whitespace-pre-wrap">
                                        {detailTask.description}
                                      </p>
                                    </div>
                                  )}

                                  {/* URL */}
                                  {detailTask.url && (
                                    <div>
                                      <p className="text-sm text-white/40 mb-2">Related Link</p>
                                      <button
                                        onClick={() => handleOpenUrl(detailTask.url)}
                                        className="inline-flex items-center gap-2 text-sm text-green-glow hover:text-green-glow/80 transition-colors group"
                                      >
                                        <ExternalLink size={16} className="group-hover:scale-110 transition-transform" />
                                        <span className="underline">Open Link</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Attachments */}
                                  {detailTask.attachments && detailTask.attachments.length > 0 && (
                                    <div>
                                      <p className="text-sm text-white/40 mb-2">File Attachments</p>
                                      <div className="space-y-2">
                                        {detailTask.attachments.map((filePath, index) => {
                                          const fileName = filePath.split(/[\\/]/).pop();
                                          return (
                                            <div
                                              key={index}
                                              className="flex items-center justify-between liquid-bubble-filled rounded-lg px-3 py-2"
                                            >
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <FileText size={14} className="text-green-glow flex-shrink-0" />
                                                <span className="text-xs text-white truncate" title={filePath}>
                                                  {fileName}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => handleShowInFolder(filePath)}
                                                  className="p-1 hover:bg-green-glow/20 rounded transition-colors"
                                                  title="Show in Folder"
                                                >
                                                  <Folder size={14} className="text-green-glow" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenFile(filePath)}
                                                  className="p-1 hover:bg-green-glow/20 rounded transition-colors"
                                                  title="Open file"
                                                >
                                                  <ExternalLink size={14} className="text-green-glow" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Actions */}
                                  <div className="pt-2">
                                    <button
                                      onClick={() => {
                                        setDetailViewTaskId(null);
                                        handleStatusChange(detailTask.id);
                                      }}
                                      className="w-full bg-green-glow hover:bg-green-glow/90 text-bg-primary font-semibold py-2 px-4 rounded-lg transition-all"
                                    >
                                      {detailTask.status === 'not-started' ? 'Start Task' : detailTask.status === 'in-progress' ? 'Complete Task' : 'Mark as Not Started'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* Pomodoro Timer */}
            <PomodoroTimer />

            {/* Mood and Sleep Row */}
            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mood Tracker */}
              <MoodTracker />

              {/* Sleep Tracker */}
              <SleepTracker />
            </div>
          </div>
        </div>
      </div>

      {/* Semester End Modal */}
      <AnimatePresence>
        {showSemesterEndModal && (
          <Suspense fallback={null}>
            <SemesterCompleteModal
              defaultBreakStart={nextBreakStartDefault}
              onBeginBreak={handleBeginBreak}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
};

export default Dashboard;
