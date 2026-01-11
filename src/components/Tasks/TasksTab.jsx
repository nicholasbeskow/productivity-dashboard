import { CheckSquare, Search, Repeat, Sparkles } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import backupManager from '../../utils/backupManager';
import { isTaskOverdue } from '../../utils/taskHelpers';
import { getToday, parseLocalDate, parseLocalDateAtNoon } from '../../utils/dateHelpers';

const TasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showRecurring, setShowRecurring] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load tasks from localStorage on mount
  useEffect(() => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);

        // Validate that parsedTasks is an array
        if (!Array.isArray(parsedTasks)) {
          console.error('[TasksTab] Invalid tasks data: expected array, got', typeof parsedTasks);
          console.warn('[TasksTab] Corrupted data detected. Please restore from backup or clear storage.');
          setTasks([]);
          setIsInitialized(true);
          return;
        }

        // Filter out tasks with invalid data
        const validTasks = parsedTasks.filter(task => {
          // Basic validation: must have an id and title
          if (!task.id || !task.title) {
            console.warn('[TasksTab] Skipping task with missing id or title:', task);
            return false;
          }

          // Validate dueDate if present
          if (task.dueDate) {
            const testDate = parseLocalDateAtNoon(task.dueDate);
            if (isNaN(testDate.getTime())) {
              console.warn('[TasksTab] Skipping task with invalid dueDate:', task.id, task.dueDate);
              return false;
            }
          }

          return true;
        });

        // If we filtered out invalid tasks, save the cleaned array
        if (validTasks.length !== parsedTasks.length) {
          console.warn(`[TasksTab] Filtered out ${parsedTasks.length - validTasks.length} invalid task(s)`);
          localStorage.setItem('tasks', JSON.stringify(validTasks));
          backupManager.saveAutoBackup();
        }

        // Ensure all tasks have customPriority
        const tasksWithPriority = validTasks.map((task, index) => ({
          ...task,
          customPriority: task.customPriority ?? (validTasks.length - index),
        }));
        setTasks(tasksWithPriority);
      } catch (error) {
        console.error('[TasksTab] Error loading tasks from localStorage:', error);
        console.warn('[TasksTab] Tasks data is corrupted. Please restore from backup.');
        setTasks([]);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save tasks to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('tasks', JSON.stringify(tasks));

      // Backup after save
      backupManager.saveAutoBackup();
    }
  }, [tasks, isInitialized]);

  // Load task filters from localStorage and listen for changes
  useEffect(() => {
    const savedFilter = localStorage.getItem('taskFilter') || 'all';
    setTaskFilter(savedFilter);

    const savedTimeFilter = localStorage.getItem('taskTimeFilter') || 'all';
    setTimeFilter(savedTimeFilter);

    const savedShowRecurring = localStorage.getItem('taskShowRecurring');
    if (savedShowRecurring !== null) {
      setShowRecurring(savedShowRecurring === 'true');
    }

    const handleFilterChange = () => {
      const filter = localStorage.getItem('taskFilter') || 'all';
      setTaskFilter(filter);
    };

    const handleTimeFilterChange = () => {
      const filter = localStorage.getItem('taskTimeFilter') || 'all';
      setTimeFilter(filter);
    };

    const handleShowRecurringChange = () => {
      const show = localStorage.getItem('taskShowRecurring');
      if (show !== null) {
        setShowRecurring(show === 'true');
      }
    };

    window.addEventListener('taskFilterChanged', handleFilterChange);
    window.addEventListener('taskTimeFilterChanged', handleTimeFilterChange);
    window.addEventListener('taskShowRecurringChanged', handleShowRecurringChange);

    return () => {
      window.removeEventListener('taskFilterChanged', handleFilterChange);
      window.removeEventListener('taskTimeFilterChanged', handleTimeFilterChange);
      window.removeEventListener('taskShowRecurringChanged', handleShowRecurringChange);
    };
  }, []);

  const handleFilterChange = (filter) => {
    setTaskFilter(filter);
    localStorage.setItem('taskFilter', filter);
    window.dispatchEvent(new Event('taskFilterChanged'));
  };

  const handleTimeFilterChange = (filter) => {
    setTimeFilter(filter);
    localStorage.setItem('taskTimeFilter', filter);
    window.dispatchEvent(new Event('taskTimeFilterChanged'));
  };

  const handleShowRecurringChange = (show) => {
    setShowRecurring(show);
    localStorage.setItem('taskShowRecurring', String(show));
    window.dispatchEvent(new Event('taskShowRecurringChanged'));
  };

  // Smart sorting: overdue first, then by due date, then by custom priority
  const sortedTasks = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();

    return [...tasks]
      .filter(task => {
        // Toggle recurring tasks
        if (!showRecurring && task.templateId) return false;

        // First, filter by type (All/Academic/Personal)
        if (taskFilter === 'all') return true;
        if (taskFilter === 'academic') return (task.taskType || 'academic') === 'academic';
        if (taskFilter === 'personal') return task.taskType === 'personal';
        return true;
      })
      .filter(task => {
        // Time Filter
        if (timeFilter === 'all') return true;

        const isOverdue = isTaskOverdue(task);
        if (timeFilter === 'today') {
          // Show Overdue + Due Today
          if (isOverdue) return true;
          if (!task.dueDate) return false;
          const today = getToday();
          return task.dueDate === today;
        }

        if (timeFilter === 'week') {
          // Show Overdue + Due within next 7 days
          if (isOverdue) return true;
          if (!task.dueDate) return false;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const sevenDaysFromNow = new Date(today);
          sevenDaysFromNow.setDate(today.getDate() + 7);
          const taskDate = parseLocalDate(task.dueDate); // Normalize to start of day

          // Check if it's today or in the future, but before 7 days from now
          return taskDate >= today && taskDate <= sevenDaysFromNow;
        }

        if (timeFilter === 'month') {
          // Show Overdue + Due within current month
          if (isOverdue) return true;
          if (!task.dueDate) return false;

          const today = new Date();
          const taskDate = parseLocalDate(task.dueDate);

          // Check if same month and year
          return taskDate.getMonth() === today.getMonth() && taskDate.getFullYear() === today.getFullYear();
        }

        if (timeFilter === 'later') {
          // Show Due after this month OR No Due Date (if not overdue)
          if (isOverdue) return false; // Overdue belongs to Today/Week/Month
          if (!task.dueDate) return true; // No date = Later

          const today = new Date();
          const taskDate = parseLocalDate(task.dueDate);

          // Return true if future month or future year
          return taskDate.getMonth() > today.getMonth() || taskDate.getFullYear() > today.getFullYear();
        }

        return true;
      })
      .filter(task => {
        // Second, filter by the search term
        if (!lowerCaseSearch) return true; // Show all if search is empty

        const titleMatch = task.title.toLowerCase().includes(lowerCaseSearch);
        const descMatch = (task.description || '').toLowerCase().includes(lowerCaseSearch);

        return titleMatch || descMatch;
      })
      .sort((a, b) => {
        // 1. Primary Split: Overdue tasks always at the top
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);

        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        // 2. Secondary Sort: Custom Priority (Highest first)
        // This applies to BOTH overdue and non-overdue groups independently.
        // It allows the user to manually reorder tasks within the overdue section
        // and within the main list.
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
          // Same date check
          if (a.dueDate === b.dueDate) {
            // Same day: tasks with times come before tasks without times
            if (a.time && !b.time) return -1;
            if (!a.time && b.time) return 1;

            // Both have times: sort by time (earlier first)
            if (a.time && b.time) {
              const aDateTime = new Date(`${a.dueDate}T${a.time}`);
              const bDateTime = new Date(`${b.dueDate}T${b.time}`);
              return aDateTime - bDateTime;
            }
          }

          // Different dates: sort by date
          return parseLocalDate(a.dueDate) - parseLocalDate(b.dueDate);
        }

        // Creation Date (Newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [tasks, taskFilter, timeFilter, showRecurring, searchTerm]);

  const handleTaskCreate = (newTask) => {
    // Find the right position for the new task based on due date
    let insertIndex = tasks.length;

    if (newTask.dueDate) {
      // Parse date at noon to avoid timezone shift
      const newDueDate = parseLocalDateAtNoon(newTask.dueDate);

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // Skip overdue tasks
        if (isTaskOverdue(task)) continue;

        // If task has no due date or later due date, insert before it
        // Parse existing task date at noon for correct comparison
        if (!task.dueDate || parseLocalDateAtNoon(task.dueDate) > newDueDate) {
          insertIndex = i;
          break;
        }
      }
    }

    // Calculate customPriority based on position
    const newTaskWithPriority = {
      ...newTask,
      customPriority: tasks.length - insertIndex + 1,
    };

    // Insert task at the right position
    const updatedTasks = [...tasks];
    updatedTasks.splice(insertIndex, 0, newTaskWithPriority);

    // Recalculate all priorities to maintain order
    const tasksWithUpdatedPriorities = updatedTasks.map((task, index) => ({
      ...task,
      customPriority: updatedTasks.length - index,
    }));

    setTasks(tasksWithUpdatedPriorities);
  };

  const handleSmartReset = () => {
    // Confirm with user
    if (!window.confirm('Reset task order? This will re-sort all tasks by date and creation time, overriding your manual order.')) {
      return;
    }

    const sortedTasks = [...tasks].sort((a, b) => {
      const aOverdue = isTaskOverdue(a);
      const bOverdue = isTaskOverdue(b);

      // 1. Overdue first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // 2. Sort by Due Date (Earliest first)
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      if (a.dueDate && b.dueDate) {
        if (a.dueDate !== b.dueDate) {
          // Compare YYYY-MM-DD
          return parseLocalDate(a.dueDate) - parseLocalDate(b.dueDate);
        }

        // Same date, check time
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }
        return 0; // Same date and time (or no time)
      }

      // 3. No due date: Newest created first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Re-assign customPriority strictly based on this new order
    const resetTasks = sortedTasks.map((task, index) => ({
      ...task,
      customPriority: sortedTasks.length - index
    }));

    setTasks(resetTasks);
  };

  return (
    <div className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
      {/* Global Backdrop - closes menu when clicking away */}
      {openMenuTaskId && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpenMenuTaskId(null)}
        />
      )}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <CheckSquare className="text-green-glow" size={32} />
            Tasks
          </h2>
          <p className="text-text-secondary">
            Manage your tasks and track your progress
          </p>
        </div>

        <div className="space-y-6">
          {/* Task Form */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <TaskForm onTaskCreate={handleTaskCreate} />
          </div>

          {/* Task List */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Your Tasks</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSmartReset}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/20 text-white/50 hover:bg-zinc-800/40 hover:text-green-glow transition-all border border-transparent"
                  title="Reset tasks to default chronological order"
                >
                  <Sparkles size={14} />
                  Smart Reset
                </button>
                <button
                  onClick={() => handleShowRecurringChange(!showRecurring)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showRecurring
                    ? 'liquid-bubble-filled text-green-glow'
                    : 'bg-zinc-800/20 text-white/50 hover:bg-zinc-800/40 border border-transparent'
                    }`}
                  style={showRecurring ? { boxShadow: '0 0 12px rgba(61, 214, 140, 0.2)' } : {}}
                >
                  <Repeat size={14} />
                  {showRecurring ? 'Recurring On' : 'Recurring Off'}
                </button>
              </div>
            </div>

            {/* Task Filter */}
            <div className="mb-4">
              <label className="block text-sm text-white/70 mb-2">
                Show:
              </label>
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

            {/* Time Filter */}
            <div className="mb-4">
              <label className="block text-sm text-white/70 mb-2">
                Time:
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => handleTimeFilterChange('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${timeFilter === 'all'
                    ? 'liquid-bubble-filled text-green-glow'
                    : 'bg-zinc-800/20 text-white/50 hover:bg-zinc-800/40 border border-transparent'
                    }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => handleTimeFilterChange('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${timeFilter === 'today'
                    ? 'liquid-bubble-filled text-green-glow'
                    : 'bg-zinc-800/20 text-white/50 hover:bg-zinc-800/40 border border-transparent'
                    }`}
                >
                  Focus (Today)
                </button>
                <button
                  onClick={() => handleTimeFilterChange('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${timeFilter === 'week'
                    ? 'liquid-bubble-filled text-green-glow'
                    : 'bg-zinc-800/20 text-white/50 hover:bg-zinc-800/40 border border-transparent'
                    }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => handleTimeFilterChange('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${timeFilter === 'month'
                    ? 'liquid-bubble-filled text-green-glow'
                    : 'bg-zinc-800/20 text-white/50 hover:bg-zinc-800/40 border border-transparent'
                    }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => handleTimeFilterChange('later')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${timeFilter === 'later'
                    ? 'liquid-bubble-filled text-green-glow'
                    : 'bg-zinc-800/20 text-white/50 hover:bg-zinc-800/40 border border-transparent'
                    }`}
                >
                  Later
                </button>
              </div>
            </div>

            {/* Task Search */}
            <div className="mb-4">
              <label className="block text-sm text-white/70 mb-2">
                Search Tasks
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title or description..."
                  className="w-full liquid-bubble-filled rounded-lg px-4 py-2 pl-10 text-white placeholder-white/30 focus:border-green-glow/50 focus:outline-none transition-colors"
                />
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
              </div>
            </div>

            <TaskList
              tasks={sortedTasks}
              setTasks={setTasks}
              openMenuTaskId={openMenuTaskId}
              setOpenMenuTaskId={setOpenMenuTaskId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksTab;
