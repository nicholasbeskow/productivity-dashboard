import { CheckSquare } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import TaskForm from './TaskForm';
import TaskList from './TaskList';

const TasksTab = () => {
  const [tasks, setTasks] = useState([]);
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
    }
  }, [tasks, isInitialized]);

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
    return [...tasks].sort((a, b) => {
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
  }, [tasks]);

  const handleTaskCreate = (newTask) => {
    // Find the right position for the new task based on due date
    let insertIndex = tasks.length;

    if (newTask.dueDate) {
      const newDueDate = new Date(newTask.dueDate);

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // Skip overdue tasks
        if (isOverdue(task)) continue;

        // If task has no due date or later due date, insert before it
        if (!task.dueDate || new Date(task.dueDate) > newDueDate) {
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
            <TaskList tasks={sortedTasks} setTasks={setTasks} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksTab;
