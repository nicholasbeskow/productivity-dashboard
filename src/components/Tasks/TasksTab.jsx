import { CheckSquare } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import TaskList from './TaskList';
import backupManager from '../../utils/backupManager';
import { formatTaskDateHeader } from '../../utils/formatTaskDate';

const TasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('all');
  const [isInitialized, setIsInitialized] = useState(false);
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);

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

  // NEW: Data Grouping Logic
  const { groupedTasks, sortedGroupKeys } = useMemo(() => {
    const filteredTasks = tasks.filter(task => {
      if (taskFilter === 'all') return true;
      if (taskFilter === 'academic') return (task.taskType || 'academic') === 'academic';
      if (taskFilter === 'personal') return task.taskType === 'personal';
      return true;
    });

    // 1. Group tasks into an object
    const groups = filteredTasks.reduce((acc, task) => {
      let groupKey;

      // Group 1: Overdue
      if (isOverdue(task) && task.status !== 'complete') {
        groupKey = 'Overdue';
      }
      // Group 2: No Date
      else if (!task.dueDate) {
        groupKey = 'Inbox';
      }
      // Group 3: Dated Tasks (use the date string as the key)
      else {
        groupKey = task.dueDate;
      }

      (acc[groupKey] = acc[groupKey] || []).push(task);
      return acc;
    }, {});

    // 2. Sort tasks *within* each group by customPriority
    Object.keys(groups).forEach(dateKey => {
      groups[dateKey].sort((a, b) => (b.customPriority ?? 0) - (a.customPriority ?? 0));
    });

    // 3. Sort the group keys themselves
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      // Overdue always first
      if (a === 'Overdue') return -1;
      if (b === 'Overdue') return 1;

      // Inbox always second
      if (a === 'Inbox') return -1;
      if (b === 'Inbox') return 1;

      // All other keys are dates, sort them chronologically
      return new Date(a) - new Date(b);
    });

    return { groupedTasks: groups, sortedGroupKeys: sortedKeys };
  }, [tasks, taskFilter]);

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
          {/* Task List */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Your Tasks</h3>

            {/* Task Filter */}
            <div className="mb-4">
              <label className="block text-sm text-text-secondary mb-2">
                Show:
              </label>
              <div className="flex gap-2">
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
              </div>
            </div>

            {/* NEW: Loop over sorted groups and render each one as a section */}
            <div className="space-y-8">
              {sortedGroupKeys.length > 0 ? (
                sortedGroupKeys.map(groupKey => {
                  const tasksInGroup = groupedTasks[groupKey];
                  let headerText;
                  let headerColor = 'text-text-primary';

                  if (groupKey === 'Overdue') {
                    headerText = 'Overdue';
                    headerColor = 'text-red-500';
                  } else if (groupKey === 'Inbox') {
                    headerText = 'Inbox';
                    headerColor = 'text-text-secondary';
                  } else {
                    headerText = formatTaskDateHeader(groupKey);
                  }

                  return (
                    <div key={groupKey}>
                      {/* Group Header */}
                      <h3 className={`text-lg font-semibold mb-3 ${headerColor}`}>
                        {headerText}
                      </h3>

                      {/* Render the task list for this group */}
                      <TaskList
                        tasks={tasksInGroup}
                        setTasks={setTasks}
                        openMenuTaskId={openMenuTaskId}
                        setOpenMenuTaskId={setOpenMenuTaskId}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="bg-bg-secondary rounded-xl p-8 border border-bg-tertiary text-center">
                  <p className="text-text-secondary">
                    No tasks found for this filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksTab;
