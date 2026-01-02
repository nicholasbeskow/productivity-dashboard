import { CheckSquare, Search } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import backupManager from '../../utils/backupManager';

const TasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('all');
  const [isInitialized, setIsInitialized] = useState(false);
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load tasks from localStorage on mount
  useEffect(() => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        // Ensure all tasks have customPriority
        const tasksWithPriority = parsedTasks.map((task, index) => ({
          ...task,
          customPriority: task.customPriority ?? (parsedTasks.length - index),
        }));
        setTasks(tasksWithPriority);
      } catch (error) {
        console.error('Error loading tasks from localStorage:', error);
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

  // Load task filter from localStorage and listen for changes
  useEffect(() => {
    const savedFilter = localStorage.getItem('taskFilter') || 'all';
    setTaskFilter(savedFilter);

    const handleFilterChange = () => {
      const filter = localStorage.getItem('taskFilter') || 'all';
      setTaskFilter(filter);
    };

    window.addEventListener('taskFilterChanged', handleFilterChange);

    return () => {
      window.removeEventListener('taskFilterChanged', handleFilterChange);
    };
  }, []);

  const handleFilterChange = (filter) => {
    setTaskFilter(filter);
    localStorage.setItem('taskFilter', filter);
    window.dispatchEvent(new Event('taskFilterChanged'));
  };

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

  // Smart sorting: overdue first, then by due date, then by custom priority
  const sortedTasks = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();

    return [...tasks]
      .filter(task => {
        // First, filter by type (All/Academic/Personal)
        if (taskFilter === 'all') return true;
        if (taskFilter === 'academic') return (task.taskType || 'academic') === 'academic';
        if (taskFilter === 'personal') return task.taskType === 'personal';
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
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);

      // Overdue tasks first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Both overdue: sort by most overdue first
      if (aOverdue && bOverdue) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }

      // If one has custom priority and the other doesn't, prioritize the one with custom priority
      const aHasPriority = (a.customPriority ?? 0) > 0;
      const bHasPriority = (b.customPriority ?? 0) > 0;

      if (aHasPriority && !bHasPriority) return -1;
      if (!aHasPriority && bHasPriority) return 1;

      // Both have custom priority: sort by priority
      if (aHasPriority && bHasPriority) {
        return (b.customPriority ?? 0) - (a.customPriority ?? 0);
      }

      // Neither has custom priority: sort by due date (and time if present)
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
        return new Date(a.dueDate) - new Date(b.dueDate);
      }

      // Both have no due date: sort by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [tasks, taskFilter, searchTerm]);

  const handleTaskCreate = (newTask) => {
    // Find the right position for the new task based on due date
    let insertIndex = tasks.length;

    if (newTask.dueDate) {
      // Parse date at noon to avoid timezone shift
      const newDueDate = new Date(newTask.dueDate + 'T12:00:00');

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // Skip overdue tasks
        if (isOverdue(task)) continue;

        // If task has no due date or later due date, insert before it
        // Parse existing task date at noon for correct comparison
        if (!task.dueDate || new Date(task.dueDate + 'T12:00:00') > newDueDate) {
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

  return (
    <div className="h-full p-8 overflow-y-auto">
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
            <h3 className="text-lg font-semibold text-white mb-4">Your Tasks</h3>

            {/* Task Filter */}
            <div className="mb-4">
              <label className="block text-sm text-white/70 mb-2">
                Show:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    taskFilter === 'all'
                      ? 'liquid-bubble-filled text-green-glow'
                      : 'bg-zinc-800/20 text-white/60 hover:bg-zinc-800/40 border border-transparent'
                  }`}
                  style={taskFilter === 'all' ? { boxShadow: '0 0 12px rgba(61, 214, 140, 0.2)' } : {}}
                >
                  All
                </button>
                <button
                  onClick={() => handleFilterChange('academic')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    taskFilter === 'academic'
                      ? 'liquid-bubble-filled text-green-glow'
                      : 'bg-zinc-800/20 text-white/60 hover:bg-zinc-800/40 border border-transparent'
                  }`}
                  style={taskFilter === 'academic' ? { boxShadow: '0 0 12px rgba(61, 214, 140, 0.2)' } : {}}
                >
                  Academic
                </button>
                <button
                  onClick={() => handleFilterChange('personal')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    taskFilter === 'personal'
                      ? 'liquid-bubble-filled text-green-glow'
                      : 'bg-zinc-800/20 text-white/60 hover:bg-zinc-800/40 border border-transparent'
                  }`}
                  style={taskFilter === 'personal' ? { boxShadow: '0 0 12px rgba(61, 214, 140, 0.2)' } : {}}
                >
                  Personal
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
