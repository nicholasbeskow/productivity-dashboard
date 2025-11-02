import { CheckSquare, Plus } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import TaskList from './TaskList';
import TaskForm from './TaskForm';
import backupManager from '../../utils/backupManager';
import { formatTaskDateHeader } from '../../utils/formatTaskDate';

const TasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('all');
  const [isInitialized, setIsInitialized] = useState(false);
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);
  const [openFormGroup, setOpenFormGroup] = useState(null);

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

  const handleTaskCreate = (newTask) => {
    // Find the highest priority of all tasks
    const maxPriority = tasks.reduce((max, task) => Math.max(max, (task.customPriority || 0)), 0);

    const taskWithPriority = {
      ...newTask,
      customPriority: maxPriority + 1, // Make it the highest priority
    };

    setTasks(prevTasks => [taskWithPriority, ...prevTasks]);

    // We do NOT close the form here, allowing for multiple task adds.
    // The form's internal state is cleared by its own handleSubmit.
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const endGroupKey = destination.droppableId;
    const destGroupTasks = groupedTasks[endGroupKey] || [];

    // Calculate new customPriority
    let newPriority;
    if (destination.index === 0) {
      // Dropped at the top
      const topTask = destGroupTasks[0];
      newPriority = (topTask?.customPriority || 0) + 1;
    } else if (destination.index === destGroupTasks.length) {
      // Dropped at the bottom
      const bottomTask = destGroupTasks[destGroupTasks.length - 1];
      newPriority = (bottomTask?.customPriority || 1) - 1;
    } else {
      // Dropped in the middle
      const taskAfter = destGroupTasks[destination.index - 1];
      const taskBefore = destGroupTasks[destination.index];
      newPriority = ((taskAfter?.customPriority || 0) + (taskBefore?.customPriority || 0)) / 2;
    }

    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === draggableId) {
          return {
            ...task,
            dueDate: (endGroupKey === 'Inbox' || endGroupKey === 'Overdue') ? null : endGroupKey,
            customPriority: newPriority,
          };
        }
        return task;
      })
    );
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
    }, { 'Inbox': [] });

    // 2. Sort tasks *within* each group (this matches Dashboard logic)
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].sort((a, b) => {
        const aHasPriority = (a.customPriority ?? 0) > 0;
        const bHasPriority = (b.customPriority ?? 0) > 0;

        // If either has custom priority, sort by that
        if (aHasPriority || bHasPriority) {
          return (b.customPriority ?? 0) - (a.customPriority ?? 0);
        }

        // If no custom priority, sort by time (if date is the same)
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }

        // Fallback to creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
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

          {/* Task List Section */}
          <DragDropContext onDragEnd={handleDragEnd}>
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
                    // Use our new, corrected utility!
                    headerText = formatTaskDateHeader(groupKey);
                  }

                  const isDropDisabled = groupKey === 'Overdue';

                  return (
                    <Droppable droppableId={groupKey} key={groupKey} isDropDisabled={isDropDisabled}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`rounded-lg ${snapshot.isDraggingOver ? 'bg-bg-tertiary/70' : 'bg-transparent'} transition-colors duration-200 ease-in-out`}
                        >
                          {/* Header with Add Button */}
                          <div className="flex items-center justify-between mb-3 px-2 pt-2">
                            <h3 className={`text-xl font-semibold ${headerColor}`}>{headerText}</h3>
                            {openFormGroup !== groupKey && (
                              <button
                                onClick={() => setOpenFormGroup(groupKey)}
                                className="p-1 text-text-tertiary hover:text-green-glow hover:bg-green-glow/10 rounded-lg transition-all"
                                title="Add task to this group"
                              >
                                <Plus size={20} />
                              </button>
                            )}
                          </div>
                          {/* Inline Form */}
                          {openFormGroup === groupKey && (
                            <div className="mb-4 px-2">
                              <TaskForm
                                defaultDate={groupKey === 'Inbox' || groupKey === 'Overdue' ? null : groupKey}
                                onTaskCreate={handleTaskCreate}
                                onCancel={() => setOpenFormGroup(null)}
                              />
                            </div>
                          )}
                          {/* Task List */}
                          <TaskList
                            tasks={tasksInGroup}
                            setTasks={setTasks}
                            openMenuTaskId={openMenuTaskId}
                            setOpenMenuTaskId={setOpenMenuTaskId}
                            droppableProvided={provided}
                          />
                        </div>
                      )}
                    </Droppable>
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
          </DragDropContext>
        </div>
      </div>
    </div>
  );
};

export default TasksTab;
