import { CheckSquare, Sparkles } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import backupManager from '../../utils/backupManager';

const TasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('all');
  const [isInitialized, setIsInitialized] = useState(false);

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

  // NEW: Smart Sort handler function
  const handleSmartSort = () => {
    // Confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to run Smart Sort?\n\nThis will reset all manual drag-and-drop ordering for your tasks.'
    );
    if (!confirmed) return;

    // Get the full list of tasks from state
    const fullTasks = [...tasks];

    // --- Sorting Logic (copied from Dashboard.jsx) ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getPriority = (task) => {
      if (!task.dueDate) return 1000; // No due date
      const dueDate = new Date(task.dueDate + 'T12:00:00');
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) { // Today
        return task.time ? 10 : 20; // 10 for time, 20 for no time
      } else if (diffDays > 0) { // Future
        return 50 + diffDays;
      } else { // Overdue (should be handled by isOverdue)
        return 1000;
      }
    };

    const sortedTasks = fullTasks.sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);

      // 1. Overdue tasks
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (aOverdue && bOverdue) {
        return new Date(a.dueDate) - new Date(b.dueDate); // Oldest overdue first
      }

      // 2. Smart Sort fallback (no custom priority)
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 3. Same priority level (e.g., both "Today w/ Time")
      if (a.time && b.time) {
        return a.time.localeCompare(b.time); // Earliest time first
      }

      // 4. Final fallback: creation date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    // --- End of Sorting Logic ---

    // Now, re-map the sorted tasks and assign a new customPriority
    // This bakes the new order in
    const tasksWithNewPriority = sortedTasks.map((task, index) => ({
      ...task,
      customPriority: sortedTasks.length - index, // Highest priority has highest number
    }));

    // Save the new list to state, which will trigger localStorage save
    setTasks(tasksWithNewPriority);

    console.log('[TasksTab] Smart Sort complete. All task priorities have been reset.');
  };

  // Smart sorting: overdue first, then by due date, then by custom priority
  const sortedTasks = useMemo(() => {
    return [...tasks]
      .filter(task => {
        if (taskFilter === 'all') return true;
        if (taskFilter === 'academic') return (task.taskType || 'academic') === 'academic';
        if (taskFilter === 'personal') return task.taskType === 'personal';
        return true;
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
  }, [tasks, taskFilter]);

  const handleTaskCreate = (newTaskFromForm) => {
    // 1. Create the full task object
    const newTask = {
      ...newTaskFromForm,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'not-started',
      createdAt: new Date().toISOString(),
      completedAt: null,
      customPriority: 0, // Will be set in a moment
    };

    // 2. Add the new task to the *end* of the current task list
    const currentTasks = [...tasks, newTask];

    // 3. Get the "Smart Sort" logic (same as handleSmartSort)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getPriority = (task) => {
      if (!task.dueDate) return 1000; // No due date
      const dueDate = new Date(task.dueDate + 'T12:00:00');
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) { // Today
        return task.time ? 10 : 20; // 10 for time, 20 for no time
      } else if (diffDays > 0) { // Future
        return 50 + diffDays;
      } else { // Overdue (should be handled by isOverdue)
        return 1000;
      }
    };

    // 4. Run the full Smart Sort on the *entire* list (including the new task)
    const sortedTasks = currentTasks.sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);

      // 1. Overdue tasks
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (aOverdue && bOverdue) {
        return new Date(a.dueDate) - new Date(b.dueDate); // Oldest overdue first
      }

      // 2. Smart Sort fallback
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 3. Same priority level (e.g., both "Today w/ Time")
      if (a.time && b.time) {
        return a.time.localeCompare(b.time); // Earliest time first
      }

      // 4. Final fallback: creation date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // 5. Re-map the sorted tasks and assign a new customPriority to *everything*
    const tasksWithNewPriority = sortedTasks.map((task, index) => ({
      ...task,
      customPriority: sortedTasks.length - index, // Highest priority has highest number
    }));

    // 6. Save the new, perfectly sorted list to state
    setTasks(tasksWithNewPriority);

    console.log('[TasksTab] New task created and Smart Sort applied.');
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
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
          <TaskForm onTaskCreate={handleTaskCreate} />

          {/* Task List */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Your Tasks</h3>

            {/* Task Filter */}
            <div className="mb-4">
              <label className="block text-sm text-text-secondary mb-2">
                Show:
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    taskFilter === 'all'
                      ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                      : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleFilterChange('academic')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    taskFilter === 'academic'
                      ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                      : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                  }`}
                >
                  Academic
                </button>
                <button
                  onClick={() => handleFilterChange('personal')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    taskFilter === 'personal'
                      ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                      : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                  }`}
                >
                  Personal
                </button>

                {/* Smart Sort Button */}
                <button
                  onClick={handleSmartSort}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                             text-text-secondary hover:bg-bg-tertiary border border-bg-primary
                             hover:text-green-glow hover:border-green-glow/50"
                  title="Sort all tasks by due date and reset manual order"
                >
                  <Sparkles size={16} />
                  Smart Sort
                </button>
              </div>
            </div>

            <TaskList tasks={sortedTasks} setTasks={setTasks} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksTab;
